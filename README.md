# OneDrive MCP Server

一个基于 MCP (Model Context Protocol) 协议的 OneDrive 文件管理服务器，支持通过 AI 智能管理 OneDrive 云盘内容。

## 🚀 特性

- **MCP 协议支持**: 完全兼容 MCP 2024-11-05 规范
- **SSE 流式通信**: 支持实时双向通信和进度跟踪
- **OneDrive 集成**: 完整的文件管理功能
- **现代化技术栈**: Node.js + TypeScript + Express
- **企业级安全**: OAuth 2.0 + JWT + 权限控制
- **云原生部署**: 专为 Render.com 优化

## 📋 功能列表

### MCP 工具
- `list_files` - 列出文件和文件夹
- `read_file` - 读取文件内容
- `write_file` - 写入或创建文件
- `search_files` - 搜索文件
- `create_folder` - 创建文件夹
- `delete_file` - 删除文件

### REST API
- 文件列表和详情
- 文件上传和下载
- 文件搜索和过滤
- 批量操作支持
- 用户认证管理

## 🛠️ 快速开始

### 环境要求
- Node.js 18+
- OneDrive 应用注册

### 1. 克隆项目
```bash
git clone <repository-url>
cd onedrive-mcp-server
```

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境变量
复制 `.env.example` 为 `.env` 并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# Microsoft Graph OAuth配置 (必须配置)
MICROSOFT_CLIENT_ID=your-azure-ad-app-client-id
MICROSOFT_CLIENT_SECRET=your-azure-ad-app-client-secret
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/oauth/callback
MICROSOFT_TENANT_ID=common

# JWT配置
JWT_SECRET=your-strong-jwt-secret-here
JWT_REFRESH_SECRET=your-strong-refresh-secret-here

# 服务器配置
PORT=3000
NODE_ENV=development
```

#### Microsoft Graph 应用注册
1. 访问 [Azure Portal](https://portal.azure.com)
2. 转到 "Azure Active Directory" > "应用注册"
3. 点击 "新注册"
4. 输入应用名称，选择支持的账户类型
5. 在 "重定向 URI" 中添加 `http://localhost:3000/api/oauth/callback`
6. 注册完成后，记下应用程序(客户端) ID
7. 转到 "证书和机密"，创建新的客户端机密
8. 将客户端ID和客户端机密配置到环境变量中
9. 转到 "API权限"，添加以下权限：
   - `Files.ReadWrite`
   - `User.Read`
   - `offline_access` (用于刷新令牌)

### 4. 构建项目
```bash
npm run build
```

### 5. 启动服务器
```bash
npm start
```

## 🔐 认证系统

本项目实现了双重令牌认证系统，确保安全性和灵活性：

### 令牌架构
1. **客户端认证**: 使用JWT令牌进行API访问控制
2. **OneDrive访问**: 使用Microsoft Graph令牌访问OneDrive资源
3. **自动刷新**: 自动刷新过期的Microsoft Graph令牌

### OAuth 2.0 授权流程
1. 客户端请求授权URL: `GET /api/oauth/authorize`
2. 用户在浏览器中完成Microsoft授权
3. Microsoft重定向到回调URL: `GET /api/oauth/callback?code=...`
4. 服务器使用授权码交换Microsoft Graph令牌
5. 服务器生成JWT令牌返回给客户端
6. 客户端使用JWT令牌访问API

### 认证示例
```javascript
// 1. 获取授权URL
const response = await fetch('/api/oauth/authorize');
const { authorizationUrl } = await response.json();

// 2. 用户完成授权后，使用返回的访问令牌
const tokenResponse = await fetch('/api/oauth/callback?code=...');
const { accessToken } = await tokenResponse.json();

// 3. 使用JWT访问API
const filesResponse = await fetch('/api/files', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

## 🧪 测试

### OAuth流程测试
运行OAuth流程测试：
```bash
node test-oauth.js
```

### 快速测试
Windows用户可以直接运行：
```bash
start-and-test.bat
```

### 认证测试
运行基础认证测试：
```bash
node test-auth.js
```

## 📖 使用指南

### MCP协议使用
1. 建立SSE连接：`GET /mcp/sse`
2. 发送初始化事件：
```json
{
  "type": "initialize",
  "callId": "unique-id",
  "data": {
    "accessToken": "your-jwt-token"
  }
}
```
3. 调用工具：
```json
{
  "type": "tools_call",
  "callId": "unique-id",
  "data": {
    "tool": "list_files",
    "arguments": {
      "path": "/",
      "limit": 10
    }
  }
}
```

### REST API使用
所有REST API都需要在请求头中包含JWT令牌：
```
Authorization: Bearer your-jwt-token
```

详细认证文档请参考 [AUTH-README.md](./AUTH-README.md)

```env
# OneDrive App Configuration
ONEDRIVE_CLIENT_ID=your_client_id_here
ONEDRIVE_CLIENT_SECRET=your_client_secret_here
ONEDRIVE_REDIRECT_URI=http://localhost:3000/api/auth/callback

# JWT Configuration
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3000
NODE_ENV=development

# MCP Configuration
MCP_API_KEY_PREFIX=od_mcp_
MCP_MAX_CONNECTIONS=100

# Logging
LOG_LEVEL=info
```

### 4. 注册 OneDrive 应用
1. 访问 [Microsoft Azure Portal](https://portal.azure.com)
2. 创建新的应用注册
3. 配置重定向 URI: `http://localhost:3000/api/auth/callback`
4. 添加 API 权限: `Files.Read`, `Files.ReadWrite`, `User.Read`
5. 获取 Client ID 和 Client Secret

### 5. 启动开发服务器
```bash
npm run dev
```

服务器将在 http://localhost:3000 启动

## 📡 API 文档

### MCP SSE 端点
```
GET /mcp/sse
```

### REST API 端点
- `GET /api/auth/onedrive` - 启动 OneDrive 认证
- `GET /api/files` - 获取文件列表
- `POST /api/files` - 上传文件
- `GET /api/search` - 搜索文件
- `DELETE /api/files/:id` - 删除文件

### 健康检查
```
GET /health
GET /mcp/health
```

## 🔧 开发

### 项目结构
```
src/
├── server.ts          # 服务器入口
├── types/             # TypeScript 类型定义
├── services/          # 业务逻辑服务
├── routes/            # API 路由
├── middleware/        # 中间件
└── utils/             # 工具函数
```

### 开发命令
```bash
npm run dev      # 开发模式
npm run build    # 构建项目
npm run start    # 生产模式
npm run test     # 运行测试
npm run lint     # 代码检查
npm run format   # 代码格式化
```

## 🌐 部署

### Render.com 部署
1. 连接 GitHub 仓库
2. 配置环境变量
3. 设置构建命令: `npm run build`
4. 设置启动命令: `npm run start`

### 环境变量配置
```env
ONEDRIVE_CLIENT_ID=your_production_client_id
ONEDRIVE_CLIENT_SECRET=your_production_secret
ONEDRIVE_REDIRECT_URI=https://your-app.onrender.com/api/auth/callback
JWT_SECRET=your_secure_jwt_secret
NODE_ENV=production
```

## 🔒 安全特性

- **OAuth 2.0 认证**: 安全的第三方认证
- **JWT Token**: 无状态身份验证
- **请求限流**: 防止 API 滥用
- **CORS 配置**: 跨域安全控制
- **Helmet 安全头**: 增强 HTTP 安全

## 📊 监控和日志

- Winston 结构化日志
- 健康检查端点
- 连接状态监控
- 错误追踪和报告

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

- [MCP Protocol](https://modelcontextprotocol.io)
- [Microsoft Graph API](https://docs.microsoft.com/graph)
- [Express.js](https://expressjs.com)
- [Render.com](https://render.com)