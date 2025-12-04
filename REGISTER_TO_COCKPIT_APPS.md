# 📝 註冊到 Cockpit 應用列表

## 🎯 目標

將 Security Dashboard 加入到 Cockpit 官方應用列表，讓全世界的使用者都能發現你的應用！

---

## 🚀 方法一：使用自動化腳本（推薦）

### 步驟 1：Fork Cockpit 網站倉庫

1. **前往 Cockpit 網站倉庫**
   
   🔗 https://github.com/cockpit-project/cockpit-project.github.io

2. **點擊右上角的 "Fork" 按鈕**
   
   Fork 到你的 GitHub 帳號（XintiWu）

3. **確認 Fork 完成**
   
   你應該會看到：`XintiWu/cockpit-project.github.io`

### 步驟 2：執行自動化腳本

```bash
cd /Users/xinti/cockpit-SecurityGuard
./scripts/register-to-cockpit-apps.sh
```

腳本會幫你：
- ✅ Clone 你的 Fork
- ✅ 創建新分支
- ✅ 打開編輯器讓你加入應用資訊
- ✅ 提交變更
- ✅ 推送到 GitHub
- ✅ 提供 PR 連結

### 步驟 3：創建 Pull Request

腳本完成後，前往顯示的連結創建 PR。

---

## 🔧 方法二：手動操作

### 步驟 1：Fork 並 Clone

```bash
# 1. 在 GitHub 上 Fork
#    https://github.com/cockpit-project/cockpit-project.github.io

# 2. Clone 你的 Fork
cd /Users/xinti
git clone git@github.com:XintiWu/cockpit-project.github.io.git
cd cockpit-project.github.io
```

### 步驟 2：創建分支

```bash
git checkout -b add-security-dashboard
```

### 步驟 3：編輯應用列表

編輯檔案：`_data/applications.yml`

在適當的位置（建議在 system 類別中）加入：

```yaml
- name: Security Dashboard
  package: cockpit-security-dashboard
  description: Security monitoring and management dashboard for Cockpit
  url: https://github.com/XintiWu/cockpit-SecurityGuard
  category: system
  tags:
    - security
    - monitoring
    - dashboard
  screenshot: https://raw.githubusercontent.com/XintiWu/cockpit-SecurityGuard/main/screenshot.png
  maintainer:
    name: Xinti Wu
    github: XintiWu
```

**注意**：如果你有截圖，記得加上 `screenshot` 欄位！

### 步驟 4：提交變更

```bash
git add _data/applications.yml

git commit -m "Add Security Dashboard application

Security Dashboard is a comprehensive security monitoring and management
dashboard for Cockpit.

Features:
- Real-time security monitoring
- System information dashboard
- Modern PatternFly UI
- Multi-language support

Repository: https://github.com/XintiWu/cockpit-SecurityGuard"

git push origin add-security-dashboard
```

### 步驟 5：創建 Pull Request

1. **前往你的 Fork**
   
   https://github.com/XintiWu/cockpit-project.github.io

2. **GitHub 會顯示黃色橫幅**
   
   "add-security-dashboard had recent pushes"
   
   點擊 "Compare & pull request"

3. **填寫 PR 資訊**
   
   **標題**：
   ```
   Add Security Dashboard application
   ```
   
   **描述**：
   ```markdown
   ## Add Security Dashboard application
   
   This PR adds Security Dashboard to the Cockpit applications list.
   
   ### About Security Dashboard
   
   Security Dashboard is a comprehensive security monitoring and management 
   dashboard for Cockpit.
   
   **Features:**
   - Real-time security monitoring
   - System information dashboard
   - Modern PatternFly UI
   - Multi-language support
   
   **Repository:** https://github.com/XintiWu/cockpit-SecurityGuard
   
   **Category:** System
   
   **License:** LGPL-2.1
   
   ### Checklist
   
   - [x] Application is published and accessible
   - [x] README includes installation instructions
   - [x] License is specified
   - [x] Application follows Cockpit design guidelines
   ```

4. **點擊 "Create pull request"**

---

## 📋 要加入的 YAML 內容（完整版）

如果你想要更完整的資訊，可以使用這個：

```yaml
- name: Security Dashboard
  package: cockpit-security-dashboard
  description: Security monitoring and management dashboard for Cockpit
  long_description: |
    Security Dashboard provides comprehensive security monitoring and management
    capabilities for your system through the Cockpit web interface. Monitor
    security status in real-time, manage security settings, and get notified
    about security events.
  url: https://github.com/XintiWu/cockpit-SecurityGuard
  category: system
  tags:
    - security
    - monitoring
    - dashboard
    - system-administration
  license: LGPL-2.1
  screenshot: https://raw.githubusercontent.com/XintiWu/cockpit-SecurityGuard/main/screenshot.png
  maintainer:
    name: Xinti Wu
    github: XintiWu
    email: xinti@example.com
  releases:
    - version: "1.0.0"
      date: "2024-12-04"
  install:
    fedora: |
      sudo dnf copr enable XintiWu/cockpit-security-dashboard
      sudo dnf install cockpit-security-dashboard
    debian: |
      # Coming soon
    source: |
      git clone https://github.com/XintiWu/cockpit-SecurityGuard.git
      cd cockpit-SecurityGuard
      make
      sudo make install
```

---

## 🖼️ 準備截圖（重要！）

應用列表通常需要截圖。建議準備：

### 1. 拍攝截圖

```bash
# 1. 本地安裝並運行
make devel-install

# 2. 在瀏覽器開啟 Cockpit
# https://localhost:9090

# 3. 導航到 Security Dashboard

# 4. 拍攝截圖（建議尺寸：800x400 或更大）
```

### 2. 加入到專案

```bash
# 將截圖命名為 screenshot.png
cp ~/Downloads/screenshot.png /Users/xinti/cockpit-SecurityGuard/

# 提交
git add screenshot.png
git commit -m "Add application screenshot"
git push origin main
```

### 3. 在 YAML 中加入截圖連結

```yaml
screenshot: https://raw.githubusercontent.com/XintiWu/cockpit-SecurityGuard/main/screenshot.png
```

---

## ✅ PR 審查要點

Cockpit 團隊會檢查：

1. **應用是否可訪問** ✅
   - GitHub 倉庫是公開的
   - README 清楚說明如何安裝

2. **資訊是否完整** ✅
   - 名稱、描述、類別都正確
   - 聯絡資訊完整

3. **品質** ✅
   - 遵循 Cockpit 設計指南
   - 有適當的文檔
   - 有授權資訊

4. **截圖**（強烈建議）
   - 清楚展示應用介面
   - 尺寸適當（800x400+）

---

## 🎯 預期時程

- **提交 PR**：立即
- **初步審查**：1-3 天
- **回應與修改**：視情況
- **合併**：通常 1-2 週
- **出現在網站**：合併後立即

---

## 💡 提示

### 如果 PR 被要求修改

常見的修改要求：
1. 加入截圖
2. 改善描述文字
3. 調整類別或標籤
4. 加入更多資訊

**不要擔心！** 這很正常，按照要求修改即可。

### 如果需要更新資訊

```bash
cd cockpit-project.github.io
git checkout add-security-dashboard

# 編輯 _data/applications.yml
vim _data/applications.yml

# 提交修改
git add _data/applications.yml
git commit -m "Update application information"
git push origin add-security-dashboard

# GitHub 的 PR 會自動更新
```

---

## 🎉 成功後

一旦 PR 被合併：

1. **你的應用會出現在 Cockpit 網站**
   
   https://cockpit-project.org/applications.html

2. **使用者可以在應用列表中找到你**

3. **增加曝光度和使用者**

---

## 📞 需要幫助？

- **Cockpit 郵件列表**: cockpit-devel@lists.fedorahosted.org
- **GitHub Issues**: https://github.com/cockpit-project/cockpit-project.github.io/issues

---

## 🚀 快速命令總結

```bash
# 方法一：使用腳本（推薦）
./scripts/register-to-cockpit-apps.sh

# 方法二：手動操作
cd /Users/xinti
git clone git@github.com:XintiWu/cockpit-project.github.io.git
cd cockpit-project.github.io
git checkout -b add-security-dashboard
# 編輯 _data/applications.yml
git add _data/applications.yml
git commit -m "Add Security Dashboard application"
git push origin add-security-dashboard
# 在 GitHub 上創建 PR
```

---

**準備好了嗎？開始吧！** 🎊

