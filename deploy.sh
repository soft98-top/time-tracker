#!/bin/bash

# 部署脚本 - 灵活番茄时钟

set -e

echo "🍅 开始构建灵活番茄时钟生产版本..."

# 清理之前的构建
echo "🧹 清理之前的构建文件..."
rm -rf dist/

# 安装依赖
echo "📦 安装依赖..."
npm ci

# 运行测试（可选）
if [ "$SKIP_TESTS" != "true" ]; then
  echo "🧪 运行测试..."
  npm run test:run || echo "⚠️ 测试失败，但继续构建..."
fi

# 运行 lint 检查（可选）
if [ "$SKIP_LINT" != "true" ]; then
  echo "🔍 运行代码检查..."
  npm run lint || echo "⚠️ 代码检查失败，但继续构建..."
fi

# 构建生产版本
echo "🏗️ 构建生产版本..."
npm run build:prod

# 检查构建结果
echo "📊 构建结果:"
ls -la dist/
echo ""
echo "📈 文件大小统计:"
du -sh dist/*

echo "✅ 构建完成！"
echo ""
echo "🚀 部署选项:"
echo "1. 本地预览: npm run preview"
echo "2. 上传 dist/ 目录到你的 Web 服务器"
echo "3. 使用 GitHub Pages、Netlify、Vercel 等平台部署"
echo ""
echo "📱 PWA 功能已启用，用户可以将应用安装到设备上"
echo ""
echo "💡 提示:"
echo "- 跳过测试: SKIP_TESTS=true ./deploy.sh"
echo "- 跳过代码检查: SKIP_LINT=true ./deploy.sh"
echo "- 跳过所有检查: SKIP_TESTS=true SKIP_LINT=true ./deploy.sh"