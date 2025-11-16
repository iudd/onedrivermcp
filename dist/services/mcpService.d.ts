import { EventEmitter } from 'events';
import { MCPTool, SSEClientEvent, SSEServerEvent } from '../types/mcp.js';
export declare class MCPService extends EventEmitter {
    private connections;
    private tools;
    constructor();
    /**
     * 初始化 MCP 工具定义
     */
    private initializeTools;
    /**
     * 添加 SSE 连接
     */
    addConnection(connectionId: string, response: any): void;
    /**
     * 移除 SSE 连接
     */
    removeConnection(connectionId: string): void;
    /**
     * 发送事件到客户端
     */
    sendEvent(connectionId: string, event: SSEServerEvent): void;
    /**
     * 处理客户端事件
     */
    handleClientEvent(connectionId: string, event: SSEClientEvent): Promise<void>;
    /**
     * 处理初始化事件
     */
    private handleInitialize;
    /**
     * 处理工具调用
     */
    private handleToolCall;
    /**
     * 执行具体工具
     */
    private executeTool;
    /**
     * 执行列出文件
     */
    private executeListFiles;
    /**
     * 执行读取文件
     */
    private executeReadFile;
    /**
     * 执行写入文件
     */
    private executeWriteFile;
    /**
     * 执行搜索文件
     */
    private executeSearchFiles;
    /**
     * 执行创建文件夹
     */
    private executeCreateFolder;
    /**
     * 执行删除文件
     */
    private executeDeleteFile;
    /**
     * 处理资源列表请求
     */
    private handleResourcesList;
    /**
     * 处理资源读取请求
     */
    private handleResourcesRead;
    /**
     * 格式化文件大小
     */
    private formatFileSize;
    /**
     * 获取所有工具定义
     */
    getTools(): MCPTool[];
    /**
     * 清理过期连接
     */
    cleanupExpiredConnections(timeout?: number): void;
}
//# sourceMappingURL=mcpService.d.ts.map