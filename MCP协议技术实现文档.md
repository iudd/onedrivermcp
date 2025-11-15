# OneDrive MCP 协议技术实现文档

## 1. MCP 协议概述

### 1.1 协议基础
- **协议版本**: MCP 2024-11-05
- **传输协议**: HTTP/1.1 + Server-Sent Events (SSE)
- **数据格式**: JSON Schema
- **认证方式**: Bearer Token + API Key

### 1.2 核心特性
- **双向流式通信**: 支持实时工具调用和结果返回
- **进度跟踪**: 实时显示操作进度
- **错误处理**: 完善的错误信息和重试机制
- **会话管理**: 长连接会话保持和自动重连

## 2. SSE 流式实现架构

### 2.1 服务器端架构
```typescript
interface MCPServer {
  // SSE 连接管理
  sseConnections: Map<string, SSEClient>;
  
  // 工具注册
  tools: Map<string, MCPTool>;
  
  // 会话管理
  sessions: Map<string, MCPSession>;
}

interface SSEClient {
  id: string;
  response: ServerResponse;
  lastActivity: Date;
  apiKey: string;
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  execute: (args: any, session: MCPSession) => AsyncIterable<MCPResult>;
}
```

### 2.2 客户端架构
```typescript
interface MCPClient {
  // SSE 连接
  eventSource: EventSource | null;
  
  // 回调管理
  callbacks: Map<string, Callback>;
  
  // 重连机制
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  
  // 工具调用队列
  toolQueue: Array<ToolCall>;
}

interface Callback {
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  progress?: (progress: ProgressUpdate) => void;
}
```

## 3. SSE 协议详细规范

### 3.1 连接建立流程
```
1. 客户端发起 SSE 连接请求
GET /mcp/sse
Authorization: Bearer {api_key}
Accept: text/event-stream

2. 服务端响应连接
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

3. 服务端发送初始化事件
event: initialized
data: {
  "protocolVersion": "2024-11-05",
  "capabilities": {
    "tools": ["list_files", "read_file", "write_file", "search_files"],
    "resources": ["file", "folder"],
    "rootUri": "onedrive://"
  },
  "serverInfo": {
    "name": "OneDrive MCP Server",
    "version": "1.0.0"
  }
}
```

### 3.2 事件类型定义

#### 3.2.1 客户端发送事件
```typescript
interface ClientEvent {
  type: 'tools_call' | 'resources_list' | 'resources_read' | 'ping';
  callId: string;
  data?: any;
}

// 工具调用事件
interface ToolsCallEvent extends ClientEvent {
  type: 'tools_call';
  data: {
    name: string;           // 工具名称
    arguments: any;         // 工具参数
    metadata?: {
      requestId?: string;   // 请求ID（可选）
      timestamp?: number;   // 时间戳
    };
  };
}
```

#### 3.2.2 服务端发送事件
```typescript
interface ServerEvent {
  type: 'initialized' | 'tool_result' | 'progress' | 'error' | 'pong';
  callId: string;
  data: any;
}

// 工具结果事件
interface ToolResultEvent extends ServerEvent {
  type: 'tool_result';
  data: {
    content: Array<{
      type: 'text' | 'image' | 'resource';
      [key: string]: any;
    }>;
    isError?: boolean;
    metadata?: {
      elapsedMs?: number;
      toolName?: string;
    };
  };
}

// 进度更新事件
interface ProgressEvent extends ServerEvent {
  type: 'progress';
  data: {
    progress: number;      // 0-100 百分比
    message: string;       // 进度描述
    metadata?: {
      currentStep?: number;
      totalSteps?: number;
      estimatedRemainingMs?: number;
    };
  };
}
```

### 3.3 流式工具调用实现

#### 3.3.1 服务器端工具执行器
```typescript
class ToolExecutor {
  async *executeTool(toolName: string, args: any, session: MCPSession): AsyncIterable<MCPResult> {
    const tool = this.getTool(toolName);
    
    // 验证参数
    const validationResult = this.validateArguments(tool.inputSchema, args);
    if (!validationResult.valid) {
      yield {
        type: 'error',
        content: [{ type: 'text', text: `参数验证失败: ${validationResult.errors}` }]
      };
      return;
    }
    
    // 发送开始进度
    yield {
      type: 'progress',
      progress: 0,
      message: '开始执行工具...'
    };
    
    try {
      // 执行工具并流式返回结果
      let progress = 0;
      for await (const result of tool.execute(args, session)) {
        if (result.type === 'progress') {
          progress = result.progress;
          yield result;
        } else if (result.type === 'content') {
          yield {
            type: 'tool_result',
            content: result.content
          };
        }
      }
      
      // 发送完成进度
      yield {
        type: 'progress',
        progress: 100,
        message: '工具执行完成'
      };
      
    } catch (error) {
      yield {
        type: 'error',
        content: [{ type: 'text', text: `工具执行错误: ${error.message}` }]
      };
    }
  }
}
```

#### 3.3.2 具体工具实现示例

**list_files 工具实现**
```typescript
class ListFilesTool implements MCPTool {
  name = 'list_files';
  description = '列出指定路径下的文件和文件夹';
  
  inputSchema = {
    type: 'object',
    properties: {
      path: { type: 'string', default: '/' },
      recursive: { type: 'boolean', default: false },
      limit: { type: 'number', minimum: 1, maximum: 1000 }
    }
  };
  
  async *execute(args: any, session: MCPSession): AsyncIterable<MCPResult> {
    const { path, recursive, limit = 100 } = args;
    
    // 获取 OneDrive 文件列表
    const files = await this.getOneDriveFiles(session, path, recursive, limit);
    
    // 流式返回文件列表
    let processed = 0;
    const total = files.length;
    
    for (const file of files) {
      yield {
        type: 'content',
        content: [{
          type: 'text',
          text: this.formatFileInfo(file)
        }]
      };
      
      processed++;
      
      // 更新进度
      yield {
        type: 'progress',
        progress: Math.round((processed / total) * 100),
        message: `已处理 ${processed}/${total} 个文件`
      };
    }
  }
  
  private formatFileInfo(file: OneDriveFile): string {
    return `${file.isFolder ? '📁' : '📄'} ${file.name} (${file.size} bytes)`;
  }
}
```

**read_file 工具实现（支持大文件流式读取）**
```typescript
class ReadFileTool implements MCPTool {
  name = 'read_file';
  description = '读取文件内容，支持文本文件预览';
  
  inputSchema = {
    type: 'object',
    properties: {
      fileId: { type: 'string' },
      encoding: { type: 'string', enum: ['utf-8', 'base64'], default: 'utf-8' },
      maxSize: { type: 'number', default: 1024 * 1024 } // 1MB 默认限制
    },
    required: ['fileId']
  };
  
  async *execute(args: any, session: MCPSession): AsyncIterable<MCPResult> {
    const { fileId, encoding, maxSize } = args;
    
    // 获取文件元数据
    const fileInfo = await this.getFileMetadata(session, fileId);
    
    if (fileInfo.size > maxSize) {
      yield {
        type: 'error',
        content: [{
          type: 'text',
          text: `文件过大 (${fileInfo.size} bytes)，超过限制 ${maxSize} bytes`
        }]
      };
      return;
    }
    
    // 分块读取文件内容
    const chunkSize = 64 * 1024; // 64KB 每块
    const totalChunks = Math.ceil(fileInfo.size / chunkSize);
    
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, fileInfo.size);
      
      // 读取文件块
      const chunk = await this.readFileChunk(session, fileId, start, end);
      
      yield {
        type: 'content',
        content: [{
          type: 'text',
          text: `文件块 ${chunkIndex + 1}/${totalChunks}: ${chunk.substring(0, 100)}...`
        }]
      };
      
      // 更新进度
      yield {
        type: 'progress',
        progress: Math.round(((chunkIndex + 1) / totalChunks) * 100),
        message: `已读取 ${chunkIndex + 1}/${totalChunks} 个块`
      };
    }
  }
}
```

## 4. HTTP Stream 大文件处理

### 4.1 分块上传实现
```typescript
// 大文件分块上传端点
app.post('/api/files/upload/chunk', async (req, res) => {
  const { uploadId, chunkIndex, totalChunks, fileId } = req.body;
  const fileChunk = req.files?.chunk;
  
  try {
    // 验证上传会话
    const uploadSession = await this.validateUploadSession(uploadId);
    
    // 处理文件块
    await this.processFileChunk(uploadSession, chunkIndex, fileChunk);
    
    // 发送进度更新（通过 SSE）
    this.sseManager.sendEvent(uploadSession.clientId, {
      type: 'upload_progress',
      data: {
        uploadId,
        progress: Math.round((chunkIndex / totalChunks) * 100),
        message: `上传进度: ${chunkIndex}/${totalChunks}`
      }
    });
    
    // 如果是最后一个块，完成上传
    if (chunkIndex === totalChunks - 1) {
      await this.completeUpload(uploadSession, fileId);
      
      this.sseManager.sendEvent(uploadSession.clientId, {
        type: 'upload_complete',
        data: { uploadId, fileId }
      });
    }
    
    res.json({ success: true, chunkIndex });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 4.2 流式下载实现
```typescript
// 大文件流式下载端点
app.get('/api/files/download/:fileId', async (req, res) => {
  const fileId = req.params.fileId;
  const range = req.headers.range;
  
  try {
    const fileInfo = await this.getFileInfo(fileId);
    
    if (range) {
      // 支持 Range 请求（分块下载）
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileInfo.size - 1;
      const chunksize = (end - start) + 1;
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileInfo.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': fileInfo.mimeType
      });
      
      // 创建可读流
      const fileStream = await this.createFileStream(fileId, start, end);
      fileStream.pipe(res);
      
    } else {
      // 完整文件下载
      res.writeHead(200, {
        'Content-Length': fileInfo.size,
        'Content-Type': fileInfo.mimeType
      });
      
      const fileStream = await this.createFileStream(fileId);
      fileStream.pipe(res);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 5. 错误处理和重试机制

### 5.1 错误类型定义
```typescript
enum MCPErrorCode {
  // 连接错误
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  
  // 认证错误
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  INVALID_API_KEY = 'INVALID_API_KEY',
  
  // 工具错误
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  INVALID_ARGUMENTS = 'INVALID_ARGUMENTS',
  TOOL_EXECUTION_FAILED = 'TOOL_EXECUTION_FAILED',
  
  // 资源错误
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  
  // OneDrive API 错误
  ONEDRIVE_API_ERROR = 'ONEDRIVE_API_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}

interface MCPError {
  code: MCPErrorCode;
  message: string;
  details?: any;
  retryable: boolean;
  retryAfter?: number; // 重试等待时间（秒）
}
```

### 5.2 自动重连机制
```typescript
class MCPClientWithRetry extends MCPClient {
  private reconnectTimer: NodeJS.Timeout | null = null;
  
  async connectWithRetry(apiKey: string): Promise<void> {
    try {
      await this.connect(apiKey);
      this.reconnectAttempts = 0;
    } catch (error) {
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        const delay = this.calculateReconnectDelay(this.reconnectAttempts);
        
        console.log(`连接失败，${delay}ms 后重试... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        this.reconnectTimer = setTimeout(() => {
          this.connectWithRetry(apiKey);
        }, delay);
      } else {
        throw new Error(`连接失败，已达到最大重试次数: ${this.maxReconnectAttempts}`);
      }
    }
  }
  
  private calculateReconnectDelay(attempt: number): number {
    // 指数退避策略
    return Math.min(1000 * Math.pow(2, attempt), 30000); // 最大30秒
  }
}
```

## 6. 性能优化和安全考虑

### 6.1 性能优化
- **连接池管理**: 复用 SSE 连接，避免频繁建立新连接
- **数据压缩**: 对大文本内容进行 gzip 压缩
- **缓存策略**: 对频繁访问的文件元数据进行缓存
- **批量操作**: 支持批量文件操作，减少 API 调用次数

### 6.2 安全措施
- **API 密钥轮换**: 支持定期更换 API 密钥
- **请求限流**: 基于 IP 和 API 密钥的请求频率限制
- **输入验证**: 严格的参数验证和 SQL 注入防护
- **HTTPS 强制**: 所有通信强制使用 HTTPS
- **CORS 配置**: 严格的跨域访问控制

## 7. 部署和监控

### 7.1 Render.com 部署配置
```yaml
# render.yaml
services:
  - type: web
    name: onedrive-mcp
    env: node
    plan: free
    buildCommand: npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: ONEDRIVE_CLIENT_ID
        sync: false
      - key: ONEDRIVE_CLIENT_SECRET
        sync: false
      - key: JWT_SECRET
        generateValue: true
    healthCheckPath: /health
    autoDeploy: true
```

### 7.2 监控指标
- **连接数**: 当前活跃的 SSE 连接数量
- **工具调用频率**: 各工具的调用次数和成功率
- **响应时间**: 工具调用的平均响应时间
- **错误率**: 各类错误的出现频率
- **资源使用**: 内存和 CPU 使用情况

---

## 文档版本
- **版本**: 1.0
- **创建日期**: 2025-11-15
- **最后更新**: 2025-11-15
- **状态**: 技术规范草案