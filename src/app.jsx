// src/app_new.jsx - 新佈局版本（簡潔版）
import React, { useEffect, useState, useMemo } from "react";
import cockpit from "cockpit";

// ==================== 設計系統常數 ====================

const DESIGN = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12
  },
  colors: {
    danger: "#ef4444",
    warning: "#f59e0b",
    success: "#10b981",
    info: "#60a5fa",
    text: {
      primary: "#fff",
      secondary: "rgba(255,255,255,0.7)",
      muted: "rgba(255,255,255,0.5)"
    },
    bg: {
      card: "rgba(0,0,0,0.2)",
      cardHover: "rgba(0,0,0,0.3)",
      border: "rgba(255,255,255,0.12)"
    }
  },
  shadows: {
    sm: "0 1px 2px rgba(0,0,0,0.3)",
    md: "0 2px 4px rgba(0,0,0,0.4)",
    lg: "0 4px 8px rgba(0,0,0,0.5)"
  },
  typography: {
    h1: { fontSize: "1.8rem", fontWeight: "600" },
    h2: { fontSize: "1.1rem", fontWeight: "600" },
    h3: { fontSize: "0.95rem", fontWeight: "500" },
    h4: { fontSize: "0.9rem", fontWeight: "500" },
    body: { fontSize: "0.9rem" },
    small: { fontSize: "0.85rem" },
    tiny: { fontSize: "0.8rem" }
  }
};

// ==================== Journalctl 命令 ====================

const SSH_FAILED_CMD = [
  "bash",
  "-lc",
  "journalctl -u ssh -u sshd --since '24 hours ago' --no-pager | egrep -E 'Failed password|Invalid user' || true"
];

const SSH_ACCEPTED_CMD = [
  "bash",
  "-lc",
  "journalctl -u ssh -u sshd --since '24 hours ago' --no-pager | grep 'Accepted password' || true"
];

const SUDO_AUTH_FAILED_CMD = [
  "bash",
  "-lc",
  "journalctl -t sudo --since '24 hours ago' --no-pager | grep 'authentication failure' || true"
];

const SUDO_COMMANDS_CMD = [
  "bash",
  "-lc",
  "journalctl -t sudo --since '24 hours ago' --no-pager | grep 'COMMAND=' || true"
];

// ==================== 解析函式 ====================

function parseSSHFailedLine(line) {
  const timestampMatch = line.match(/^(\w+\s+\d+\s+\d+:\d+:\d+)/);
  let userMatch = line.match(/Failed password for\s+(\S+)/);
  let ipMatch = line.match(/from\s+([0-9a-fA-F:\.]+)/);
  let portMatch = line.match(/port\s+(\d+)/);
  
  if (!userMatch && /Invalid user/.test(line)) {
    const invalidUserMatch = line.match(/Invalid user\s+(\S+)/);
    userMatch = invalidUserMatch ? [invalidUserMatch[0], `invalid:${invalidUserMatch[1]}`] : null;
    ipMatch = ipMatch || line.match(/from\s+([0-9a-fA-F:\.]+)/);
    portMatch = portMatch || line.match(/port\s+(\d+)/);
  }

  if (!timestampMatch) return null;

  return {
    timestamp: timestampMatch[1],
    user: userMatch ? userMatch[1] : "unknown",
    ip: ipMatch ? ipMatch[1] : "unknown",
    port: portMatch ? portMatch[1] : "N/A",
    type: "failed",
    raw: line
  };
}

function parseSSHAcceptedLine(line) {
  const timestampMatch = line.match(/^(\w+\s+\d+\s+\d+:\d+:\d+)/);
  const userMatch = line.match(/Accepted password for\s+(\S+)/);
  const ipMatch = line.match(/from\s+([0-9a-fA-F:\.]+)/);
  const portMatch = line.match(/port\s+(\d+)/);

  if (!timestampMatch) return null;

  return {
    timestamp: timestampMatch[1],
    user: userMatch ? userMatch[1] : "unknown",
    ip: ipMatch ? ipMatch[1] : "unknown",
    port: portMatch ? portMatch[1] : "N/A",
    type: "accepted",
    raw: line
  };
}

function parseSudoAuthFailedLine(line) {
  // 範例：Nov 13 12:34:56 vm01 sudo: pam_unix(sudo:auth): authentication failure; logname=classuser uid=1000 euid=0 tty=/dev/pts/0 ruser=classuser rhost=  user=classuser
  const timestampMatch = line.match(/^(\w+\s+\d+\s+\d+:\d+:\d+)/);
  const userMatch = line.match(/user=(\S+)/);
  const rhostMatch = line.match(/rhost=(\S+)/);
  const ttyMatch = line.match(/tty=(\S+)/);
  const lognameMatch = line.match(/logname=(\S+)/);

  if (!timestampMatch) return null;

  return {
    timestamp: timestampMatch[1],
    user: userMatch ? userMatch[1] : "unknown",
    rhost: rhostMatch && rhostMatch[1] && rhostMatch[1].trim() ? rhostMatch[1] : "local",
    tty: ttyMatch ? ttyMatch[1] : "N/A",
    logname: lognameMatch ? lognameMatch[1] : "N/A",
    type: "auth_failed",
    raw: line
  };
}

function parseSudoCommandLine(line) {
  const timestampMatch = line.match(/^(\w+\s+\d+\s+\d+:\d+:\d+)/);
  const userMatch = line.match(/sudo.*?:\s*(\S+)\s*:/);
  const commandMatch = line.match(/COMMAND=(.+?)(?:\s*$)/);

  if (!timestampMatch) return null;

  return {
    timestamp: timestampMatch[1],
    user: userMatch ? userMatch[1] : "unknown",
    command: commandMatch ? commandMatch[1] : "N/A",
    type: "command",
    raw: line
  };
}

// ==================== 聚合與分析函式 ====================

function aggregateByIP(parsedLines) {
  const map = new Map();

  for (const entry of parsedLines) {
    if (!entry || !entry.ip) continue;
    
    const current = map.get(entry.ip) || {
      ip: entry.ip,
      count: 0,
      users: new Set(),
      ports: new Set(),
      timestamps: [],
      firstSeen: entry.timestamp,
      lastSeen: entry.timestamp
    };

    current.count += 1;
    current.users.add(entry.user);
    if (entry.port && entry.port !== "N/A") {
      current.ports.add(entry.port);
    }
    current.timestamps.push(entry.timestamp);
    current.lastSeen = entry.timestamp;

    map.set(entry.ip, current);
  }

  const list = [];
  for (const v of map.values()) {
    const isBruteForce = v.count >= 5;
    list.push({
      ip: v.ip,
      count: v.count,
      users: Array.from(v.users),
      ports: Array.from(v.ports),
      firstSeen: v.firstSeen,
      lastSeen: v.lastSeen,
      isBruteForce
    });
  }

  return list.sort((a, b) => b.count - a.count);
}

function getHourlyStats(parsedLines) {
  const hourMap = new Map();
  
  for (const entry of parsedLines) {
    if (!entry || !entry.timestamp) continue;
    
    const hourMatch = entry.timestamp.match(/(\d+):(\d+):(\d+)/);
    if (hourMatch) {
      const hour = parseInt(hourMatch[1]);
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    }
  }

  const currentHour = new Date().getHours();
  const result = [];
  
  for (let i = 0; i < 24; i++) {
    const hour = (currentHour - 23 + i + 24) % 24;
    result.push({
      label: `${hour.toString().padStart(2, '0')}:00`,
      value: hourMap.get(hour) || 0
    });
  }
  
  return result;
}

// ==================== 風險評估函式 ====================

function calculateRiskLevel(sshFailedCount, sudoFailedCount, uniqueIPs) {
  const totalFailures = sshFailedCount + sudoFailedCount * 2;
  
  if (totalFailures >= 20 || uniqueIPs >= 5) {
    return "danger";
  } else if (totalFailures >= 5 || uniqueIPs >= 2) {
    return "warning";
  }
  return "normal";
}

function getRiskConfig(level) {
  const configs = {
    danger: {
      icon: "🚨",
      label: "高風險警告",
      description: "建議立即檢查",
      color: "#ef4444",
      bgColor: "rgba(239, 68, 68, 0.1)"
    },
    warning: {
      icon: "⚠️",
      label: "可疑活動",
      description: "建議檢查",
      color: "#f59e0b",
      bgColor: "rgba(245, 158, 11, 0.1)"
    },
    normal: {
      icon: "🟢",
      label: "正常狀態",
      description: "系統安全",
      color: "#10b981",
      bgColor: "rgba(16, 185, 129, 0.1)"
    }
  };
  return configs[level] || configs.normal;
}

// ==================== GeoIP 查詢 ====================

async function fetchGeoIP(ip) {
  try {
    if (typeof window !== "undefined" && window.location.protocol !== "file:") {
      return "Unknown";
    }

    if (ip === "unknown" || ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("127.")) {
      return "本地";
    }

    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode`);
    const data = await response.json();
    
    if (data.status === "success") {
      return `${data.country} (${data.countryCode})`;
    }
    return "Unknown";
  } catch (error) {
    console.warn("GeoIP lookup failed for", ip, error);
    return "Unknown";
  }
}

// ==================== UI 組件 ====================

// 模組容器
function ModuleContainer({ title, description, children }) {
  return (
    <div style={{ marginBottom: DESIGN.spacing.xxl }}>
      {title && (
        <div style={{ 
          marginBottom: DESIGN.spacing.md,
          paddingBottom: DESIGN.spacing.md,
          borderBottom: `1px solid ${DESIGN.colors.bg.border}`
        }}>
          <h2 style={{ 
            ...DESIGN.typography.h2, 
            margin: `0 0 ${DESIGN.spacing.xs}px 0`,
            color: DESIGN.colors.text.primary
          }}>
            {title}
          </h2>
          {description && (
            <p style={{ 
              ...DESIGN.typography.small, 
              margin: 0,
              color: DESIGN.colors.text.secondary
            }}>
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

// 風險摘要卡片
function RiskSummaryCard({ sshFailedCount, sudoFailedCount, uniqueIPs }) {
  const riskLevel = calculateRiskLevel(sshFailedCount, sudoFailedCount, uniqueIPs);
  const config = getRiskConfig(riskLevel);

  return (
    <div
      style={{
        borderRadius: DESIGN.borderRadius.md,
        border: `1px solid ${config.color}`,
        padding: DESIGN.spacing.lg,
        marginBottom: DESIGN.spacing.xl,
        background: DESIGN.colors.bg.card,
        boxShadow: DESIGN.shadows.sm
      }}
    >
      {/* 標題 */}
      <div style={{ 
        ...DESIGN.typography.h3, 
        color: DESIGN.colors.text.primary,
        marginBottom: DESIGN.spacing.md
      }}>
        目前風險狀態
      </div>
      
      {/* 風險狀態指示器 */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: DESIGN.spacing.sm,
        marginBottom: DESIGN.spacing.md
      }}>
        <span style={{ fontSize: "1.2rem" }}>{config.icon}</span>
        <span style={{ 
          ...DESIGN.typography.h3, 
          color: config.color,
          fontWeight: "600"
        }}>
          {config.label}
        </span>
        <span style={{ 
          ...DESIGN.typography.small, 
          color: DESIGN.colors.text.secondary
        }}>
          ({config.description})
        </span>
      </div>
      
      {/* 詳細統計 */}
      <div style={{ 
        ...DESIGN.typography.body, 
        color: DESIGN.colors.text.secondary,
        display: "flex",
        flexWrap: "wrap",
        gap: DESIGN.spacing.md
      }}>
        <span>SSH失敗:{sshFailedCount}次</span>
        <span>sudo 驗證失敗:{sudoFailedCount}次</span>
        <span>來源IP數量:{uniqueIPs}</span>
      </div>
    </div>
  );
}

// 統計卡片
function StatCard({ title, items }) {
  return (
    <div
      style={{
        borderRadius: DESIGN.borderRadius.md,
        border: `1px solid ${DESIGN.colors.bg.border}`,
        padding: DESIGN.spacing.lg,
        background: DESIGN.colors.bg.card,
        boxShadow: DESIGN.shadows.sm
      }}
    >
      <h3 style={{ 
        ...DESIGN.typography.h3, 
        margin: `0 0 ${DESIGN.spacing.md}px 0`,
        color: DESIGN.colors.text.primary
      }}>
        {title}
      </h3>
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: `repeat(${items.length}, 1fr)`, 
        gap: DESIGN.spacing.md 
      }}>
        {items.map((item, idx) => (
          <div key={idx} style={{ textAlign: "center" }}>
            <div style={{ 
              ...DESIGN.typography.tiny, 
              color: DESIGN.colors.text.secondary, 
              marginBottom: DESIGN.spacing.xs,
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}>
              {item.label}
            </div>
            <div style={{ 
              fontSize: "1.6rem", 
              fontWeight: "700", 
              color: DESIGN.colors.text.primary,
              lineHeight: 1.2,
              textShadow: `0 2px 4px rgba(0,0,0,0.3)`
            }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 折線圖
function LineChart({ data, title }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ 
        padding: DESIGN.spacing.xl, 
        textAlign: "center", 
        color: DESIGN.colors.text.muted 
      }}>
        目前沒有資料
      </div>
    );
  }
  
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const width = 400; // 使用固定寬度，SVG viewBox 會自動縮放
  const leftPadding = 18; // 為 Y 軸標籤留空間
  const rightPadding = 3;
  const topPadding = 10;
  const bottomPadding = 8; // 移除 X 軸標籤後減少底部空間
  const chartWidth = width - leftPadding - rightPadding;
  const chartHeight = 100 - topPadding - bottomPadding;
  const svgHeight = 100; // 移除 X 軸標籤後減少高度
  
  const points = data.map((item, idx) => {
    const x = leftPadding + (idx / Math.max(data.length - 1, 1)) * chartWidth;
    const y = topPadding + chartHeight - (item.value / maxValue) * chartHeight;
    return `${x},${y}`;
  }).join(" ");
  
  // Y 軸刻度值 - 生成更合理的刻度
  const generateYTicks = (max) => {
    if (max <= 3) {
      return Array.from({ length: max + 1 }, (_, i) => i);
    } else if (max <= 10) {
      const step = Math.ceil(max / 4);
      return Array.from({ length: Math.floor(max / step) + 2 }, (_, i) => i * step).filter(v => v <= max);
    } else {
      const step = Math.ceil(max / 5);
      return Array.from({ length: 6 }, (_, i) => i * step).filter(v => v <= max);
    }
  };
  const yAxisTicks = generateYTicks(maxValue);
  
  return (
    <div style={{ width: "100%" }}>
      <h4 style={{ 
        ...DESIGN.typography.h4, 
        margin: `0 0 ${DESIGN.spacing.md}px 0`,
        color: DESIGN.colors.text.primary
      }}>
        {title}
      </h4>
      <div style={{ 
        background: "rgba(0,0,0,0.2)", 
        borderRadius: DESIGN.borderRadius.sm,
        padding: `${DESIGN.spacing.sm}px ${DESIGN.spacing.xs}px`,
        width: "100%",
        boxSizing: "border-box",
        overflow: "hidden"
      }}>
        <svg viewBox={`0 0 ${width} ${svgHeight}`} style={{ width: "100%", height: "100px", display: "block", margin: 0, padding: 0 }}>
          {/* Y 軸標籤（次數） */}
          {yAxisTicks.map((tick, i) => {
            const y = topPadding + chartHeight - (tick / maxValue) * chartHeight;
            return (
              <g key={i}>
                {/* Y 軸刻度線 */}
                <line
                  x1={leftPadding - 2}
                  y1={y}
                  x2={leftPadding}
                  y2={y}
                  stroke={DESIGN.colors.text.secondary}
                  strokeWidth="0.5"
                  opacity="0.5"
                />
                {/* Y 軸標籤文字 */}
                <text
                  x={leftPadding - 5}
                  y={y + 4}
                  textAnchor="end"
                  fill={DESIGN.colors.text.primary}
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="600"
                >
                  {tick}
                </text>
              </g>
            );
          })}
          
          {/* Y 軸線 */}
          <line
            x1={leftPadding}
            y1={topPadding}
            x2={leftPadding}
            y2={topPadding + chartHeight}
            stroke={DESIGN.colors.text.secondary}
            strokeWidth="1"
            opacity="0.6"
          />
          
          {/* 網格線 */}
          {[0, 0.5, 1].map((ratio, i) => {
            const y = topPadding + chartHeight - ratio * chartHeight;
            return (
              <line
                key={i}
                x1={leftPadding}
                y1={y}
                x2={leftPadding + chartWidth}
                y2={y}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="0.5"
              />
            );
          })}
          
          {/* 折線 */}
          <polyline
            points={points}
            fill="none"
            stroke={DESIGN.colors.info}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* 數據點 */}
          {data.map((item, idx) => {
            const x = leftPadding + (idx / Math.max(data.length - 1, 1)) * chartWidth;
            const y = topPadding + chartHeight - (item.value / maxValue) * chartHeight;
            return (
              <g key={idx}>
                <circle 
                  cx={x} 
                  cy={y} 
                  r="2.5" 
                  fill={DESIGN.colors.info}
                  stroke="#fff"
                  strokeWidth="1"
                  style={{ opacity: item.value > 0 ? 1 : 0 }}
                />
              </g>
            );
          })}
          
          {/* X 軸線 */}
          <line
            x1={leftPadding}
            y1={topPadding + chartHeight}
            x2={leftPadding + chartWidth}
            y2={topPadding + chartHeight}
            stroke={DESIGN.colors.text.secondary}
            strokeWidth="1"
            opacity="0.6"
          />
          
          {/* X 軸標籤（時間）- 已移除 */}
        </svg>
      </div>
    </div>
  );
}

// 長條圖
function BarChart({ data, title, color = DESIGN.colors.danger }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ 
        padding: DESIGN.spacing.xl, 
        textAlign: "center", 
        color: DESIGN.colors.text.muted 
      }}>
        目前沒有資料
      </div>
    );
  }
  
  const maxValue = Math.max(...data.map(d => d.value), 1);
  
  return (
    <div>
      <h4 style={{ 
        ...DESIGN.typography.h4, 
        margin: `0 0 ${DESIGN.spacing.md}px 0`,
        color: DESIGN.colors.text.primary
      }}>
        {title}
      </h4>
      <div style={{ display: "flex", flexDirection: "column", gap: DESIGN.spacing.md }}>
        {data.map((item, idx) => (
          <div 
            key={idx} 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: DESIGN.spacing.md 
            }}
          >
            <div style={{ 
              minWidth: "130px", 
              ...DESIGN.typography.tiny, 
              fontFamily: "monospace",
              color: DESIGN.colors.text.secondary,
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}>
              {item.label}
            </div>
            <div style={{ 
              flex: 1, 
              height: "24px", 
              background: DESIGN.colors.bg.card, 
              borderRadius: DESIGN.borderRadius.sm,
              position: "relative",
              overflow: "hidden",
              border: `1px solid ${DESIGN.colors.bg.border}`
            }}>
              <div style={{
                width: `${maxValue > 0 ? (item.value / maxValue * 100) : 0}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${color}, ${color}dd)`,
                borderRadius: DESIGN.borderRadius.sm,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                paddingRight: DESIGN.spacing.sm,
                transition: "width 0.5s ease",
                boxShadow: `0 2px 4px ${color}40`
              }}>
                <span style={{ 
                  ...DESIGN.typography.tiny, 
                  fontWeight: "bold", 
                  color: "#fff",
                  textShadow: "0 1px 2px rgba(0,0,0,0.3)"
                }}>
                  {item.value}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ================== 主應用程式 ==================

export function Application() {
  const [sshFailedRaw, setSSHFailedRaw] = useState("");
  const [sshAcceptedRaw, setSSHAcceptedRaw] = useState("");
  const [sudoAuthFailedRaw, setSudoAuthFailedRaw] = useState("");
  const [sudoCommandsRaw, setSudoCommandsRaw] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [geoIPCache, setGeoIPCache] = useState(new Map());
  const [blockingIP, setBlockingIP] = useState(null);
  const [blockedIPs, setBlockedIPs] = useState([]);
  
  // 測試模式：假的 IP 地址列表
  const [testIPs, setTestIPs] = useState(() => {
    const saved = localStorage.getItem('security-dashboard-test-ips');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved test IPs:', e);
      }
    }
    return [];
  });
  
  // IP 輸入歷史記錄（用於自動完成）
  const [ipHistory, setIpHistory] = useState(() => {
    const saved = localStorage.getItem('security-dashboard-ip-history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved IP history:', e);
      }
    }
    return [];
  });
  
  // 配置選項狀態
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('security-dashboard-config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved config:', e);
      }
    }
    return {
      failureThreshold: 5,      // 失敗嘗試閾值 (次數)
      timeWindow: 10,            // 時間窗口 (分鐘)
      banDuration: 24            // 封禁時間 (小時)
    };
  });
  
  // IP 封禁記錄 (IP -> { bannedAt, banDuration, reason })
  const [bannedIPRecords, setBannedIPRecords] = useState(() => {
    const saved = localStorage.getItem('security-dashboard-banned-ips');
    if (saved) {
      try {
        const records = JSON.parse(saved);
        // 過濾已過期的封禁記錄
        const now = Date.now();
        return Object.fromEntries(
          Object.entries(records).filter(([ip, record]) => {
            const banEndTime = record.bannedAt + (record.banDuration * 60 * 60 * 1000);
            return banEndTime > now;
          })
        );
      } catch (e) {
        console.error('Failed to parse saved banned IPs:', e);
      }
    }
    return {};
  });
  
  // 手動解封的 IP 記錄 (IP -> 解封時間戳)，用於防止解封後立即自動封鎖
  const [manuallyUnbannedIPs, setManuallyUnbannedIPs] = useState(() => {
    const saved = localStorage.getItem('security-dashboard-manually-unbanned-ips');
    if (saved) {
      try {
        const records = JSON.parse(saved);
        const now = Date.now();
        // 只保留最近 10 分鐘內解封的記錄
        return Object.fromEntries(
          Object.entries(records).filter(([ip, timestamp]) => {
            return (now - timestamp) < 10 * 60 * 1000; // 10 分鐘
          })
        );
      } catch (e) {
        console.error('Failed to parse saved manually unbanned IPs:', e);
      }
    }
    return {};
  });

  // 資料解析（包含測試 IP）
  const sshFailedParsed = useMemo(() => {
    const lines = sshFailedRaw.split("\n").filter(l => l.trim());
    const realParsed = lines.map(parseSSHFailedLine).filter(Boolean);
    
    // 添加測試 IP 的假日誌
    const testParsed = [];
    const now = new Date();
    const timestamp = now.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    }).replace(',', '');
    
    testIPs.forEach(testIP => {
      // 為每個測試 IP 生成指定數量的失敗記錄
      for (let i = 0; i < testIP.failCount; i++) {
        testParsed.push({
          timestamp: timestamp,
          user: testIP.user || `testuser${i + 1}`,
          ip: testIP.ip,
          port: testIP.port || "22",
          type: "failed",
          raw: `${timestamp} sshd[12345]: Failed password for ${testIP.user || `testuser${i + 1}`} from ${testIP.ip} port ${testIP.port || "22"} ssh2`
        });
      }
    });
    
    return [...realParsed, ...testParsed];
  }, [sshFailedRaw, testIPs]);

  const sshAcceptedParsed = useMemo(() => {
    const lines = sshAcceptedRaw.split("\n").filter(l => l.trim());
    return lines.map(parseSSHAcceptedLine).filter(Boolean);
  }, [sshAcceptedRaw]);

  const sudoAuthFailedParsed = useMemo(() => {
    const lines = sudoAuthFailedRaw.split("\n").filter(l => l.trim());
    return lines.map(parseSudoAuthFailedLine).filter(Boolean);
  }, [sudoAuthFailedRaw]);

  const sudoCommandsParsed = useMemo(() => {
    const lines = sudoCommandsRaw.split("\n").filter(l => l.trim());
    return lines.map(parseSudoCommandLine).filter(Boolean);
  }, [sudoCommandsRaw]);

  const sshFailedByIP = useMemo(() => {
    return aggregateByIP(sshFailedParsed);
  }, [sshFailedParsed]);

  const sshFailedHourly = useMemo(() => {
    return getHourlyStats(sshFailedParsed);
  }, [sshFailedParsed]);

  const topFailedIPs = useMemo(() => {
    return sshFailedByIP.slice(0, 5).map(item => ({
      label: item.ip,
      value: item.count
    }));
  }, [sshFailedByIP]);

  const stats = useMemo(() => {
    const uniqueIPs = new Set(sshFailedParsed.map(e => e.ip)).size;
    const sudoFailedUsersCount = new Set(sudoAuthFailedParsed.map(e => e.user)).size;
    return {
      sshFailedCount: sshFailedParsed.length,
      sshAcceptedCount: sshAcceptedParsed.length,
      sudoFailedCount: sudoAuthFailedParsed.length,
      sudoCommandsCount: sudoCommandsParsed.length,
      uniqueIPs,
      sudoFailedUsersCount
    };
  }, [sshFailedParsed, sshAcceptedParsed, sudoAuthFailedParsed, sudoCommandsParsed]);

  // 保存配置到 localStorage
  useEffect(() => {
    localStorage.setItem('security-dashboard-config', JSON.stringify(config));
  }, [config]);
  
  // 保存封禁記錄到 localStorage
  useEffect(() => {
    localStorage.setItem('security-dashboard-banned-ips', JSON.stringify(bannedIPRecords));
    // 更新 blockedIPs 列表
    setBlockedIPs(Object.keys(bannedIPRecords));
  }, [bannedIPRecords]);
  
  // 保存手動解封記錄到 localStorage
  useEffect(() => {
    localStorage.setItem('security-dashboard-manually-unbanned-ips', JSON.stringify(manuallyUnbannedIPs));
  }, [manuallyUnbannedIPs]);
  
  // 定期清理過期的手動解封記錄
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setManuallyUnbannedIPs(prev => {
        const updated = Object.fromEntries(
          Object.entries(prev).filter(([ip, timestamp]) => {
            return (now - timestamp) < 10 * 60 * 1000; // 保留 10 分鐘內的記錄
          })
        );
        return updated;
      });
    }, 60000); // 每分鐘檢查一次
    
    return () => clearInterval(cleanupInterval);
  }, []);
  
  // 保存測試 IP 到 localStorage
  useEffect(() => {
    localStorage.setItem('security-dashboard-test-ips', JSON.stringify(testIPs));
  }, [testIPs]);
  
  // 保存 IP 歷史記錄到 localStorage
  useEffect(() => {
    localStorage.setItem('security-dashboard-ip-history', JSON.stringify(ipHistory));
  }, [ipHistory]);
  
  // 驗證 IP 地址格式和範圍的函數
  function isValidIP(ip) {
    if (!ip || typeof ip !== 'string') return false;
    
    // 檢查基本格式：4 個數字段，用點分隔
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) return false;
    
    // 檢查每個段是否在 0-255 範圍內
    const parts = ip.split('.');
    for (const part of parts) {
      const num = parseInt(part, 10);
      if (isNaN(num) || num < 0 || num > 255) {
        return false;
      }
    }
    
    return true;
  }
  
  // 添加測試 IP 的函數
  function addTestIP(ip, failCount = 1, user = "testuser", port = "22") {
    if (!ip || testIPs.some(t => t.ip === ip)) {
      alert(`IP ${ip} 已經存在於列表中`);
      return;
    }
    
    // 驗證 IP 格式和範圍
    if (!isValidIP(ip)) {
      alert("請輸入有效的 IP 地址格式（例如：192.168.1.100）\n\n每個數字段必須在 0-255 範圍內");
      return;
    }
    
    setTestIPs(prev => [...prev, { ip, failCount: parseInt(failCount) || 1, user, port }]);
    
    // 將 IP 添加到歷史記錄（如果不存在）
    setIpHistory(prev => {
      if (!prev.includes(ip)) {
        // 限制歷史記錄最多保存 20 個
        const updated = [ip, ...prev].slice(0, 20);
        return updated;
      }
      return prev;
    });
  }
  
  // 移除測試 IP 的函數
  function removeTestIP(ip) {
    setTestIPs(prev => prev.filter(t => t.ip !== ip));
  }
  
  // 清除所有測試 IP
  function clearAllTestIPs() {
    if (window.confirm("確定要清除所有 IP 嗎？")) {
      setTestIPs([]);
    }
  }
  
  // 檢查並清理過期的封禁記錄
  useEffect(() => {
    const checkExpiredBans = () => {
      const now = Date.now();
      const updated = { ...bannedIPRecords };
      let hasChanges = false;
      
      Object.entries(updated).forEach(([ip, record]) => {
        const banEndTime = record.bannedAt + (record.banDuration * 60 * 60 * 1000);
        if (banEndTime <= now) {
          delete updated[ip];
          hasChanges = true;
          // 自動解封
          handleUnbanIP(ip, false);
        }
      });
      
      if (hasChanges) {
        setBannedIPRecords(updated);
      }
    };
    
    checkExpiredBans();
    const interval = setInterval(checkExpiredBans, 60000); // 每分鐘檢查一次
    return () => clearInterval(interval);
  }, [bannedIPRecords]);
  
  // 資料載入
  useEffect(() => {
    loadAllLogs();
    const interval = setInterval(loadAllLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  function loadAllLogs() {
    setLoading(true);
    setError(null);

    Promise.all([
      cockpit.spawn(SSH_FAILED_CMD, { superuser: "try" }),
      cockpit.spawn(SSH_ACCEPTED_CMD, { superuser: "try" }),
      cockpit.spawn(SUDO_AUTH_FAILED_CMD, { superuser: "try" }),
      cockpit.spawn(SUDO_COMMANDS_CMD, { superuser: "try" })
    ])
      .then(([sshFailed, sshAccepted, sudoAuthFailed, sudoCommands]) => {
        setSSHFailedRaw(sshFailed || "");
        setSSHAcceptedRaw(sshAccepted || "");
        setSudoAuthFailedRaw(sudoAuthFailed || "");
        setSudoCommandsRaw(sudoCommands || "");
      })
      .catch((err) => {
        console.error("Failed to load logs:", err);
        setError("無法載入日誌：" + String(err));
      })
      .finally(() => {
        setLoading(false);
      });
  }

  // GeoIP 查詢
  useEffect(() => {
    const ipsToLookup = new Set();
    sshFailedByIP.forEach(item => {
      if (item.ip && !geoIPCache.has(item.ip)) {
        ipsToLookup.add(item.ip);
      }
    });

    if (ipsToLookup.size > 0) {
      const promises = Array.from(ipsToLookup).map(async (ip) => {
        const country = await fetchGeoIP(ip);
        return { ip, country };
      });

      Promise.all(promises).then(results => {
        setGeoIPCache(prev => {
          const newCache = new Map(prev);
          results.forEach(({ ip, country }) => {
            newCache.set(ip, country);
          });
          return newCache;
        });
      });
    }
  }, [sshFailedByIP, geoIPCache]);

  // IP 封鎖功能
  async function handleBlockIP(ip, autoBan = false, reason = "手動封禁") {
    if (!ip || blockingIP) return;
    
    // 驗證 IP 地址格式和範圍（在執行命令之前）
    if (!isValidIP(ip)) {
      const errorMsg = autoBan 
        ? `無法自動封鎖無效的 IP 地址：${ip}\n\nIP 地址格式錯誤或包含超出範圍的數字（必須在 0-255 之間）`
        : `無效的 IP 地址：${ip}\n\n請輸入有效的 IP 地址格式（例如：192.168.1.100）\n每個數字段必須在 0-255 範圍內`;
      if (!autoBan) {
        alert(`❌ ${errorMsg}`);
      } else {
        console.error('Auto-ban failed: Invalid IP address', ip);
      }
      return;
    }
    
    // 檢查是否已經被封禁
    if (bannedIPRecords[ip]) {
      const record = bannedIPRecords[ip];
      const banEndTime = record.bannedAt + (record.banDuration * 60 * 60 * 1000);
      if (banEndTime > Date.now()) {
        if (!autoBan) {
          alert(`IP ${ip} 已經被封禁，封禁將在 ${new Date(banEndTime).toLocaleString('zh-TW')} 到期`);
        }
        return;
      }
    }

    if (!autoBan) {
      const confirmed = window.confirm(
        `確定要封鎖 IP ${ip} 嗎？\n\n封禁時間：${config.banDuration} 小時\n\n這將執行：\nufw deny from ${ip} to any port 22\n\n（如果 ufw 不存在則使用 iptables）`
      );
      if (!confirmed) return;
    }

    setBlockingIP(ip);

    try {
      await cockpit.spawn(
        ["bash", "-c", `command -v ufw >/dev/null 2>&1 && ufw deny from ${ip} to any port 22 || iptables -A INPUT -s ${ip} -p tcp --dport 22 -j DROP`],
        { superuser: "require" }
      );
      
      // 記錄封禁信息
      const banRecord = {
        bannedAt: Date.now(),
        banDuration: config.banDuration,
        reason: autoBan ? `自動封禁（失敗嘗試超過 ${config.failureThreshold} 次）` : reason
      };
      
      setBannedIPRecords(prev => ({
        ...prev,
        [ip]: banRecord
      }));
      
      if (!autoBan) {
        alert(`✅ 已成功封鎖 IP: ${ip}\n封禁時間：${config.banDuration} 小時`);
      }
    } catch (err) {
      console.error("Failed to block IP:", err);
      if (!autoBan) {
        alert(`❌ 封鎖失敗：${String(err)}\n\n可能需要 root 權限或防火牆未安裝。`);
      }
    } finally {
      setBlockingIP(null);
    }
  }
  
  // IP 解封功能
  async function handleUnbanIP(ip, showAlert = true) {
    if (!ip) return;
    
    if (!bannedIPRecords[ip]) {
      if (showAlert) {
        alert(`IP ${ip} 未被封禁`);
      }
      return;
    }

    try {
      // 嘗試從 ufw 或 iptables 移除規則
      await cockpit.spawn(
        ["bash", "-c", `command -v ufw >/dev/null 2>&1 && ufw delete deny from ${ip} to any port 22 || iptables -D INPUT -s ${ip} -p tcp --dport 22 -j DROP`],
        { superuser: "require" }
      );
      
      // 從記錄中移除
      setBannedIPRecords(prev => {
        const updated = { ...prev };
        delete updated[ip];
        return updated;
      });
      
      // 如果是手動解封（showAlert = true），記錄到手動解封列表，防止立即自動封鎖
      if (showAlert) {
        setManuallyUnbannedIPs(prev => ({
          ...prev,
          [ip]: Date.now()
        }));
      }
      
      if (showAlert) {
        alert(`✅ 已成功解封 IP: ${ip}`);
      }
    } catch (err) {
      console.error("Failed to unban IP:", err);
      // 即使命令失敗，也從記錄中移除（可能是規則不存在）
      setBannedIPRecords(prev => {
        const updated = { ...prev };
        delete updated[ip];
        return updated;
      });
      
      // 如果是手動解封，也記錄到手動解封列表
      if (showAlert) {
        setManuallyUnbannedIPs(prev => ({
          ...prev,
          [ip]: Date.now()
        }));
      }
      
      if (showAlert) {
        alert(`⚠️ 已從記錄中移除 IP: ${ip}\n（防火牆規則可能不存在）`);
      }
    }
  }
  
  // 自動封禁檢查（當失敗次數超過閾值時）
  useEffect(() => {
    const now = Date.now();
    
    sshFailedByIP.forEach(item => {
      if (!item.ip || item.ip === "unknown") return;
      
      // 檢查是否已經被封禁
      if (bannedIPRecords[item.ip]) {
        const record = bannedIPRecords[item.ip];
        const banEndTime = record.bannedAt + (record.banDuration * 60 * 60 * 1000);
        if (banEndTime > now) {
          return; // 已經被封禁且未過期
        }
      }
      
      // 檢查是否在最近手動解封的列表中（10 分鐘內），如果是則跳過自動封鎖
      if (manuallyUnbannedIPs[item.ip]) {
        const unbanTime = manuallyUnbannedIPs[item.ip];
        if ((now - unbanTime) < 10 * 60 * 1000) { // 10 分鐘內
          return; // 最近手動解封，不自動封鎖
        }
      }
      
      // 如果失敗次數超過閾值，自動封禁
      if (item.count >= config.failureThreshold) {
        handleBlockIP(item.ip, true).catch(err => {
          console.error('Auto-ban failed:', err);
        });
      }
    });
  }, [sshFailedByIP, config.failureThreshold, bannedIPRecords, manuallyUnbannedIPs]);

  // 計算最後更新時間
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  useEffect(() => {
    if (!loading && (sshFailedRaw || sshAcceptedRaw)) {
      setLastUpdateTime(new Date());
    }
  }, [loading, sshFailedRaw, sshAcceptedRaw]);

  const riskLevel = calculateRiskLevel(stats.sshFailedCount, stats.sudoFailedCount, stats.uniqueIPs);
  const riskConfig = getRiskConfig(riskLevel);

  // 響應式斷點檢測（簡化版）
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // UI 渲染
  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        /* 自定義滾動條樣式 */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
        /* Firefox 滾動條 */
        * {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.3) rgba(0, 0, 0, 0.2);
        }
      `}</style>
      <div
        style={{
          padding: isMobile ? DESIGN.spacing.lg : DESIGN.spacing.xxl,
          color: DESIGN.colors.text.primary,
          background: "var(--pf-global--BackgroundColor--dark-100, #151515)",
          minHeight: "100vh",
          boxSizing: "border-box"
        }}
      >
      {/* 頂部標題 */}
      <div style={{ 
        marginBottom: DESIGN.spacing.xxl, 
        display: "flex", 
        flexDirection: isMobile ? "column" : "row",
        justifyContent: "space-between", 
        alignItems: isMobile ? "flex-start" : "flex-start",
        gap: isMobile ? DESIGN.spacing.md : 0,
        paddingBottom: DESIGN.spacing.lg,
        borderBottom: `1px solid ${DESIGN.colors.bg.border}`
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ 
            display: "flex", 
            flexWrap: "wrap",
            alignItems: "center", 
            gap: DESIGN.spacing.md, 
            marginBottom: DESIGN.spacing.xs 
          }}>
            <h1 style={{ ...DESIGN.typography.h1, margin: 0, fontSize: isMobile ? "1.5rem" : DESIGN.typography.h1.fontSize }}>
              🛡️ Security Dashboard
            </h1>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: DESIGN.spacing.xs,
              padding: `${DESIGN.spacing.xs}px ${DESIGN.spacing.md}px`,
              borderRadius: DESIGN.borderRadius.md,
              background: riskConfig.bgColor,
              border: `1px solid ${riskConfig.color}`,
              fontSize: isMobile ? DESIGN.typography.tiny.fontSize : DESIGN.typography.small.fontSize,
              transition: "all 0.2s ease"
            }}>
              <span>{riskConfig.icon}</span>
              <span style={{ color: riskConfig.color, fontWeight: "600" }}>
                {riskConfig.label}
              </span>
            </div>
          </div>
          <p style={{ 
            ...DESIGN.typography.body, 
            color: DESIGN.colors.text.secondary, 
            margin: 0,
            marginBottom: DESIGN.spacing.xs
          }}>
            系統安全監控面板 - 即時監控 SSH 與 sudo 活動
          </p>
          {lastUpdateTime && (
            <p style={{ 
              ...DESIGN.typography.small, 
              color: DESIGN.colors.text.muted, 
              margin: 0 
            }}>
              最後更新：{lastUpdateTime.toLocaleTimeString('zh-TW')}
            </p>
          )}
        </div>
        <button
          className="pf-c-button pf-m-secondary"
          onClick={loadAllLogs}
          disabled={loading}
          style={{
            marginLeft: isMobile ? 0 : DESIGN.spacing.lg,
            transition: "all 0.2s ease",
            opacity: loading ? 0.6 : 1,
            cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "載入中..." : "🔄 重新整理"}
        </button>
      </div>

      {/* 載入狀態指示 */}
      {loading && (
        <div
          style={{
            padding: `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px`,
            marginBottom: DESIGN.spacing.xl,
            background: "rgba(96, 165, 250, 0.1)",
            border: `1px solid ${DESIGN.colors.info}`,
            borderRadius: DESIGN.borderRadius.md,
            color: DESIGN.colors.info,
            ...DESIGN.typography.body,
            display: "flex",
            alignItems: "center",
            gap: DESIGN.spacing.sm,
            animation: "pulse 2s ease-in-out infinite"
          }}
        >
          <span>⏳</span>
          <span>正在載入資料...</span>
        </div>
      )}

      {/* 錯誤提示 */}
      {error && (
        <div
          style={{
            padding: `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px`,
            marginBottom: DESIGN.spacing.xl,
            background: "rgba(239, 68, 68, 0.1)",
            border: `1px solid ${DESIGN.colors.danger}`,
            borderRadius: DESIGN.borderRadius.md,
            color: "#fca5a5",
            ...DESIGN.typography.body,
            transition: "all 0.3s ease"
          }}
        >
          ❌ {error}
        </div>
      )}

      {/* 模組 1：安全概覽 */}
      <ModuleContainer>
        <RiskSummaryCard
          sshFailedCount={stats.sshFailedCount}
          sudoFailedCount={stats.sudoFailedCount}
          uniqueIPs={stats.uniqueIPs}
        />
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", 
          gap: DESIGN.spacing.lg 
        }}>
          <StatCard
            title="SSH 登入概況"
            items={[
              { label: "成功", value: stats.sshAcceptedCount },
              { label: "失敗", value: stats.sshFailedCount },
              { label: "來源IP", value: stats.uniqueIPs }
            ]}
          />
          <StatCard
            title="sudo 使用概況"
            items={[
              { label: "成功", value: stats.sudoCommandsCount },
              { label: "失敗", value: stats.sudoFailedCount },
              { label: "失敗用戶", value: stats.sudoFailedUsersCount }
            ]}
          />
        </div>
      </ModuleContainer>

      {/* 模組 2：SSH 威脅分析 */}
      <ModuleContainer title="SSH 威脅分析" description="攻擊趨勢與熱點分析">
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", 
          gap: DESIGN.spacing.lg 
        }}>
          <div style={{
            borderRadius: DESIGN.borderRadius.md,
            border: `1px solid ${DESIGN.colors.bg.border}`,
            padding: `${DESIGN.spacing.lg}px 0`,
            background: DESIGN.colors.bg.card,
            boxShadow: DESIGN.shadows.sm,
            width: "100%",
            boxSizing: "border-box"
          }}>
            <LineChart
              data={sshFailedHourly}
              title="過去 24 小時 SSH 失敗趨勢"
            />
          </div>
          <div style={{
            borderRadius: DESIGN.borderRadius.md,
            border: `1px solid ${DESIGN.colors.bg.border}`,
            padding: DESIGN.spacing.lg,
            background: DESIGN.colors.bg.card,
            boxShadow: DESIGN.shadows.sm
          }}>
            <BarChart
              data={topFailedIPs}
              title="攻擊 IP 熱點 (Top 5)"
              color={DESIGN.colors.danger}
            />
          </div>
        </div>
      </ModuleContainer>

      {/* 模組 3：SSH 事件管理 */}
      <ModuleContainer title="SSH 事件管理" description="SSH 失敗登入記錄（最近 24 小時）">
        <div style={{
          borderRadius: DESIGN.borderRadius.md,
          border: `1px solid ${DESIGN.colors.bg.border}`,
          padding: DESIGN.spacing.xl,
          background: DESIGN.colors.bg.card,
          boxShadow: DESIGN.shadows.sm
        }}>
          {sshFailedByIP.length === 0 ? (
            <p style={{ 
              color: DESIGN.colors.text.muted, 
              textAlign: "center", 
              padding: DESIGN.spacing.xxxl,
              ...DESIGN.typography.body
            }}>
              ✅ 目前沒有 SSH 失敗登入記錄
            </p>
          ) : (
            <div style={{ overflowX: "auto", overflowY: "visible" }}>
              <table
                className="pf-c-table pf-m-grid-md"
                style={{ 
                  width: "100%", 
                  ...DESIGN.typography.body,
                  borderCollapse: "separate",
                  borderSpacing: 0
                }}
              >
                <thead>
                  <tr style={{
                    background: DESIGN.colors.bg.card,
                    borderBottom: `2px solid ${DESIGN.colors.bg.border}`
                  }}>
                    <th style={{ 
                      padding: `${DESIGN.spacing.md}px ${isMobile ? DESIGN.spacing.md : DESIGN.spacing.lg}px`,
                      textAlign: "left",
                      ...DESIGN.typography.small,
                      fontWeight: "600",
                      color: DESIGN.colors.text.primary,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      fontSize: isMobile ? DESIGN.typography.tiny.fontSize : DESIGN.typography.small.fontSize
                    }}>
                      IP 位址
                    </th>
                    <th style={{ 
                      padding: `${DESIGN.spacing.md}px ${isMobile ? DESIGN.spacing.md : DESIGN.spacing.lg}px`,
                      textAlign: "left",
                      ...DESIGN.typography.small,
                      fontWeight: "600",
                      color: DESIGN.colors.text.primary,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      fontSize: isMobile ? DESIGN.typography.tiny.fontSize : DESIGN.typography.small.fontSize
                    }}>
                      國家/地區
                    </th>
                    <th style={{ 
                      padding: `${DESIGN.spacing.md}px ${isMobile ? DESIGN.spacing.md : DESIGN.spacing.lg}px`,
                      textAlign: "left",
                      ...DESIGN.typography.small,
                      fontWeight: "600",
                      color: DESIGN.colors.text.primary,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      fontSize: isMobile ? DESIGN.typography.tiny.fontSize : DESIGN.typography.small.fontSize
                    }}>
                      失敗次數
                    </th>
                    <th style={{ 
                      padding: `${DESIGN.spacing.md}px ${isMobile ? DESIGN.spacing.md : DESIGN.spacing.lg}px`,
                      textAlign: "left",
                      ...DESIGN.typography.small,
                      fontWeight: "600",
                      color: DESIGN.colors.text.primary,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      fontSize: isMobile ? DESIGN.typography.tiny.fontSize : DESIGN.typography.small.fontSize
                    }}>
                      嘗試帳號
                    </th>
                    <th style={{ 
                      padding: `${DESIGN.spacing.md}px ${isMobile ? DESIGN.spacing.md : DESIGN.spacing.lg}px`,
                      textAlign: "left",
                      ...DESIGN.typography.small,
                      fontWeight: "600",
                      color: DESIGN.colors.text.primary,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      fontSize: isMobile ? DESIGN.typography.tiny.fontSize : DESIGN.typography.small.fontSize
                    }}>
                      Port
                    </th>
                    <th style={{ 
                      padding: `${DESIGN.spacing.md}px ${isMobile ? DESIGN.spacing.md : DESIGN.spacing.lg}px`,
                      textAlign: "left",
                      ...DESIGN.typography.small,
                      fontWeight: "600",
                      color: DESIGN.colors.text.primary,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      fontSize: isMobile ? DESIGN.typography.tiny.fontSize : DESIGN.typography.small.fontSize
                    }}>
                      暴力攻擊
                    </th>
                    <th style={{ 
                      padding: `${DESIGN.spacing.md}px ${isMobile ? DESIGN.spacing.md : DESIGN.spacing.lg}px`,
                      textAlign: "left",
                      ...DESIGN.typography.small,
                      fontWeight: "600",
                      color: DESIGN.colors.text.primary,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      fontSize: isMobile ? DESIGN.typography.tiny.fontSize : DESIGN.typography.small.fontSize
                    }}>
                      最後時間
                    </th>
                    <th style={{ 
                      padding: `${DESIGN.spacing.md}px ${isMobile ? DESIGN.spacing.md : DESIGN.spacing.lg}px`,
                      textAlign: "left",
                      ...DESIGN.typography.small,
                      fontWeight: "600",
                      color: DESIGN.colors.text.primary,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      fontSize: isMobile ? DESIGN.typography.tiny.fontSize : DESIGN.typography.small.fontSize
                    }}>
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sshFailedByIP.slice(0, 20).map((item) => (
                    <tr 
                      key={item.ip}
                      style={{
                        borderBottom: `1px solid ${DESIGN.colors.bg.border}`
                      }}
                    >
                      <td style={{ 
                        padding: `${DESIGN.spacing.md}px ${isMobile ? DESIGN.spacing.md : DESIGN.spacing.lg}px`,
                        fontFamily: "monospace", 
                        fontWeight: "bold",
                        color: DESIGN.colors.text.primary,
                        wordBreak: "break-all"
                      }}>
                        {item.ip}
                      </td>
                      <td style={{ 
                        padding: `${DESIGN.spacing.md}px ${isMobile ? DESIGN.spacing.md : DESIGN.spacing.lg}px`,
                        ...DESIGN.typography.small,
                        color: DESIGN.colors.text.primary
                      }}>
                        {geoIPCache.get(item.ip) || "查詢中..."}
                      </td>
                      <td style={{ padding: `${DESIGN.spacing.md}px ${isMobile ? DESIGN.spacing.md : DESIGN.spacing.lg}px` }}>
                        <span
                          style={{
                            padding: `${DESIGN.spacing.xs}px ${DESIGN.spacing.md}px`,
                            borderRadius: DESIGN.borderRadius.md,
                            background:
                              item.count >= 10
                                ? DESIGN.colors.danger
                                : item.count >= 5
                                  ? DESIGN.colors.warning
                                  : "#6b7280",
                            ...DESIGN.typography.small,
                            fontWeight: "bold",
                            color: "#fff",
                            display: "inline-block"
                          }}
                        >
                          {item.count}
                        </span>
                      </td>
                      <td style={{ 
                        padding: `${DESIGN.spacing.md}px ${isMobile ? DESIGN.spacing.md : DESIGN.spacing.lg}px`,
                        ...DESIGN.typography.small,
                        color: DESIGN.colors.text.primary,
                        ...(isMobile ? { maxWidth: "120px" } : {}),
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}>
                        {item.users.join(", ")}
                      </td>
                      <td style={{ 
                        padding: `${DESIGN.spacing.md}px ${isMobile ? DESIGN.spacing.md : DESIGN.spacing.lg}px`,
                        ...DESIGN.typography.small,
                        fontFamily: "monospace",
                        color: DESIGN.colors.text.primary
                      }}>
                        {item.ports.join(", ") || "N/A"}
                      </td>
                      <td style={{ padding: `${DESIGN.spacing.md}px ${isMobile ? DESIGN.spacing.md : DESIGN.spacing.lg}px` }}>
                        {item.isBruteForce ? (
                          <span style={{ 
                            color: DESIGN.colors.danger, 
                            fontWeight: "bold",
                            ...DESIGN.typography.small
                          }}>
                            ⚠️ 是
                          </span>
                        ) : (
                          <span style={{ 
                            color: DESIGN.colors.text.primary,
                            ...DESIGN.typography.small
                          }}>
                            否
                          </span>
                        )}
                      </td>
                      <td style={{ 
                        padding: `${DESIGN.spacing.md}px ${isMobile ? DESIGN.spacing.md : DESIGN.spacing.lg}px`,
                        ...DESIGN.typography.small,
                        whiteSpace: isMobile ? "normal" : "nowrap",
                        color: DESIGN.colors.text.primary
                      }}>
                        {item.lastSeen}
                      </td>
                      <td style={{ padding: `${DESIGN.spacing.md}px ${isMobile ? DESIGN.spacing.md : DESIGN.spacing.lg}px` }}>
                        {bannedIPRecords[item.ip] ? (
                          <span style={{ 
                            color: DESIGN.colors.danger,
                            fontWeight: "bold",
                            ...DESIGN.typography.small
                          }}>
                            ✅ 已封鎖
                          </span>
                        ) : (
                          <button
                            className="pf-c-button pf-m-danger pf-m-small"
                            onClick={() => handleBlockIP(item.ip)}
                            disabled={blockingIP !== null}
                            style={{ 
                              ...DESIGN.typography.tiny,
                              transition: "all 0.2s ease"
                            }}
                          >
                            {blockingIP === item.ip
                              ? "封鎖中..."
                              : "🚫 封鎖"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ModuleContainer>

      {/* 模組 4：sudo 事件監控 */}
      <ModuleContainer title="sudo 事件監控" description="驗證失敗記錄">
        <div style={{
          borderRadius: DESIGN.borderRadius.md,
          border: `1px solid ${DESIGN.colors.bg.border}`,
          padding: DESIGN.spacing.lg,
          background: DESIGN.colors.bg.card,
          boxShadow: DESIGN.shadows.sm
        }}>
          {sudoAuthFailedParsed.length === 0 ? (
            <p style={{ 
              color: DESIGN.colors.text.muted, 
              textAlign: "center", 
              padding: DESIGN.spacing.xxxl,
              ...DESIGN.typography.body
            }}>
              ✅ 目前沒有 sudo 驗證失敗記錄
            </p>
          ) : (
            <div style={{ 
              overflowX: "auto", 
              maxHeight: "300px", 
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "thin",
              scrollbarColor: `${DESIGN.colors.bg.border} transparent`
            }}>
              <table
                className="pf-c-table pf-m-compact"
                style={{ 
                  width: "100%", 
                  ...DESIGN.typography.small,
                  borderCollapse: "separate",
                  borderSpacing: 0
                }}
              >
                <thead style={{ 
                  position: "sticky", 
                  top: 0, 
                  background: "rgba(0,0,0,0.95)",
                  zIndex: 10,
                  borderBottom: `2px solid ${DESIGN.colors.bg.border}`
                }}>
                  <tr>
                    <th style={{ 
                      padding: `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px`,
                      textAlign: "left",
                      fontWeight: "600",
                      color: DESIGN.colors.text.primary,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      ...DESIGN.typography.tiny
                    }}>
                      時間
                    </th>
                    <th style={{ 
                      padding: `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px`,
                      textAlign: "left",
                      fontWeight: "600",
                      color: DESIGN.colors.text.primary,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      ...DESIGN.typography.tiny
                    }}>
                      用戶
                    </th>
                    <th style={{ 
                      padding: `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px`,
                      textAlign: "left",
                      fontWeight: "600",
                      color: DESIGN.colors.text.primary,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      ...DESIGN.typography.tiny
                    }}>
                      來源
                    </th>
                    <th style={{ 
                      padding: `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px`,
                      textAlign: "left",
                      fontWeight: "600",
                      color: DESIGN.colors.text.primary,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      ...DESIGN.typography.tiny
                    }}>
                      終端設備
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sudoAuthFailedParsed.slice(0, 20).map((item, idx) => {
                    return (
                      <tr 
                        key={idx}
                        style={{
                          borderBottom: `1px solid ${DESIGN.colors.bg.border}`
                        }}
                      >
                        <td style={{ 
                          padding: `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px`,
                          whiteSpace: "nowrap",
                          color: DESIGN.colors.text.primary
                        }}>
                          {item.timestamp}
                        </td>
                        <td style={{ 
                          padding: `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px`,
                          fontWeight: "bold",
                          color: DESIGN.colors.text.primary
                        }}>
                          {item.user}
                        </td>
                        <td style={{ 
                          padding: `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px`,
                          ...DESIGN.typography.tiny,
                          color: DESIGN.colors.text.primary
                        }}>
                          {item.rhost}
                        </td>
                        <td style={{ 
                          padding: `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px`,
                          ...DESIGN.typography.tiny,
                          color: DESIGN.colors.text.primary,
                          fontFamily: "monospace"
                        }}>
                          {item.tty || "N/A"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ModuleContainer>

      {/* 模組 5：IP 封禁管理 */}
      <ModuleContainer title="IP 封禁管理" description="查看和管理已封禁的 IP 地址">
        <div style={{
          borderRadius: DESIGN.borderRadius.md,
          border: `1px solid ${DESIGN.colors.bg.border}`,
          padding: DESIGN.spacing.xl,
          background: DESIGN.colors.bg.card,
          boxShadow: DESIGN.shadows.sm
        }}>
          {Object.keys(bannedIPRecords).length === 0 ? (
            <p style={{ 
              color: DESIGN.colors.text.muted, 
              textAlign: "center", 
              padding: DESIGN.spacing.xxxl,
              ...DESIGN.typography.body
            }}>
              目前沒有被封禁的 IP
            </p>
          ) : (
            <div style={{ overflowX: "auto", overflowY: "visible" }}>
              <table
                className="pf-c-table pf-m-grid-md"
                style={{ 
                  width: "100%", 
                  ...DESIGN.typography.body,
                  borderCollapse: "separate",
                  borderSpacing: 0
                }}
              >
                <thead>
                  <tr style={{
                    background: DESIGN.colors.bg.card,
                    borderBottom: `2px solid ${DESIGN.colors.bg.border}`
                  }}>
                    <th style={{ 
                      padding: `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px`,
                      textAlign: "left",
                      ...DESIGN.typography.small,
                      fontWeight: "600",
                      color: DESIGN.colors.text.primary,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>
                      IP 位址
                    </th>
                    <th style={{ 
                      padding: `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px`,
                      textAlign: "left",
                      ...DESIGN.typography.small,
                      fontWeight: "600",
                      color: DESIGN.colors.text.primary,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>
                      封禁時間
                    </th>
                    <th style={{ 
                      padding: `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px`,
                      textAlign: "left",
                      ...DESIGN.typography.small,
                      fontWeight: "600",
                      color: DESIGN.colors.text.primary,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>
                      到期時間
                    </th>
                    <th style={{ 
                      padding: `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px`,
                      textAlign: "left",
                      ...DESIGN.typography.small,
                      fontWeight: "600",
                      color: DESIGN.colors.text.primary,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>
                      原因
                    </th>
                    <th style={{ 
                      padding: `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px`,
                      textAlign: "left",
                      ...DESIGN.typography.small,
                      fontWeight: "600",
                      color: DESIGN.colors.text.primary,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(bannedIPRecords).map(([ip, record]) => {
                    const banEndTime = record.bannedAt + (record.banDuration * 60 * 60 * 1000);
                    const timeRemaining = banEndTime - Date.now();
                    const hoursRemaining = Math.ceil(timeRemaining / (60 * 60 * 1000));
                    
                    return (
                      <tr 
                        key={ip}
                        style={{
                          borderBottom: `1px solid ${DESIGN.colors.bg.border}`
                        }}
                      >
                        <td style={{ 
                          padding: `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px`,
                          fontFamily: "monospace", 
                          fontWeight: "bold",
                          color: DESIGN.colors.text.primary
                        }}>
                          {ip}
                        </td>
                        <td style={{ 
                          padding: `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px`,
                          ...DESIGN.typography.small,
                          color: DESIGN.colors.text.primary
                        }}>
                          {new Date(record.bannedAt).toLocaleString('zh-TW')}
                        </td>
                        <td style={{ 
                          padding: `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px`,
                          ...DESIGN.typography.small,
                          color: DESIGN.colors.text.primary
                        }}>
                          {new Date(banEndTime).toLocaleString('zh-TW')}
                          <br />
                          <span style={{ 
                            color: DESIGN.colors.text.secondary,
                            fontSize: DESIGN.typography.tiny.fontSize
                          }}>
                            (剩餘 {hoursRemaining > 0 ? `${hoursRemaining} 小時` : '即將到期'})
                          </span>
                        </td>
                        <td style={{ 
                          padding: `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px`,
                          ...DESIGN.typography.small,
                          color: DESIGN.colors.text.primary
                        }}>
                          {record.reason}
                        </td>
                        <td style={{ padding: `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px` }}>
                          <button
                            className="pf-c-button pf-m-success pf-m-small"
                            onClick={() => handleUnbanIP(ip)}
                            style={{ 
                              ...DESIGN.typography.tiny,
                              transition: "all 0.2s ease"
                            }}
                          >
                            🔓 解封
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ModuleContainer>

      {/* 模組 6：手動新增 IP */}
      <ModuleContainer title="手動新增 IP" description="手動添加 IP 地址來測試封鎖功能">
        <div style={{
          borderRadius: DESIGN.borderRadius.md,
          border: `1px solid ${DESIGN.colors.bg.border}`,
          padding: DESIGN.spacing.xl,
          background: DESIGN.colors.bg.card,
          boxShadow: DESIGN.shadows.sm
        }}>
          <div style={{ marginBottom: DESIGN.spacing.lg }}>
            <h3 style={{ 
              ...DESIGN.typography.h3, 
              margin: `0 0 ${DESIGN.spacing.md}px 0`,
              color: DESIGN.colors.text.primary
            }}>
              添加 IP
            </h3>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr 1fr 1fr auto", 
              gap: DESIGN.spacing.md,
              marginBottom: DESIGN.spacing.md
            }}>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  id="test-ip-input"
                  list="ip-history-list"
                  placeholder="例如：192.168.1.100"
                  autoComplete="off"
                  style={{
                    padding: `${DESIGN.spacing.sm}px ${DESIGN.spacing.md}px`,
                    borderRadius: DESIGN.borderRadius.sm,
                    border: `1px solid ${DESIGN.colors.bg.border}`,
                    background: DESIGN.colors.bg.card,
                    color: DESIGN.colors.text.primary,
                    ...DESIGN.typography.body,
                    fontFamily: "monospace",
                    width: "100%"
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const input = e.target;
                      const ip = input.value.trim();
                      if (ip) {
                        addTestIP(ip, 1);
                        input.value = '';
                      }
                    }
                  }}
                />
                <datalist id="ip-history-list">
                  {ipHistory.map((ip, idx) => (
                    <option key={idx} value={ip} />
                  ))}
                </datalist>
              </div>
              <input
                type="number"
                id="test-fail-count"
                placeholder="失敗次數"
                min="1"
                max="50"
                defaultValue="1"
                style={{
                  padding: `${DESIGN.spacing.sm}px ${DESIGN.spacing.md}px`,
                  borderRadius: DESIGN.borderRadius.sm,
                  border: `1px solid ${DESIGN.colors.bg.border}`,
                  background: DESIGN.colors.bg.card,
                  color: DESIGN.colors.text.primary,
                  ...DESIGN.typography.body
                }}
              />
              <input
                type="text"
                id="test-user"
                placeholder="用戶名"
                defaultValue="testuser"
                style={{
                  padding: `${DESIGN.spacing.sm}px ${DESIGN.spacing.md}px`,
                  borderRadius: DESIGN.borderRadius.sm,
                  border: `1px solid ${DESIGN.colors.bg.border}`,
                  background: DESIGN.colors.bg.card,
                  color: DESIGN.colors.text.primary,
                  ...DESIGN.typography.body
                }}
              />
              <input
                type="text"
                id="test-port"
                placeholder="端口"
                defaultValue="22"
                style={{
                  padding: `${DESIGN.spacing.sm}px ${DESIGN.spacing.md}px`,
                  borderRadius: DESIGN.borderRadius.sm,
                  border: `1px solid ${DESIGN.colors.bg.border}`,
                  background: DESIGN.colors.bg.card,
                  color: DESIGN.colors.text.primary,
                  ...DESIGN.typography.body
                }}
              />
              <button
                className="pf-c-button pf-m-primary pf-m-small"
                onClick={() => {
                  const ipInput = document.getElementById('test-ip-input');
                  const failCountInput = document.getElementById('test-fail-count');
                  const userInput = document.getElementById('test-user');
                  const portInput = document.getElementById('test-port');
                  const ip = ipInput.value.trim();
                  const failCount = parseInt(failCountInput.value) || 1;
                  const user = userInput.value.trim() || "testuser";
                  const port = portInput.value.trim() || "22";
                  
                  if (ip) {
                    addTestIP(ip, failCount, user, port);
                    ipInput.value = '';
                    failCountInput.value = '1';
                    userInput.value = 'testuser';
                    portInput.value = '22';
                  }
                }}
                style={{ 
                  ...DESIGN.typography.tiny,
                  whiteSpace: "nowrap"
                }}
              >
                ➕ 添加
              </button>
            </div>
            <div style={{
              padding: DESIGN.spacing.md,
              background: "rgba(96, 165, 250, 0.1)",
              border: `1px solid ${DESIGN.colors.info}`,
              borderRadius: DESIGN.borderRadius.sm,
              ...DESIGN.typography.small,
              color: DESIGN.colors.info,
              marginBottom: DESIGN.spacing.md
            }}>
              💡 提示：添加 IP 後，它們會出現在 SSH 威脅分析中。您可以：
              <ul style={{ margin: `${DESIGN.spacing.xs}px 0 0 ${DESIGN.spacing.lg}px`, padding: 0 }}>
                <li>手動封鎖：點擊「🚫 封鎖」按鈕</li>
                <li>自動封鎖：設置失敗次數 ≥ 閾值（預設 5 次）</li>
                <li>解除封鎖：在「IP 封禁管理」中點擊「🔓 解封」</li>
              </ul>
            </div>
          </div>
          
          {testIPs.length > 0 && (
            <div>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center",
                marginBottom: DESIGN.spacing.md
              }}>
                <h3 style={{ 
                  ...DESIGN.typography.h3, 
                  margin: 0,
                  color: DESIGN.colors.text.primary
                }}>
                  當前 IP 列表 ({testIPs.length})
                </h3>
                <button
                  className="pf-c-button pf-m-danger pf-m-small"
                  onClick={clearAllTestIPs}
                  style={{ 
                    ...DESIGN.typography.tiny
                  }}
                >
                  🗑️ 清除全部
                </button>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table
                  className="pf-c-table pf-m-compact"
                  style={{ 
                    width: "100%", 
                    ...DESIGN.typography.small,
                    borderCollapse: "separate",
                    borderSpacing: 0
                  }}
                >
                  <thead>
                    <tr style={{
                      background: DESIGN.colors.bg.card,
                      borderBottom: `2px solid ${DESIGN.colors.bg.border}`
                    }}>
                      <th style={{ 
                        padding: `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px`,
                        textAlign: "left",
                        fontWeight: "600",
                        color: DESIGN.colors.text.primary
                      }}>
                        IP 位址
                      </th>
                      <th style={{ 
                        padding: `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px`,
                        textAlign: "left",
                        fontWeight: "600",
                        color: DESIGN.colors.text.primary
                      }}>
                        失敗次數
                      </th>
                      <th style={{ 
                        padding: `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px`,
                        textAlign: "left",
                        fontWeight: "600",
                        color: DESIGN.colors.text.primary
                      }}>
                        用戶名
                      </th>
                      <th style={{ 
                        padding: `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px`,
                        textAlign: "left",
                        fontWeight: "600",
                        color: DESIGN.colors.text.primary
                      }}>
                        端口
                      </th>
                      <th style={{ 
                        padding: `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px`,
                        textAlign: "left",
                        fontWeight: "600",
                        color: DESIGN.colors.text.primary
                      }}>
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {testIPs.map((testIP, idx) => (
                      <tr 
                        key={idx}
                        style={{
                          borderBottom: `1px solid ${DESIGN.colors.bg.border}`
                        }}
                      >
                        <td style={{ 
                          padding: `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px`,
                          fontFamily: "monospace", 
                          fontWeight: "bold",
                          color: DESIGN.colors.text.primary
                        }}>
                          {testIP.ip}
                        </td>
                        <td style={{ 
                          padding: `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px`,
                          color: testIP.failCount >= config.failureThreshold 
                            ? DESIGN.colors.danger 
                            : DESIGN.colors.text.primary,
                          fontWeight: testIP.failCount >= config.failureThreshold ? "bold" : "normal"
                        }}>
                          {testIP.failCount} {testIP.failCount >= config.failureThreshold ? "⚠️ (將自動封鎖)" : ""}
                        </td>
                        <td style={{ 
                          padding: `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px`,
                          color: DESIGN.colors.text.primary
                        }}>
                          {testIP.user}
                        </td>
                        <td style={{ 
                          padding: `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px`,
                          fontFamily: "monospace",
                          color: DESIGN.colors.text.primary
                        }}>
                          {testIP.port}
                        </td>
                        <td style={{ padding: `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px` }}>
                          <button
                            className="pf-c-button pf-m-danger pf-m-small"
                            onClick={() => removeTestIP(testIP.ip)}
                            style={{ 
                              ...DESIGN.typography.tiny
                            }}
                          >
                            🗑️ 移除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </ModuleContainer>

      {/* 模組 7：配置選項 */}
      <ModuleContainer title="配置選項" description="設定 IP 封禁規則參數">
        <div style={{
          borderRadius: DESIGN.borderRadius.md,
          border: `1px solid ${DESIGN.colors.bg.border}`,
          padding: DESIGN.spacing.xl,
          background: DESIGN.colors.bg.card,
          boxShadow: DESIGN.shadows.sm
        }}>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", 
            gap: DESIGN.spacing.lg,
            marginBottom: DESIGN.spacing.lg
          }}>
            <div>
              <label style={{ 
                display: "block",
                marginBottom: DESIGN.spacing.sm,
                ...DESIGN.typography.small,
                fontWeight: "600",
                color: DESIGN.colors.text.primary
              }}>
                失敗嘗試閾值 (次數):
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={config.failureThreshold}
                onChange={(e) => setConfig(prev => ({ ...prev, failureThreshold: parseInt(e.target.value) || 5 }))}
                style={{
                  width: "100%",
                  padding: `${DESIGN.spacing.sm}px ${DESIGN.spacing.md}px`,
                  borderRadius: DESIGN.borderRadius.sm,
                  border: `1px solid ${DESIGN.colors.bg.border}`,
                  background: DESIGN.colors.bg.card,
                  color: DESIGN.colors.text.primary,
                  ...DESIGN.typography.body,
                  fontSize: "1rem"
                }}
              />
              <p style={{ 
                marginTop: DESIGN.spacing.xs,
                ...DESIGN.typography.tiny,
                color: DESIGN.colors.text.muted
              }}>
                當 IP 在時間窗口內失敗次數達到此值時，將自動封禁
              </p>
            </div>
            
            <div>
              <label style={{ 
                display: "block",
                marginBottom: DESIGN.spacing.sm,
                ...DESIGN.typography.small,
                fontWeight: "600",
                color: DESIGN.colors.text.primary
              }}>
                時間窗口 (分鐘):
              </label>
              <input
                type="number"
                min="1"
                max="1440"
                value={config.timeWindow}
                onChange={(e) => setConfig(prev => ({ ...prev, timeWindow: parseInt(e.target.value) || 10 }))}
                style={{
                  width: "100%",
                  padding: `${DESIGN.spacing.sm}px ${DESIGN.spacing.md}px`,
                  borderRadius: DESIGN.borderRadius.sm,
                  border: `1px solid ${DESIGN.colors.bg.border}`,
                  background: DESIGN.colors.bg.card,
                  color: DESIGN.colors.text.primary,
                  ...DESIGN.typography.body,
                  fontSize: "1rem"
                }}
              />
              <p style={{ 
                marginTop: DESIGN.spacing.xs,
                ...DESIGN.typography.tiny,
                color: DESIGN.colors.text.muted
              }}>
                統計失敗嘗試的時間範圍
              </p>
            </div>
            
            <div>
              <label style={{ 
                display: "block",
                marginBottom: DESIGN.spacing.sm,
                ...DESIGN.typography.small,
                fontWeight: "600",
                color: DESIGN.colors.text.primary
              }}>
                封禁時間 (小時):
              </label>
              <input
                type="number"
                min="1"
                max="168"
                value={config.banDuration}
                onChange={(e) => setConfig(prev => ({ ...prev, banDuration: parseInt(e.target.value) || 24 }))}
                style={{
                  width: "100%",
                  padding: `${DESIGN.spacing.sm}px ${DESIGN.spacing.md}px`,
                  borderRadius: DESIGN.borderRadius.sm,
                  border: `1px solid ${DESIGN.colors.bg.border}`,
                  background: DESIGN.colors.bg.card,
                  color: DESIGN.colors.text.primary,
                  ...DESIGN.typography.body,
                  fontSize: "1rem"
                }}
              />
              <p style={{ 
                marginTop: DESIGN.spacing.xs,
                ...DESIGN.typography.tiny,
                color: DESIGN.colors.text.muted
              }}>
                IP 被封禁後的持續時間，到期後自動解封
              </p>
            </div>
          </div>
          
          <div style={{
            padding: DESIGN.spacing.md,
            background: "rgba(96, 165, 250, 0.1)",
            border: `1px solid ${DESIGN.colors.info}`,
            borderRadius: DESIGN.borderRadius.sm,
            ...DESIGN.typography.small,
            color: DESIGN.colors.info
          }}>
            💡 提示：配置會自動保存。當 IP 在 {config.timeWindow} 分鐘內失敗 {config.failureThreshold} 次時，將自動封禁 {config.banDuration} 小時。
          </div>
        </div>
      </ModuleContainer>
    </div>
    </>
  );
}


