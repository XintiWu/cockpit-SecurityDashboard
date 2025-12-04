# PR 標題

Add Security Dashboard application

---

# PR 描述（準確版本 - 反映實際功能）

## Add Security Dashboard application

This PR adds Security Dashboard to the Cockpit applications list.

### About Security Dashboard

Security Dashboard is a comprehensive SSH and sudo event monitoring and management system for Cockpit with real-time threat analysis and automatic IP blocking capabilities.

### ✨ Key Features

**🔍 SSH Monitoring & Analytics:**
- Real-time SSH failed login monitoring (past 24 hours)
- Hourly trend analysis with interactive line charts
- Top 5 attacking IP visualization with bar charts
- Detailed event logs with IP, country, username, port, and timestamps
- Brute-force attack detection (≥5 failed attempts)
- GeoIP country lookup for source IP addresses

**🛡️ Event Management:**
- SSH failed login event tracking with detailed information
- sudo authentication failure monitoring
- Failed attempt aggregation by IP address
- Real-time risk level assessment (Normal/Warning/Danger)

**🚫 Manual IP Blocking:**
- One-click IP blocking with firewall integration (ufw/iptables)
- Manual unblocking functionality
- Ban duration configuration (hours)
- Ban reason tracking

**➕ IP Management Interface:**
- Manual IP addition for testing
- Configurable failure counts per IP
- IP input history with autocomplete
- Batch IP management (add/remove)
- Test IP list display

**🤖 Automatic Monitoring & Blocking:**
- Configurable failure threshold (default: 5 attempts)
- Configurable time window (default: 10 minutes)
- Automatic IP banning when threshold exceeded
- Automatic unbanning after expiry
- Manual unban protection (prevents re-blocking for 10 minutes)
- Ban duration configuration (default: 24 hours)

**📊 Dashboard & Reporting:**
- Security status overview with risk indicators
- SSH success vs. failure statistics
- sudo command execution tracking
- Unique IP tracking
- Last update timestamp
- Auto-refresh every 30 seconds

### 🛠️ Technical Details

- Built with React and modern PatternFly components
- Uses journalctl for system log parsing
- Integrates with ufw/iptables for firewall management
- Local storage persistence for configuration
- Responsive design for mobile and desktop
- Real-time GeoIP lookups (ip-api.com)

### 📦 Installation

```bash
git clone https://github.com/XintiWu/cockpit-SecurityGuard.git
cd cockpit-SecurityGuard
make
sudo make install
```

### 📸 Screenshots

(Add screenshots of your dashboard showing the various features)

### 🔗 Links

**Repository:** https://github.com/XintiWu/cockpit-SecurityGuard

**Category:** System / Security

**License:** LGPL-2.1

### ✅ Checklist

- [x] Application is published and accessible
- [x] README includes installation instructions
- [x] License is specified (LGPL-2.1)
- [x] Application follows Cockpit design guidelines
- [x] Uses PatternFly components
- [x] Responsive design implemented
- [x] Multi-language support framework included

---

**Note:** This is a fully functional security monitoring and management dashboard suitable for production use. It provides both manual and automatic IP blocking capabilities with comprehensive event tracking and analysis.

