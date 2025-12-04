# 🚀 快速開始指南

恭喜！你的 Cockpit Security Dashboard 已經準備好作為獨立套件發布了！

## 📋 你已經完成的工作

✅ **專案配置**
- 重新命名所有檔案從 `starter-kit` 到 `security-dashboard`
- 更新 `package.json` 為 `security-dashboard`
- 更新 `manifest.json` 標籤為 "Security Dashboard"
- 更新 `metainfo.xml` 為正確的專案資訊

✅ **打包檔案**
- RPM spec 檔案：`packaging/cockpit-security-dashboard.spec.in`
- Arch PKGBUILD：`packaging/arch/PKGBUILD.in`
- Packit 配置：`packit.yaml`

✅ **文檔**
- 專業的 `README.md` - 功能介紹、安裝說明、使用指南
- `CONTRIBUTING.md` - 完整的貢獻和發布指南
- `RELEASE_CHECKLIST.md` - 發布檢查清單

✅ **工具**
- `scripts/prepare-release.sh` - 自動化發布準備腳本

✅ **構建測試**
- 專案可以成功構建（`make` 通過）
- 生成的檔案在 `dist/` 目錄

---

## 🎯 接下來要做什麼？

### 選項 1：立即發布到 GitHub（推薦）

如果你準備好分享你的專案：

```bash
# 1. 檢查所有變更
git status
git diff

# 2. 提交所有變更
git add .
git commit -m "feat: Transform starter-kit into Security Dashboard

- Rename all files and references
- Update package metadata
- Add comprehensive documentation
- Prepare for independent release"

# 3. 推送到 GitHub
git push origin main

# 4. 創建第一個版本
./scripts/prepare-release.sh
```

### 選項 2：繼續開發功能

如果你想先加入更多功能：

1. **開發模式**
   ```bash
   make watch
   # 在瀏覽器開啟 https://localhost:9090
   ```

2. **加入新功能**
   - 編輯 `src/app.tsx`
   - 加入新的 React 組件
   - 使用 PatternFly 組件

3. **測試**
   ```bash
   npm run eslint
   npm run stylelint
   make codecheck
   ```

### 選項 3：本地測試

在發布前先在本地 Cockpit 測試：

```bash
# 1. 構建
make

# 2. 安裝到本地
make devel-install

# 3. 在瀏覽器開啟 Cockpit
# https://localhost:9090
# 你應該會在側邊欄看到 "Security Dashboard"

# 4. 測試完後移除
make devel-uninstall
```

---

## 📦 發布流程概覽

### 第一次發布（v1.0.0）

1. **準備代碼**
   ```bash
   # 確保所有變更已提交
   git status
   
   # 執行測試
   npm run eslint
   npm run stylelint
   make clean && make
   ```

2. **使用發布腳本**
   ```bash
   ./scripts/prepare-release.sh
   # 按照提示輸入版本號和發布說明
   ```

3. **推送到 GitHub**
   ```bash
   git push origin main
   git push origin v1.0.0
   ```

4. **在 GitHub 創建 Release**
   - 前往：https://github.com/你的用戶名/cockpit-security-dashboard/releases/new
   - 選擇標籤 `v1.0.0`
   - 填寫發布說明
   - 上傳 `cockpit-security-dashboard-1.0.0.tar.xz`（可選）
   - 發布！

5. **註冊到 Cockpit 應用列表**
   - Fork https://github.com/cockpit-project/cockpit-project.github.io
   - 編輯 `_data/applications.yml`
   - 加入你的應用資訊
   - 提交 Pull Request

6. **宣傳**（可選）
   - 在 Cockpit 郵件列表宣布
   - 在 Reddit、Twitter 分享
   - 撰寫部落格文章

---

## 🛠️ 常用命令

### 開發
```bash
make watch              # 自動重建（開發模式）
make                    # 構建一次
make clean              # 清理構建檔案
```

### 測試
```bash
npm run eslint          # JavaScript/TypeScript 檢查
npm run eslint:fix      # 自動修復
npm run stylelint       # CSS 檢查
npm run stylelint:fix   # 自動修復
make codecheck          # 執行所有檢查
```

### 安裝
```bash
make devel-install      # 安裝到 ~/.local/share/cockpit/
make devel-uninstall    # 移除開發安裝
sudo make install       # 系統級安裝（/usr/local）
```

### 打包
```bash
make dist               # 創建發布 tarball
make srpm               # 創建 SRPM（Fedora）
make rpm                # 創建 RPM（Fedora）
```

---

## 📚 重要檔案說明

| 檔案 | 用途 |
|------|------|
| `src/app.tsx` | 主要 React 應用程式 |
| `src/manifest.json` | Cockpit 模組定義 |
| `package.json` | NPM 依賴和腳本 |
| `Makefile` | 構建和安裝規則 |
| `org.cockpit_project.security_dashboard.metainfo.xml` | AppStream 元數據 |
| `packaging/cockpit-security-dashboard.spec.in` | RPM 打包規則 |
| `README.md` | 專案說明文檔 |
| `CONTRIBUTING.md` | 貢獻和發布指南 |

---

## 🎨 加入新功能的建議

### 1. 安全監控功能
- 顯示登入失敗次數
- 監控 SELinux 狀態
- 顯示防火牆規則
- 監控開放的端口

### 2. 視覺化
- 使用 Chart.js 顯示趨勢圖
- 加入安全分數儀表板
- 顯示警告和通知

### 3. 整合
- 整合 `ausearch` 查看審計日誌
- 整合 `fail2ban` 狀態
- 整合 `rkhunter` 掃描結果

### 範例程式碼

在 `src/app.tsx` 加入新的卡片：

```typescript
import { Card, CardBody, CardTitle } from "@patternfly/react-core";

// 在 Application 組件中加入：
<Card>
    <CardTitle>Security Status</CardTitle>
    <CardBody>
        <Alert variant="success" title="System is secure" />
        {/* 加入更多內容 */}
    </CardBody>
</Card>
```

---

## 🆘 需要幫助？

### 常見問題

**Q: 構建失敗怎麼辦？**
```bash
make clean
rm -rf node_modules package-lock.json
npm install
make
```

**Q: 如何在遠端機器測試？**
```bash
RSYNC=hostname make watch
```

**Q: 如何更新 Cockpit 共用檔案？**
```bash
# 編輯 Makefile 中的 COCKPIT_REPO_COMMIT
# 然後執行：
rm -rf pkg/lib test/common
make pkg/lib/cockpit-po-plugin.js
```

### 資源連結

- 📖 [Cockpit 開發指南](https://cockpit-project.org/guide/latest/)
- 🎨 [PatternFly React 組件](https://www.patternfly.org/components/all-components)
- 💬 [Cockpit 郵件列表](https://lists.fedorahosted.org/archives/list/cockpit-devel@lists.fedorahosted.org/)
- 🐛 [Cockpit GitHub](https://github.com/cockpit-project/cockpit)

---

## ✅ 檢查清單

在發布前確認：

- [ ] 所有功能都正常運作
- [ ] 程式碼檢查通過（`make codecheck`）
- [ ] README.md 描述清楚
- [ ] 有截圖展示功能
- [ ] LICENSE 檔案正確
- [ ] 版本號已更新
- [ ] Git 標籤已創建
- [ ] GitHub Release 已發布

---

## 🎉 完成！

你的 Cockpit Security Dashboard 現在已經是一個完整的、可發布的獨立套件了！

**記得：**
- 定期更新依賴（`npm update`）
- 回應使用者的 Issues 和 PR
- 持續改進功能
- 享受開源貢獻的樂趣！

**祝你的專案成功！** 🚀

---

*有任何問題？查看 `CONTRIBUTING.md` 獲取更詳細的指南。*

