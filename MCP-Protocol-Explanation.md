# OneDrive MCP Server 功能演示说明

## 服务器状态

OneDrive MCP Server 已成功部署并运行！

## 可用端点

1. **健康检查端点**:
   ```
   GET https://onedrivermcp.onrender.com/health
   ```
   返回服务器状态和运行信息

2. **MCP 信息端点**:
   ```
   GET https://onedrivermcp.onrender.com/mcp/info
   ```
   返回 MCP 服务器信息和能力

3. **MCP 工具列表端点**:
   ```
   GET https://onedrivermcp.onrender.com/mcp/tools
   ```
   返回所有可用的 MCP 工具

4. **SSE 连接端点**:
   ```
   GET https://onedrivermcp.onrender.com/mcp/sse
   ```
   建立 SSE 连接用于 MCP 协议通信

## 可用工具

1. `list_files` - 列出指定路径下的文件和文件夹
2. `read_file` - 读取文件内容
3. `write_file` - 写入或创建文件
4. `search_files` - 搜索文件和文件夹
5. `create_folder` - 创建新文件夹
6. `delete_file` - 删除文件或文件夹

## 为什么直接使用 curl 调用工具会失败？

MCP (Model Context Protocol) 需要通过 SSE (Server-Sent Events) 建立双向连接来调用工具，而不是简单的 HTTP POST 请求。正确的使用方式是：

1. 建立 SSE 连接到 `/mcp/sse`
2. 通过连接发送 JSON-RPC 2.0 格式的消息
3. 接收服务器返回的结果

## 如何正确使用 OneDrive MCP Server

1. **使用 MCP 兼容的客户端**：
   - Claude Desktop
   - 其他支持 MCP 协议的客户端
   - 客户端会处理 SSE 连接和 JSON-RPC 消息交换

2. **开发自定义客户端**：
   - 使用支持 EventSource 的 JavaScript 客户端
   - 实现双向通信和 JSON-RPC 消息处理

3. **查看更多文档**：
   - MCP 协议技术实现文档
   - 项目的 README 文件

## 示例消息格式

调用 `list_files` 工具的消息示例：
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "list_files",
    "arguments": {
      "path": "/"
    }
  }
}
```

## 总结

OneDrive MCP Server 已经成功部署并运行，提供了完整的 OneDrive 文件管理功能。要正确使用这些功能，需要通过支持 MCP 协议的客户端进行连接，而不是直接使用 HTTP 请求。