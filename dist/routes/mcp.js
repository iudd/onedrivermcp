import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { MCPService } from '../services/mcpService.js';
import { mcpLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
const router = express.Router();
const mcpService = new MCPService();
/**
 * SSE 连接端点 - 建立 MCP 协议连接
 */
router.get('/sse', mcpLimiter, asyncHandler(async (req, res) => {
    // 设置 SSE 响应头
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
        'Access-Control-Expose-Headers': 'Cache-Control, Content-Encoding'
    });
    // 生成连接ID
    const connectionId = uuidv4();
    // 添加连接
    mcpService.addConnection(connectionId, res);
    // 发送心跳包保持连接
    const heartbeat = setInterval(() => {
        try {
            res.write(': heartbeat\n\n');
        }
        catch (error) {
            clearInterval(heartbeat);
            mcpService.removeConnection(connectionId);
        }
    }, 30000); // 30秒心跳
    // 处理客户端断开连接
    req.on('close', () => {
        clearInterval(heartbeat);
        mcpService.removeConnection(connectionId);
    });
    // 处理客户端发送的数据
    req.on('data', (chunk) => {
        try {
            const event = JSON.parse(chunk.toString());
            mcpService.handleClientEvent(connectionId, event);
        }
        catch (error) {
            logger.error('Error parsing client event:', error);
        }
    });
    // 发送初始连接确认
    res.write(`event: connected\ndata: {\"connectionId\": \"${connectionId}\"}\n\n`);
}));
/**
 * 获取 MCP 工具列表
 */
router.get('/tools', asyncHandler(async (req, res) => {
    const tools = mcpService.getTools();
    res.json({
        success: true,
        data: {
            tools,
            protocolVersion: '2024-11-05'
        }
    });
}));
/**
 * 获取 MCP 服务器信息
 */
router.get('/info', asyncHandler(async (req, res) => {
    res.json({
        success: true,
        data: {
            serverInfo: {
                name: 'onedrive-mcp-server',
                version: '1.0.0',
                protocolVersion: '2024-11-05'
            },
            capabilities: {
                tools: mcpService.getTools().map(tool => tool.name),
                resources: true,
                streaming: true
            }
        }
    });
}));
/**
 * 健康检查端点
 */
router.get('/health', asyncHandler(async (req, res) => {
    const connections = mcpService.connections.size || 0;
    res.json({
        status: 'OK',
        connections,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
}));
/**
 * 清理过期连接（管理员端点）
 */
router.post('/cleanup', asyncHandler(async (req, res) => {
    mcpService.cleanupExpiredConnections();
    res.json({
        success: true,
        message: 'Expired connections cleaned up'
    });
}));
export default router;
//# sourceMappingURL=mcp.js.map