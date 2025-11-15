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