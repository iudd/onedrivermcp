# OneDrive MCP Server 客户端配置指南

## 概述

OneDrive MCP Server 使用双重认证系统：
1. **Microsoft OAuth 2.0** - 获取 Microsoft Graph 访问权限
2. **JWT 访问令牌** - 用于 API 访问控制

## 认证流程

### 步骤 1: 获取 Microsoft Graph 授权

1. 请求授权 URL：
   ```bash
   GET https://onedrivermcp.onrender.com/api/oauth/authorize
   ```

2. 在浏览器中访问返回的授权 URL，完成 Microsoft 账户登录

3. Microsoft 会重定向到回调 URL，带上授权码

### 步骤 2: 交换访问令牌

1. 使用授权码交换访问令牌：
   ```bash
   GET https://onedrivermcp.onrender.com/api/oauth/callback?code=AUTH_CODE_HERE
   ```

2. 服务器会返回 JWT 访问令牌和刷新令牌

### 步骤 3: 使用访问令牌

获取到 JWT 访问令牌后，您可以通过以下方式使用：

#### 方式 1: 在 REST API 中使用

```bash
# 获取文件列表
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://onedrivermcp.onrender.com/api/files?path=/
```

#### 方式 2: 在 MCP 协议中使用

1. 建立 SSE 连接到 `/mcp/sse`

2. 发送初始化事件，包含访问令牌：
   ```json
   {
     "type": "initialize",
     "callId": "unique-id",
     "data": {
       "accessToken": "YOUR_JWT_TOKEN"
     }
   }
   ```

3. 然后可以调用工具：
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

## 简化认证（测试环境）

对于测试环境，服务器提供了一个简化的认证系统：

### 使用测试用户

1. 直接登录测试账户：
   ```bash
   POST https://onedrivermcp.onrender.com/auth/login
   Content-Type: application/json
   
   {
     "email": "user@example.com",
     "password": "password"
   }
   ```

2. 响应中包含访问令牌：
   ```json
   {
     "success": true,
     "data": {
       "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
       "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
       "expiresIn": "15m",
       "user": {
         "id": "user-123",
         "displayName": "演示用户",
         "email": "user@example.com"
       }
     }
   }
   ```

3. 使用返回的访问令牌进行后续操作

## 完整的客户端配置示例

### JavaScript/Node.js 客户端

```javascript
class OneDriveMCPClient {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
    this.accessToken = null;
    this.eventSource = null;
  }

  // 登录获取访问令牌
  async login(email, password) {
    const response = await fetch(`${this.serverUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();
    if (result.success) {
      this.accessToken = result.data.accessToken;
      return true;
    }
    return false;
  }

  // 建立 MCP 连接
  connect() {
    if (!this.accessToken) {
      throw new Error('Please login first');
    }

    this.eventSource = new EventSource(`${this.serverUrl}/mcp/sse`);
    
    this.eventSource.onopen = () => {
      console.log('Connected to MCP server');
      
      // 发送初始化事件
      this.sendEvent({
        type: 'initialize',
        callId: this.generateId(),
        data: {
          accessToken: this.accessToken
        }
      });
    };

    this.eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received:', data);
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
    };
  }

  // 发送事件到服务器
  sendEvent(event) {
    if (!this.eventSource) {
      throw new Error('Not connected to server');
    }

    // 注意：实际实现需要更复杂的处理，
    // 因为 SSE 是单向的，服务器需要特殊的处理方式
    console.log('Sending event:', event);
  }

  // 调用工具
  callTool(toolName, arguments) {
    const event = {
      type: 'tools_call',
      callId: this.generateId(),
      data: {
        tool: toolName,
        arguments: arguments
      }
    };

    this.sendEvent(event);
  }

  // 生成唯一 ID
  generateId() {
    return 'id-' + Math.random().toString(36).substr(2, 16);
  }

  // 断开连接
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}

// 使用示例
const client = new OneDriveMCPClient('https://onedrivermcp.onrender.com');

// 登录
client.login('user@example.com', 'password')
  .then(success => {
    if (success) {
      // 连接到 MCP 服务器
      client.connect();
      
      // 调用工具
      client.callTool('list_files', { path: '/', limit: 10 });
    } else {
      console.error('Login failed');
    }
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

### Claude Desktop 配置

在 Claude Desktop 中配置 OneDrive MCP Server：

1. 编辑 Claude Desktop 配置文件（通常位于 `~/Library/Application Support/Claude/claude_desktop_config.json` 在 macOS 上）

2. 添加以下配置：

```json
{
  "mcpServers": {
    "onedrive": {
      "command": "node",
      "args": ["path/to/onedrive-mcp-server/dist/index.js"],
      "env": {
        "SERVER_URL": "https://onedrivermcp.onrender.com",
        "EMAIL": "user@example.com",
        "PASSWORD": "password"
      }
    }
  }
}
```

或者，如果您想直接连接到已部署的服务器：

```json
{
  "mcpServers": {
    "onedrive": {
      "command": "node",
      "args": ["path/to/custom-client.js"],
      "env": {
        "SERVER_URL": "https://onedrivermcp.onrender.com",
        "EMAIL": "user@example.com",
        "PASSWORD": "password"
      }
    }
  }
}
```

## 令牌刷新

访问令牌默认 15 分钟后过期。您可以使用刷新令牌获取新的访问令牌：

```bash
POST https://onedrivermcp.onrender.com/auth/refresh
Content-Type: application/json

{
  "refreshToken": "YOUR_REFRESH_TOKEN"
}
```

## 注意事项

1. **安全性**：生产环境中请使用强密码和安全的环境变量配置
2. **令牌管理**：确保定期刷新访问令牌，避免令牌过期导致操作失败
3. **错误处理**：实现适当的错误处理，处理网络问题和令牌过期情况
4. **连接管理**：SSE 连接可能会断开，实现自动重连机制