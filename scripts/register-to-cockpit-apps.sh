#!/bin/bash
# 註冊到 Cockpit 應用列表的輔助腳本

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🌐 註冊到 Cockpit 應用列表${NC}"
echo ""

# 檢查是否已經 clone 了 cockpit-project.github.io
COCKPIT_WEBSITE_DIR="../cockpit-project.github.io"

if [ -d "$COCKPIT_WEBSITE_DIR" ]; then
    echo -e "${YELLOW}⚠️  發現已存在的 cockpit-project.github.io 目錄${NC}"
    read -p "是否使用現有目錄？(y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "請手動處理後重新執行此腳本"
        exit 1
    fi
    cd "$COCKPIT_WEBSITE_DIR"
    git pull origin main
else
    echo -e "${BLUE}📥 Clone cockpit-project.github.io...${NC}"
    echo ""
    echo -e "${YELLOW}請先在 GitHub 上 Fork 這個倉庫：${NC}"
    echo "https://github.com/cockpit-project/cockpit-project.github.io"
    echo ""
    read -p "已經 Fork 了嗎？(y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo -e "${YELLOW}請按照以下步驟操作：${NC}"
        echo "1. 前往 https://github.com/cockpit-project/cockpit-project.github.io"
        echo "2. 點擊右上角的 'Fork' 按鈕"
        echo "3. Fork 到你的帳號"
        echo "4. 完成後重新執行此腳本"
        exit 0
    fi
    
    echo ""
    echo -e "${BLUE}請輸入你的 GitHub 用戶名：${NC}"
    read -p "用戶名: " GITHUB_USERNAME
    
    cd ..
    git clone "git@github.com:${GITHUB_USERNAME}/cockpit-project.github.io.git"
    cd cockpit-project.github.io
fi

# 創建新分支
BRANCH_NAME="add-security-dashboard"
echo ""
echo -e "${BLUE}📝 創建分支 ${BRANCH_NAME}...${NC}"

git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"

# 準備要加入的內容
APP_ENTRY="
- name: Security Dashboard
  package: cockpit-security-dashboard
  description: Security monitoring and management dashboard for Cockpit
  url: https://github.com/XintiWu/cockpit-SecurityGuard
  category: system
  tags:
    - security
    - monitoring
    - dashboard
  maintainer:
    name: Xinti Wu
    github: XintiWu"

echo ""
echo -e "${YELLOW}將要加入的內容：${NC}"
echo "$APP_ENTRY"
echo ""

# 檢查 _data/applications.yml 是否存在
if [ ! -f "_data/applications.yml" ]; then
    echo -e "${RED}❌ 錯誤：找不到 _data/applications.yml${NC}"
    exit 1
fi

# 檢查是否已經存在
if grep -q "cockpit-security-dashboard" "_data/applications.yml"; then
    echo -e "${YELLOW}⚠️  Security Dashboard 似乎已經在列表中了${NC}"
    read -p "是否覆蓋？(y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "已取消"
        exit 0
    fi
fi

echo ""
echo -e "${BLUE}📝 編輯 _data/applications.yml...${NC}"
echo ""
echo -e "${YELLOW}注意：你需要手動編輯這個檔案${NC}"
echo "檔案位置：_data/applications.yml"
echo ""
echo "請在適當的位置加入以下內容："
echo ""
echo "$APP_ENTRY"
echo ""
echo -e "${YELLOW}建議加在 'system' 類別的應用中${NC}"
echo ""
read -p "按 Enter 鍵打開編輯器..."

# 打開編輯器
if command -v code &> /dev/null; then
    code "_data/applications.yml"
elif command -v vim &> /dev/null; then
    vim "_data/applications.yml"
else
    nano "_data/applications.yml"
fi

echo ""
read -p "已經編輯完成了嗎？(y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "請完成編輯後重新執行此腳本"
    exit 0
fi

# 提交變更
echo ""
echo -e "${BLUE}💾 提交變更...${NC}"

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

echo ""
echo -e "${GREEN}✅ 變更已提交！${NC}"
echo ""

# 推送分支
echo -e "${BLUE}📤 推送分支到 GitHub...${NC}"
git push origin "$BRANCH_NAME"

echo ""
echo -e "${GREEN}✅ 分支已推送！${NC}"
echo ""

# 提供 PR 連結
echo -e "${BLUE}🎯 下一步：創建 Pull Request${NC}"
echo ""
echo "請前往以下網址創建 Pull Request："
echo ""
echo -e "${GREEN}https://github.com/cockpit-project/cockpit-project.github.io/compare/main...你的用戶名:${BRANCH_NAME}${NC}"
echo ""
echo "或者直接前往你的 Fork："
echo -e "${GREEN}https://github.com/你的用戶名/cockpit-project.github.io${NC}"
echo ""
echo "GitHub 會自動提示你創建 Pull Request"
echo ""
echo -e "${BLUE}PR 標題建議：${NC}"
echo "Add Security Dashboard application"
echo ""
echo -e "${BLUE}PR 描述建議：${NC}"
echo "This PR adds Security Dashboard, a comprehensive security monitoring"
echo "and management dashboard for Cockpit."
echo ""
echo "Repository: https://github.com/XintiWu/cockpit-SecurityGuard"
echo ""
echo -e "${GREEN}🎉 完成！${NC}"

