# 🚀 發布檢查清單

使用這個清單來確保順利發布你的 Cockpit Security Dashboard。

## ✅ 發布前檢查

### 1. 程式碼品質
- [ ] 所有功能都已完成並測試
- [ ] 執行 `npm run eslint` 無錯誤
- [ ] 執行 `npm run stylelint` 無錯誤
- [ ] 執行 `make codecheck` 通過
- [ ] 所有測試通過（如果有）

### 2. 文檔
- [ ] README.md 已更新
- [ ] CONTRIBUTING.md 已完成
- [ ] 功能說明清楚
- [ ] 安裝說明正確
- [ ] 截圖已準備（建議 800x400 或更大）

### 3. 版本資訊
- [ ] `package.json` 版本號已更新
- [ ] CHANGELOG.md 已更新（如果有）
- [ ] 所有變更都已提交

### 4. 構建測試
- [ ] `make clean && make` 成功
- [ ] `make dist` 成功生成 tarball
- [ ] `make srpm` 成功（如果要發布到 Fedora）

## 📦 發布步驟

### 步驟 1：創建 Git 標籤

```bash
# 確保在 main 分支
git checkout main
git pull origin main

# 創建標籤
VERSION="1.0.0"
git tag -a v${VERSION} -m "Release v${VERSION}

主要功能：
- 功能 1
- 功能 2
- 功能 3

Bug 修復：
- 修復 1
- 修復 2"

# 推送標籤
git push origin v${VERSION}
```

### 步驟 2：創建 GitHub Release

1. 前往 https://github.com/你的用戶名/cockpit-security-dashboard/releases/new
2. 選擇標籤：`v1.0.0`
3. Release 標題：`Security Dashboard v1.0.0`
4. 描述發布內容：
   ```markdown
   ## 🎉 Security Dashboard v1.0.0
   
   首次正式發布！
   
   ### ✨ 主要功能
   - 即時安全監控
   - 系統資訊儀表板
   - 現代化 PatternFly UI
   - 多語言支援
   
   ### 📦 安裝方式
   
   #### 從原始碼安裝
   ```bash
   wget https://github.com/你的用戶名/cockpit-security-dashboard/archive/v1.0.0.tar.gz
   tar xzf v1.0.0.tar.gz
   cd cockpit-security-dashboard-1.0.0
   make
   sudo make install
   ```
   
   #### 從 COPR 安裝（Fedora）
   ```bash
   sudo dnf copr enable 你的用戶名/cockpit-security-dashboard
   sudo dnf install cockpit-security-dashboard
   ```
   
   ### 📸 截圖
   ![Dashboard](screenshot.png)
   
   ### 🐛 已知問題
   - 無
   
   ### 🙏 感謝
   感謝所有貢獻者和測試者！
   ```

5. 上傳檔案（可選）：
   ```bash
   make dist
   # 上傳 cockpit-security-dashboard-1.0.0.tar.xz
   ```

6. 點擊 "Publish release"

### 步驟 3：發布到 COPR（Fedora）

```bash
# 構建 SRPM
make srpm

# 上傳到 COPR
copr-cli build 你的用戶名/cockpit-security-dashboard \
  cockpit-security-dashboard-1.0.0-1.fc*.src.rpm

# 或使用網頁介面
# https://copr.fedorainfracloud.org/coprs/你的用戶名/cockpit-security-dashboard/builds/
```

### 步驟 4：註冊到 Cockpit 應用列表

```bash
# Clone Cockpit 網站
git clone https://github.com/cockpit-project/cockpit-project.github.io.git
cd cockpit-project.github.io

# 創建分支
git checkout -b add-security-dashboard

# 編輯 _data/applications.yml
# 加入你的應用資訊（參考 CONTRIBUTING.md）

# 提交
git add _data/applications.yml
git commit -m "Add Security Dashboard application"
git push origin add-security-dashboard

# 在 GitHub 開 PR
```

### 步驟 5：宣傳

#### Cockpit 郵件列表
```
收件人：cockpit-devel@lists.fedorahosted.org
主題：[ANN] Security Dashboard 1.0.0 released

Hi everyone,

I'm excited to announce the first release of Security Dashboard for Cockpit!

Security Dashboard provides comprehensive security monitoring and management
capabilities through the Cockpit web interface.

Features:
- Real-time security monitoring
- System information dashboard
- Modern PatternFly UI
- Multi-language support

Installation:
- From COPR: dnf copr enable 你的用戶名/cockpit-security-dashboard
- From source: https://github.com/你的用戶名/cockpit-security-dashboard

Feedback and contributions are welcome!

Best regards,
你的名字
```

#### Reddit
- r/Fedora
- r/selfhosted
- r/linuxadmin

#### Twitter/X
```
🎉 Just released Security Dashboard v1.0.0 for @CockpitProject!

✨ Features:
- Real-time security monitoring
- Modern UI
- Easy to install

Check it out: https://github.com/你的用戶名/cockpit-security-dashboard

#Cockpit #Linux #Security #OpenSource
```

## 🔄 發布後

### 1. 監控反饋
- [ ] 檢查 GitHub Issues
- [ ] 回應郵件列表討論
- [ ] 回應社群媒體評論

### 2. 更新文檔
- [ ] 更新 README 如果有使用者回報混淆
- [ ] 加入 FAQ 如果有常見問題

### 3. 規劃下一版本
- [ ] 收集功能請求
- [ ] 規劃 roadmap
- [ ] 更新 GitHub Projects/Issues

## 📊 版本號規則

使用 [Semantic Versioning](https://semver.org/)：

- **MAJOR.MINOR.PATCH** (例如：1.2.3)
  - **MAJOR**：不相容的 API 變更
  - **MINOR**：向後相容的新功能
  - **PATCH**：向後相容的 bug 修復

範例：
- `1.0.0` - 首次正式發布
- `1.0.1` - Bug 修復
- `1.1.0` - 新增功能
- `2.0.0` - 重大變更

## 🆘 遇到問題？

### 構建失敗
```bash
# 清理並重試
make clean
rm -rf node_modules package-lock.json
npm install
make
```

### 標籤推送失敗
```bash
# 刪除本地標籤
git tag -d v1.0.0

# 刪除遠端標籤（如果已推送）
git push origin :refs/tags/v1.0.0

# 重新創建
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

### COPR 構建失敗
- 檢查 spec 檔案語法
- 確認所有依賴都正確列出
- 查看 COPR 構建日誌

---

## ✅ 完成！

恭喜！你的 Cockpit Security Dashboard 已經成功發布！🎉

記得：
- 定期更新
- 回應使用者反饋
- 持續改進

祝你的專案成功！🚀

