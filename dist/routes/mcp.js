"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const uuid_1 = require("uuid");
const mcpService_js_1 = require("../services/mcpService.js");
const rateLimiter_js_1 = require("../middleware/rateLimiter.js");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
const logger_js_1 = require("../utils/logger.js");
const router = express_1.default.Router();
const mcpService = new mcpService_js_1.MCPService();
/**
 * SSE 连接端点 - 建立 MCP 协议连接
 */
router.get('/sse', rateLimiter_js_1.mcpLimiter, (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
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
    const connectionId = (0, uuid_1.v4)();
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
            logger_js_1.logger.error('Error parsing client event:', error);
        }
    });
    // 发送初始连接确认
    res.write(`event: connected\ndata: {\"connectionId\": \"${connectionId}\"}\n\n`);
}));
/**
 * 获取 MCP 工具列表
 */
router.get('/tools', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
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
router.get('/info', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
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
router.get('/health', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
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
router.post('/cleanup', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    mcpService.cleanupExpiredConnections();
    res.json({
        success: true,
        message: 'Expired connections cleaned up'
    });
}));
exports.default = router;
//# sourceMappingURL=mcp.js.map