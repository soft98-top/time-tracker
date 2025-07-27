# GitHub Pages 自动化部署配置

## 📋 配置概览

本项目已完成 GitHub Pages 自动化部署配置，支持代码推送后自动构建和部署。

## 🔧 已完成的配置

### 1. Vite 配置更新
- ✅ 更新 `vite.config.ts` 支持 GitHub Pages 的 base path
- ✅ 生产环境自动设置正确的资源路径

### 2. GitHub Actions 工作流
- ✅ 创建 `.github/workflows/deploy.yml` 自动化部署工作流
- ✅ 支持自动测试、构建和部署
- ✅ 仅在 main 分支推送时触发部署

### 3. Package.json 配置
- ✅ 添加 `homepage` 字段指向 GitHub Pages 地址
- ✅ 新增部署相关脚本命令
- ✅ 配置生产环境构建优化

### 4. 部署脚本
- ✅ `deploy-github.sh` - 一键部署脚本
- ✅ `check-deployment.sh` - 部署状态检查脚本
- ✅ 自动化提交和推送流程

## 🚀 使用方法

### 快速部署
```bash
# 一键部署（推荐）
npm run deploy:github

# 检查部署状态
npm run deploy:check
```

### 手动部署
```bash
# 1. 提交更改
git add .
git commit -m "your commit message"

# 2. 推送到 GitHub
git push origin main

# 3. GitHub Actions 会自动处理后续部署
```

## 🌐 访问地址

- **生产环境**: https://soft98-top.github.io/time-tracker
- **GitHub 仓库**: https://github.com/soft98-top/time-tracker
- **Actions 状态**: https://github.com/soft98-top/time-tracker/actions

## ⚙️ GitHub Pages 设置

确保在 GitHub 仓库设置中启用 GitHub Pages：

1. 进入仓库设置页面
2. 找到 "Pages" 选项
3. Source 选择 "GitHub Actions"
4. 保存设置

## 🔍 部署流程

1. **触发条件**: 推送到 `main` 分支
2. **测试阶段**: 运行完整测试套件
3. **构建阶段**: 使用 Vite 构建生产版本
4. **部署阶段**: 自动部署到 GitHub Pages
5. **完成通知**: 部署完成后可通过 URL 访问

## 📊 监控和调试

### 查看部署状态
- GitHub Actions 页面显示详细的构建日志
- 每次部署都会生成构建报告
- 支持失败时的错误诊断

### 常见问题排查
1. **构建失败**: 检查 Actions 日志中的错误信息
2. **页面无法访问**: 确认 GitHub Pages 设置正确
3. **资源加载失败**: 检查 base path 配置

## 🎯 下一步操作

1. 提交所有配置文件到 Git
2. 推送到 GitHub 触发首次部署
3. 验证部署结果和网站功能
4. 根据需要调整配置

## 📝 注意事项

- 首次部署可能需要 5-10 分钟
- 后续部署通常在 2-5 分钟内完成
- 确保所有测试通过才会进行部署
- 支持 PWA 功能和离线访问