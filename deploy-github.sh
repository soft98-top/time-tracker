#!/bin/bash

# GitHub Pages 部署脚本
echo "🚀 开始部署到 GitHub Pages..."

# 检查是否有未提交的更改
if [[ -n $(git status --porcelain) ]]; then
    echo "📝 发现未提交的更改，正在提交..."
    git add .
    git commit -m "feat: 配置 GitHub Pages 自动部署"
fi

# 推送到 GitHub
echo "📤 推送代码到 GitHub..."
git push origin main

echo "✅ 部署完成！"
echo "🌐 访问地址: https://soft98-top.github.io/time-tracker"
echo "⏳ 请等待 GitHub Actions 完成构建和部署（通常需要 2-5 分钟）"