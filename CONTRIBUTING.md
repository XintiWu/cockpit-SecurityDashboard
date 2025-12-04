# 貢獻指南 / Contributing Guide

感謝你對 Cockpit Security Dashboard 的興趣！

## 📦 發布到 Cockpit 社群

### 方式 A：創建獨立的 Cockpit 套件（推薦）✅

這是官方推薦的方式，適合所有新功能模組。

#### 步驟 1：準備你的 GitHub 倉庫

1. **創建新的 GitHub 倉庫**
   - 倉庫名稱：`cockpit-security-dashboard`
   - 描述：Security monitoring and management dashboard for Cockpit
   - 授權：LGPL-2.1

2. **推送你的程式碼**
   ```bash
   # 如果還沒有設定 remote
   git remote add origin git@github.com:你的用戶名/cockpit-security-dashboard.git
   
   # 推送程式碼
   git push -u origin main
   ```

#### 步驟 2：發布第一個版本

1. **確保所有測試通過**
   ```bash
   npm run eslint
   npm run stylelint
   make codecheck
   ```

2. **創建版本標籤**
   ```bash
   # 創建帶註解的標籤
   git tag -a v1.0.0 -m "Release v1.0.0

   Initial release of Security Dashboard
   
   Features:
   - Real-time security monitoring
   - System information dashboard
   - Modern PatternFly UI
   - Multi-language support"
   
   # 推送標籤
   git push origin v1.0.0
   ```

3. **創建 GitHub Release**
   - 前往 GitHub 倉庫的 Releases 頁面
   - 點擊 "Create a new release"
   - 選擇標籤 `v1.0.0`
   - 填寫發布說明
   - 上傳發布檔案（可選）：
     ```bash
     make dist
     # 會生成 cockpit-security-dashboard-1.0.0.tar.xz
     ```

#### 步驟 3：註冊到 Cockpit 應用列表

Cockpit 官方維護一個應用列表，讓使用者可以發現你的模組。

1. **Fork Cockpit 網站倉庫**
   ```bash
   # 前往並 Fork
   https://github.com/cockpit-project/cockpit-project.github.io
   ```

2. **編輯應用列表**
   
   編輯檔案：`_data/applications.yml`
   
   加入你的應用：
   ```yaml
   - name: Security Dashboard
     package: cockpit-security-dashboard
     description: Security monitoring and management dashboard
     url: https://github.com/你的用戶名/cockpit-security-dashboard
     category: system
     tags:
       - security
       - monitoring
       - dashboard
     screenshot: https://raw.githubusercontent.com/你的用戶名/cockpit-security-dashboard/main/screenshot.png
     maintainer:
       name: 你的名字
       github: 你的用戶名
   ```

3. **提交 Pull Request**
   ```bash
   git checkout -b add-security-dashboard
   git add _data/applications.yml
   git commit -m "Add Security Dashboard application"
   git push origin add-security-dashboard
   ```
   
   然後在 GitHub 上開 PR 到 `cockpit-project/cockpit-project.github.io`

#### 步驟 4：打包到 Linux 發行版

##### Fedora / COPR

1. **創建 COPR 帳號**
   - 前往 https://copr.fedorainfracloud.org/
   - 使用 Fedora 帳號登入

2. **創建新專案**
   - 專案名稱：`cockpit-security-dashboard`
   - 描述：Security Dashboard for Cockpit
   - 啟用的發行版：Fedora 39, 40, 41, CentOS Stream 9

3. **上傳 SRPM**
   ```bash
   make srpm
   # 會生成 cockpit-security-dashboard-1.0.0-1.src.rpm
   ```
   
   在 COPR 網頁介面上傳 SRPM 或使用 CLI：
   ```bash
   copr-cli build 你的用戶名/cockpit-security-dashboard cockpit-security-dashboard-*.src.rpm
   ```

4. **啟用 Packit 自動化**（可選）
   
   編輯 `packit.yaml`，取消註解 COPR 構建部分：
   ```yaml
   - job: copr_build
     trigger: release
     owner: 你的_copr_用戶名
     project: cockpit-security-dashboard
     preserve_project: True
     targets:
       - fedora-all
       - centos-stream-9-x86_64
   ```

##### Ubuntu / Debian (PPA)

1. **創建 Launchpad 帳號**
   - 前往 https://launchpad.net/

2. **創建 PPA**
   - 名稱：`cockpit-security-dashboard`

3. **構建 DEB 套件**
   ```bash
   # 需要安裝 debuild
   sudo apt install devscripts debhelper
   
   # 創建 debian/ 目錄結構（需要額外配置）
   ```

#### 步驟 5：宣傳你的模組

1. **在 Cockpit 郵件列表宣布**
   - 郵件列表：cockpit-devel@lists.fedorahosted.org
   - 主題：[ANN] Security Dashboard 1.0.0 released

2. **在社群媒體分享**
   - Reddit: r/Fedora, r/selfhosted
   - Hacker News
   - Twitter/X

3. **撰寫部落格文章**
   - 介紹功能
   - 使用教學
   - 開發心得

---

### 方式 B：貢獻到 Cockpit 核心（不推薦新功能）

⚠️ **注意**：Cockpit 核心團隊現在很少接受新的模組到 `pkg/` 目錄。這個方式只適合：
- 修復現有模組的 bug
- 改進核心功能
- 非常基礎的系統管理功能

如果你仍然想嘗試：

#### 步驟 1：Fork Cockpit 核心倉庫

```bash
# Fork https://github.com/cockpit-project/cockpit

git clone git@github.com:你的用戶名/cockpit.git
cd cockpit
```

#### 步驟 2：加入你的模組

```bash
# 將你的模組複製到 pkg/
cp -r /path/to/cockpit-security-dashboard/src pkg/securityguard

# 確保有 manifest.json
cat > pkg/securityguard/manifest.json << 'EOF'
{
  "version": 1,
  "name": "securityguard",
  "label": "Security Dashboard",
  "requires": {
    "cockpit": "281"
  }
}
EOF
```

#### 步驟 3：加入測試

```bash
# 創建測試檔案
cat > test/verify-securityguard << 'EOF'
#!/usr/bin/python3
import testlib

@testlib.nondestructive
class TestSecurityGuard(testlib.MachineCase):
    def testBasic(self):
        b = self.browser
        m = self.machine

        self.login_and_go("/securityguard")
        b.wait_text("Security Dashboard")
EOF

chmod +x test/verify-securityguard
```

#### 步驟 4：提交 PR

```bash
git checkout -b add-security-dashboard
git add pkg/securityguard test/verify-securityguard
git commit -m "Add Security Dashboard module

This adds a new security monitoring and management dashboard.

Features:
- Real-time security monitoring
- System information display
- Modern UI using PatternFly"

git push origin add-security-dashboard
```

然後在 GitHub 開 PR 到 `cockpit-project/cockpit:main`

**預期結果**：很可能會被建議做成獨立套件 😅

---

## 🤝 一般貢獻指南

### 回報 Bug

1. 前往 [Issues](https://github.com/你的用戶名/cockpit-security-dashboard/issues)
2. 搜尋是否已有相同問題
3. 如果沒有，創建新 Issue
4. 提供：
   - 作業系統版本
   - Cockpit 版本
   - 重現步驟
   - 預期行為 vs 實際行為
   - 錯誤訊息或截圖

### 提交程式碼

1. **Fork 並 Clone**
   ```bash
   git clone git@github.com:你的用戶名/cockpit-security-dashboard.git
   cd cockpit-security-dashboard
   ```

2. **創建功能分支**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **開發和測試**
   ```bash
   make watch  # 自動重建
   npm run eslint:fix
   npm run stylelint:fix
   make codecheck
   ```

4. **提交變更**
   ```bash
   git add .
   git commit -m "feat: Add amazing feature

   - Detailed description of what changed
   - Why it was needed
   - Any breaking changes"
   ```

5. **推送並開 PR**
   ```bash
   git push origin feature/amazing-feature
   ```

### Commit 訊息格式

使用 [Conventional Commits](https://www.conventionalcommits.org/)：

```
<type>(<scope>): <subject>

<body>

<footer>
```

類型：
- `feat`: 新功能
- `fix`: Bug 修復
- `docs`: 文檔更新
- `style`: 程式碼格式（不影響功能）
- `refactor`: 重構
- `test`: 測試相關
- `chore`: 建置或輔助工具

範例：
```
feat(dashboard): Add security metrics chart

- Add Chart.js integration
- Display security events over time
- Add filtering by severity

Closes #123
```

---

## 📞 聯絡方式

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: 你的email@example.com

感謝你的貢獻！🎉

