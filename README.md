# 提示词优化器 (Prompt Optimizer)

这是一个简单的前后端分离应用，旨在帮助用户优化他们提供给大语言模型（LLM）的提示词（Prompt）。用户输入原始提示词和可选的要求，应用会调用智谱 AI (Zhipu AI) 的 API 来生成三个优化后的提示词版本。



## 📸 截图
![image](doc/demo.png)

## ✨ 功能

*   接收用户输入的原始提示词和优化要求。
*   调用后端服务，该服务安全地与智谱 AI API 交互。
*   展示由 AI 生成的三个优化后的提示词。
*   提供一键复制优化后提示词的功能。

## 🛠️ 技术栈

*   **前端:** HTML, CSS, JavaScript (原生)
*   **后端:** Node.js, Express
*   **API:** 智谱 AI (GLM-4-Flash)
*   **依赖管理:** npm
*   **其他库:**
    *   `node-fetch`: 用于在后端发送 HTTP 请求。
    *   `dotenv`: 用于加载环境变量。
    *   `jsrsasign`: 用于生成 JWT Token 以验证智谱 API 请求。
    *   `cors`: 用于处理跨域资源共享。

## 🚀 快速开始

### 1. 先决条件

*   安装 [Node.js](https://nodejs.org/) (推荐 LTS 版本)
*   拥有一个智谱 AI 的 API Key ([申请地址](https://open.bigmodel.cn/))

### 2. 安装依赖

在项目根目录下打开终端，运行以下命令安装后端依赖：

```bash
npm install
```
### 3. 配置环境

*   在项目根目录创建一个名为 `.env` 的文件。
*   在 `.env` 文件中添加你的智谱 API Key，格式如下 (请将 `你的ID.你的Secret` 替换为你自己的 API Key)：

    ```env
    ZHIPU_API_KEY=你的ID.你的Secret
    ```

### 4. 运行后端服务

在终端中运行以下命令启动后端 Express 服务器：

```bash
node server.js
```

服务默认运行在 http://localhost:3000 。

### 5. 运行前端

*   直接在浏览器中打开 `index.html` 文件。
*   **重要**: 为了让前端能够访问后端 API，请确保 `script.js` 文件中的 `BACKEND_API_ENDPOINT` 指向你的后端服务地址。对于本地开发，可以取消注释并使用绝对路径：

    ```javascript
    // const BACKEND_API_ENDPOINT = '/api/optimize-prompt'; // 生产环境或使用反向代理时
    const BACKEND_API_ENDPOINT = 'http://localhost:3000/api/optimize-prompt'; // 本地开发时
    ```

### 6. 宝塔面板部署

#### 6.1 环境准备

1. 确保服务器已安装宝塔面板
2. 在宝塔面板中安装以下软件：
   - Nginx（推荐1.20或更高版本）
   - Node.js（推荐v16 LTS或更高版本）
   - PM2管理器（可通过命令 `npm install -g pm2` 安装）

#### 6.2 上传项目文件

1. 在宝塔面板中创建网站：
   - 点击"网站"→"添加站点"
   - 填写域名（如：prompt.yourdomain.com）
   - 选择纯静态，PHP版本选择纯静态
   - SSL证书根据需要配置

2. 上传项目文件：
   - 进入网站根目录（如：/www/wwwroot/prompt.yourdomain.com/）
   - 上传项目所有文件到此目录
   - 确保文件权限正确（建议755或750）

#### 6.3 安装依赖

1. 在宝塔面板中打开终端，进入项目目录：
```bash
cd /www/wwwroot/prompt.yourdomain.com/
```

2. 安装项目依赖：
```bash
npm install
```

#### 6.4 配置环境变量

1. 在项目根目录创建 `.env` 文件：
```bash
nano .env
```

2. 添加以下配置（替换为你的值）：
```env
ZHIPU_API_KEY=你的ID.你的Secret
NODE_ENV=production
```

#### 6.5 配置 PM2

1. 创建 PM2 配置文件 `ecosystem.config.js`：
```javascript
module.exports = {
  apps: [{
    name: "prompt-optimizer",
    script: "server.js",
    env: {
      NODE_ENV: "production",
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "1G"
  }]
}
```

2. 使用 PM2 启动服务：
```bash
pm2 start ecosystem.config.js
```

3. 设置开机自启：
```bash
pm2 save
pm2 startup
```

#### 6.6 配置 Nginx

1. 修改网站的 Nginx 配置（在宝塔面板中）：
   - 点击"网站"→找到你的站点→"设置"→"配置文件"
   - 修改配置如下：

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name prompt.yourdomain.com; # 替换为你的域名
    
    # SSL 配置（如果有）
    # listen 443 ssl;
    # ssl_certificate /path/to/cert.pem;
    # ssl_certificate_key /path/to/key.pem;
    
    location / {
        root /www/wwwroot/prompt.yourdomain.com;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

2. 重启 Nginx：
```bash
nginx -t && nginx -s reload
```

#### 6.7 检查部署

1. 检查服务状态：
```bash
pm2 status
```

2. 查看日志：
```bash
pm2 logs prompt-optimizer
```

3. 访问你的域名测试是否部署成功

#### 6.8 常见问题

1. 502 错误：
   - 检查 Node.js 服务是否正常运行（pm2 status）
   - 检查端口是否被占用（netstat -tlnp）
   - 检查日志文件（pm2 logs）

2. 跨域问题：
   - 确认 server.js 中的 CORS 配置正确
   - 检查 Nginx 配置是否正确转发请求

3. 文件权限问题：
   - 确保项目目录权限正确：
```bash
chown -R www:www /www/wwwroot/prompt.yourdomain.com/
chmod -R 755 /www/wwwroot/prompt.yourdomain.com/
```

### 7. 使用

在打开的网页中输入你的提示词和要求，点击“生成优化提示词”按钮即可。

## 📝 注意

*   请妥善保管你的 `.env` 文件和 API Key，不要将其提交到版本控制系统（项目中已包含 `.gitignore` 文件来忽略 `.env`）。
*   前端 `script.js` 中的 `systemPrompt` 变量定义了优化任务的具体指示，可以根据需要调整。
*   后端使用了 `cors` 中间件允许所有来源的请求，在生产环境中应配置更严格的规则。
*   API请求地址为 `/api/optimize-prompt`，请确保在前端代码中正确配置。
