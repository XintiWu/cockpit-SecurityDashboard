#!/bin/bash
# 準備發布的輔助腳本

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Cockpit Security Dashboard - 發布準備腳本${NC}"
echo ""

# 檢查是否在 main 分支
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${YELLOW}⚠️  警告：你不在 main 分支（當前：$CURRENT_BRANCH）${NC}"
    read -p "是否繼續？(y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 檢查是否有未提交的變更
if ! git diff-index --quiet HEAD --; then
    echo -e "${RED}❌ 錯誤：有未提交的變更${NC}"
    echo "請先提交或暫存所有變更"
    exit 1
fi

# 獲取當前版本
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}當前版本：${NC}$CURRENT_VERSION"

# 詢問新版本號
echo ""
echo -e "${YELLOW}請輸入新版本號（格式：MAJOR.MINOR.PATCH）${NC}"
read -p "新版本號: " NEW_VERSION

# 驗證版本號格式
if ! [[ $NEW_VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}❌ 錯誤：版本號格式不正確${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}準備發布版本：${GREEN}$NEW_VERSION${NC}"
echo ""

# 執行檢查
echo -e "${BLUE}📋 執行發布前檢查...${NC}"
echo ""

echo -e "${YELLOW}1. 執行程式碼檢查...${NC}"
if npm run eslint > /dev/null 2>&1; then
    echo -e "${GREEN}✅ ESLint 檢查通過${NC}"
else
    echo -e "${RED}❌ ESLint 檢查失敗${NC}"
    exit 1
fi

if npm run stylelint > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Stylelint 檢查通過${NC}"
else
    echo -e "${RED}❌ Stylelint 檢查失敗${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}2. 執行構建測試...${NC}"
make clean > /dev/null 2>&1
if make > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 構建成功${NC}"
else
    echo -e "${RED}❌ 構建失敗${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}3. 測試 dist tarball...${NC}"
if make dist > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Tarball 生成成功${NC}"
else
    echo -e "${RED}❌ Tarball 生成失敗${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ 所有檢查通過！${NC}"
echo ""

# 詢問是否繼續
read -p "是否繼續創建發布標籤？(y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "已取消"
    exit 0
fi

# 更新 package.json 版本
echo ""
echo -e "${BLUE}更新 package.json...${NC}"
npm version $NEW_VERSION --no-git-tag-version
git add package.json

# 提交版本變更
git commit -m "chore: Bump version to $NEW_VERSION"

# 創建標籤
echo ""
echo -e "${BLUE}創建 Git 標籤...${NC}"
echo "請輸入發布說明（按 Ctrl+D 結束）："
echo ""

RELEASE_NOTES=$(cat)

git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION

$RELEASE_NOTES"

echo ""
echo -e "${GREEN}✅ 標籤創建成功！${NC}"
echo ""

# 顯示下一步
echo -e "${BLUE}📝 下一步：${NC}"
echo ""
echo "1. 檢查標籤："
echo -e "   ${YELLOW}git show v$NEW_VERSION${NC}"
echo ""
echo "2. 推送到 GitHub："
echo -e "   ${YELLOW}git push origin main${NC}"
echo -e "   ${YELLOW}git push origin v$NEW_VERSION${NC}"
echo ""
echo "3. 在 GitHub 創建 Release："
echo -e "   ${YELLOW}https://github.com/你的用戶名/cockpit-security-dashboard/releases/new${NC}"
echo ""
echo "4. 發布到 COPR："
echo -e "   ${YELLOW}make srpm${NC}"
echo -e "   ${YELLOW}copr-cli build 你的用戶名/cockpit-security-dashboard *.src.rpm${NC}"
echo ""
echo -e "${GREEN}🎉 準備完成！${NC}"

