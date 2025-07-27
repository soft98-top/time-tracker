# 部署指南

## 快速部署

### 使用部署脚本

```bash
# 运行自动部署脚本
./deploy.sh
```

部署脚本会自动执行以下步骤：
1. 清理之前的构建文件
2. 安装依赖
3. 运行测试
4. 代码检查
5. 构建生产版本
6. 显示构建结果

### 手动部署

```bash
# 1. 安装依赖
npm ci

# 2. 运行测试（可选）
npm run test:run

# 3. 代码检查（可选）
npm run lint

# 4. 构建生产版本
npm run build

# 5. 预览构建结果（可选）
npm run preview
```

## 部署平台

### 静态网站托管

#### Netlify
1. 连接 GitHub 仓库
2. 设置构建命令：`npm run build`
3. 设置发布目录：`dist`
4. 部署设置：
   ```
   Build command: npm run build
   Publish directory: dist
   ```

#### Vercel
1. 导入 GitHub 仓库
2. 框架预设：Vite
3. 构建命令：`npm run build`
4. 输出目录：`dist`

#### GitHub Pages
1. 在仓库设置中启用 GitHub Pages
2. 使用 GitHub Actions 自动部署：

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build
      run: npm run build
      
    - name: Deploy
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
```

### 服务器部署

#### Nginx 配置

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    root /path/to/dist;
    index index.html;
    
    # PWA 支持
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 缓存静态资源
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # PWA manifest 和 service worker
    location ~* \.(webmanifest|json)$ {
        expires 0;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    
    location /sw.js {
        expires 0;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
```

#### Apache 配置

```apache
# .htaccess
RewriteEngine On
RewriteBase /

# Handle Angular and Vue.js routes
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Cache static assets
<filesMatch "\.(css|js|png|jpg|jpeg|gif|ico|svg)$">
    ExpiresActive On
    ExpiresDefault "access plus 1 year"
</filesMatch>

# Don't cache service worker and manifest
<filesMatch "\.(webmanifest|json)$">
    ExpiresActive On
    ExpiresDefault "access plus 0 seconds"
</filesMatch>

<files "sw.js">
    ExpiresActive On
    ExpiresDefault "access plus 0 seconds"
</files>
```

## 环境配置

### 生产环境变量

创建 `.env.production` 文件：

```env
VITE_APP_TITLE=灵活番茄时钟
VITE_APP_VERSION=1.0.0
VITE_APP_DESCRIPTION=一个灵活的番茄工作法时间管理工具
```

### 构建优化

#### Vite 配置优化

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    // 启用压缩
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    
    // 代码分割
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
        },
      },
    },
    
    // 报告压缩大小
    reportCompressedSize: true,
    
    // Chunk 大小警告限制
    chunkSizeWarningLimit: 1000,
  },
});
```

## 性能优化

### 构建分析

```bash
# 分析构建包大小
npm run build:analyze
```

### 缓存策略

1. **静态资源**：长期缓存（1年）
2. **HTML文件**：不缓存或短期缓存
3. **Service Worker**：不缓存
4. **Manifest文件**：不缓存

### CDN 配置

如果使用 CDN，确保：
1. 正确设置 CORS 头
2. 配置适当的缓存策略
3. 启用 Gzip/Brotli 压缩

## 监控和维护

### 健康检查

创建简单的健康检查端点：

```javascript
// 在 index.html 中添加
<script>
  // 简单的健康检查
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
  
  // 错误监控
  window.addEventListener('error', function(e) {
    console.error('Application error:', e.error);
  });
</script>
```

### 更新策略

1. **自动更新**：PWA 会自动检查更新
2. **手动更新**：用户可以手动刷新页面
3. **版本控制**：在构建时注入版本信息

### 备份策略

1. **代码备份**：使用 Git 版本控制
2. **构建产物备份**：保存每次构建的 dist 目录
3. **配置备份**：备份服务器配置文件

## 故障排除

### 常见问题

1. **白屏问题**：检查路由配置和构建路径
2. **资源加载失败**：检查服务器配置和 CORS 设置
3. **PWA 不工作**：检查 HTTPS 和 Service Worker 注册
4. **缓存问题**：清除浏览器缓存或更新 Service Worker

### 调试工具

1. **浏览器开发者工具**：检查网络请求和控制台错误
2. **Lighthouse**：分析性能和 PWA 合规性
3. **PWA Builder**：验证 PWA 功能

## 安全考虑

### HTTPS

- 生产环境必须使用 HTTPS
- PWA 功能需要 HTTPS 支持
- 配置 SSL 证书

### 内容安全策略 (CSP)

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data:;">
```

### 其他安全头

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

---

**需要帮助？** 请查看具体平台的部署文档或联系技术支持。