#!/bin/bash

# 检查部署状态脚本
echo "🔍 检查 GitHub Pages 部署状态..."

# 检查 GitHub Actions 状态
echo "📊 GitHub Actions 工作流状态:"
echo "   访问: https://github.com/soft98-top/time-tracker/actions"

# 检查网站可访问性
echo "🌐 检查网站可访问性..."
if curl -s -o /dev/null -w "%{http_code}" https://soft98-top.github.io/time-tracker | grep -q "200"; then
    echo "✅ 网站可正常访问: https://soft98-top.github.io/time-tracker"
else
    echo "⚠️  网站暂时无法访问，可能正在部署中..."
    echo "   请稍后重试或检查 GitHub Actions 状态"
fi

# 显示有用的链接
echo ""
echo "📋 有用的链接:"
echo "   🏠 项目主页: https://github.com/soft98-top/time-tracker"
echo "   🚀 GitHub Actions: https://github.com/soft98-top/time-tracker/actions"
echo "   🌐 部署网站: https://soft98-top.github.io/time-tracker"
echo "   ⚙️  Pages 设置: https://github.com/soft98-top/time-tracker/settings/pages"