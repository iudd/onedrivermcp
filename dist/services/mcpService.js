"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPService = void 0;
const events_1 = require("events");
const uuid_1 = require("uuid");
const onedriveService_js_1 = require("./onedriveService.js");
const logger_js_1 = require("../utils/logger.js");
class MCPService extends events_1.EventEmitter {
    connections = new Map();
    tools = new Map();
    constructor() {
        super();
        this.initializeTools();
    }
    /**
     * 初始化 MCP 工具定义
     */
    initializeTools() {
        this.tools.set('list_files', {
            name: 'list_files',
            description: '列出指定路径下的文件和文件夹',
            inputSchema: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: '目录路径，默认为根目录'
                    },
                    recursive: {
                        type: 'boolean',
                        description: '是否递归遍历子目录'
                    },
                    limit: {
                        type: 'number',
                        description: '返回结果数量限制'
                    }
                }
            }
        });
        this.tools.set('read_file', {
            name: 'read_file',
            description: '读取文件内容，支持文本文件预览',
            inputSchema: {
                type: 'object',
                properties: {
                    fileId: {
                        type: 'string',
                        description: '文件ID或路径'
                    },
                    encoding: {
                        type: 'string',
                        enum: ['utf-8', 'base64'],
                        description: '文件编码格式'
                    },
                    maxSize: {
                        type: 'number',
                        description: '最大读取大小（字节）'
                    }
                },
                required: ['fileId']
            }
        });
        this.tools.set('write_file', {
            name: 'write_file',
            description: '写入或创建文件',
            inputSchema: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: '文件路径'
                    },
                    content: {
                        type: 'string',
                        description: '文件内容'
                    },
                    overwrite: {
                        type: 'boolean',
                        description: '是否覆盖已存在文件'
                    }
                },
                required: ['path', 'content']
            }
        });
        this.tools.set('search_files', {
            name: 'search_files',
            description: '搜索文件和文件夹',
            inputSchema: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: '搜索关键词'
                    },
                    path: {
                        type: 'string',
                        description: '搜索起始路径'
                    },
                    fileType: {
                        type: 'string',
                        enum: ['file', 'folder', 'all'],
                        description: '文件类型过滤'
                    },
                    maxResults: {
                        type: 'number',
                        description: '最大结果数量'
                    }
                },
                required: ['query']
            }
        });
        this.tools.set('create_folder', {
            name: 'create_folder',
            description: '创建新文件夹',
            inputSchema: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: '父目录路径'
                    },
                    name: {
                        type: 'string',
                        description: '文件夹名称'
                    }
                },
                required: ['path', 'name']
            }
        });
        this.tools.set('delete_file', {
            name: 'delete_file',
            description: '删除文件或文件夹',
            inputSchema: {
                type: 'object',
                properties: {
                    fileId: {
                        type: 'string',
                        description: '文件ID'
                    }
                },
                required: ['fileId']
            }
        });
    }
    /**
     * 添加 SSE 连接
     */
    addConnection(connectionId, response) {
        this.connections.set(connectionId, {
            response,
            lastActivity: Date.now(),
            accessToken: null
        });
        logger_js_1.logger.info(`MCP connection established: ${connectionId}`);
    }
    /**
     * 移除 SSE 连接
     */
    removeConnection(connectionId) {
        this.connections.delete(connectionId);
        logger_js_1.logger.info(`MCP connection closed: ${connectionId}`);
    }
    /**
     * 发送事件到客户端
     */
    sendEvent(connectionId, event) {
        const connection = this.connections.get(connectionId);
        if (!connection) {
            logger_js_1.logger.warn(`Connection not found: ${connectionId}`);
            return;
        }
        try {
            const data = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
            connection.response.write(data);
        }
        catch (error) {
            logger_js_1.logger.error(`Error sending event to ${connectionId}:`, error);
            this.removeConnection(connectionId);
        }
    }
    /**
     * 处理客户端事件
     */
    async handleClientEvent(connectionId, event) {
        const connection = this.connections.get(connectionId);
        if (!connection) {
            throw new Error(`Connection not found: ${connectionId}`);
        }
        try {
            switch (event.type) {
                case 'initialize':
                    await this.handleInitialize(connectionId, event);
                    break;
                case 'tools_call':
                    await this.handleToolCall(connectionId, event);
                    break;
                case 'resources_list':
                    await this.handleResourcesList(connectionId, event);
                    break;
                case 'resources_read':
                    await this.handleResourcesRead(connectionId, event);
                    break;
                default:
                    throw new Error(`Unknown event type: ${event.type}`);
            }
        }
        catch (error) {
            this.sendEvent(connectionId, {
                type: 'error',
                callId: event.callId,
                data: { message: error.message }
            });
        }
    }
    /**
     * 处理初始化事件
     */
    async handleInitialize(connectionId, event) {
        const { accessToken } = event.data || {};
        if (!accessToken) {
            throw new Error('Access token required for initialization');
        }
        const connection = this.connections.get(connectionId);
        connection.accessToken = accessToken;
        // 发送初始化响应
        this.sendEvent(connectionId, {
            type: 'initialized',
            callId: event.callId,
            data: {
                protocolVersion: '2024-11-05',
                capabilities: {
                    tools: Array.from(this.tools.keys()),
                    resources: true
                },
                serverInfo: {
                    name: 'onedrive-mcp-server',
                    version: '1.0.0'
                }
            }
        });
        logger_js_1.logger.info(`MCP connection initialized: ${connectionId}`);
    }
    /**
     * 处理工具调用
     */
    async handleToolCall(connectionId, event) {
        const connection = this.connections.get(connectionId);
        const { tool, arguments: args } = event.data;
        if (!connection.accessToken) {
            throw new Error('Connection not authenticated');
        }
        const toolDefinition = this.tools.get(tool);
        if (!toolDefinition) {
            throw new Error(`Unknown tool: ${tool}`);
        }
        // 发送进度更新
        this.sendEvent(connectionId, {
            type: 'progress',
            callId: event.callId,
            data: { progress: 0, message: '开始处理...' }
        });
        try {
            const oneDriveService = new onedriveService_js_1.OneDriveService(connection.accessToken);
            const result = await this.executeTool(oneDriveService, tool, args, event.callId, connectionId);
            this.sendEvent(connectionId, {
                type: 'tool_result',
                callId: event.callId,
                data: result
            });
        }
        catch (error) {
            this.sendEvent(connectionId, {
                type: 'error',
                callId: event.callId,
                data: { message: error.message }
            });
        }
    }
    /**
     * 执行具体工具
     */
    async executeTool(oneDriveService, tool, args, callId, connectionId) {
        switch (tool) {
            case 'list_files':
                return await this.executeListFiles(oneDriveService, args, callId, connectionId);
            case 'read_file':
                return await this.executeReadFile(oneDriveService, args, callId, connectionId);
            case 'write_file':
                return await this.executeWriteFile(oneDriveService, args);
            case 'search_files':
                return await this.executeSearchFiles(oneDriveService, args);
            case 'create_folder':
                return await this.executeCreateFolder(oneDriveService, args);
            case 'delete_file':
                return await this.executeDeleteFile(oneDriveService, args);
            default:
                throw new Error(`Unsupported tool: ${tool}`);
        }
    }
    /**
     * 执行列出文件
     */
    async executeListFiles(oneDriveService, args, callId, connectionId) {
        this.sendEvent(connectionId, {
            type: 'progress',
            callId,
            data: { progress: 25, message: '正在获取文件列表...' }
        });
        const files = await oneDriveService.listFiles(args);
        this.sendEvent(connectionId, {
            type: 'progress',
            callId,
            data: { progress: 75, message: '处理文件信息...' }
        });
        const content = files.map(file => ({
            type: 'text',
            text: `${file.folder ? '📁' : '📄'} ${file.name}${file.folder ? ` (${file.folder.childCount} items)` : file.size ? ` (${this.formatFileSize(file.size)})` : ''}`
        }));
        return {
            callId,
            content
        };
    }
    /**
     * 执行读取文件
     */
    async executeReadFile(oneDriveService, args, callId, connectionId) {
        this.sendEvent(connectionId, {
            type: 'progress',
            callId,
            data: { progress: 30, message: '正在读取文件...' }
        });
        const content = await oneDriveService.readFile(args.fileId, args.encoding, args.maxSize);
        return {
            callId,
            content: [{
                    type: 'text',
                    text: content
                }]
        };
    }
    /**
     * 执行写入文件
     */
    async executeWriteFile(oneDriveService, args) {
        const result = await oneDriveService.writeFile(args.path, args.content, args.overwrite);
        return {
            callId: (0, uuid_1.v4)(),
            content: [{
                    type: 'text',
                    text: `文件已成功${args.overwrite ? '更新' : '创建'}: ${result.name}`
                }]
        };
    }
    /**
     * 执行搜索文件
     */
    async executeSearchFiles(oneDriveService, args) {
        const files = await oneDriveService.searchFiles(args);
        const content = files.map(file => ({
            type: 'text',
            text: `${file.folder ? '📁' : '📄'} ${file.name} (${file.lastModifiedDateTime})`
        }));
        return {
            callId: (0, uuid_1.v4)(),
            content
        };
    }
    /**
     * 执行创建文件夹
     */
    async executeCreateFolder(oneDriveService, args) {
        const result = await oneDriveService.createFolder(args.path, args.name);
        return {
            callId: (0, uuid_1.v4)(),
            content: [{
                    type: 'text',
                    text: `文件夹已创建: ${result.name}`
                }]
        };
    }
    /**
     * 执行删除文件
     */
    async executeDeleteFile(oneDriveService, args) {
        await oneDriveService.deleteFile(args.fileId);
        return {
            callId: (0, uuid_1.v4)(),
            content: [{
                    type: 'text',
                    text: '文件已成功删除'
                }]
        };
    }
    /**
     * 处理资源列表请求
     */
    async handleResourcesList(connectionId, event) {
        // 实现资源列表逻辑
        this.sendEvent(connectionId, {
            type: 'resource_content',
            callId: event.callId,
            data: { resources: [] }
        });
    }
    /**
     * 处理资源读取请求
     */
    async handleResourcesRead(connectionId, event) {
        // 实现资源读取逻辑
        this.sendEvent(connectionId, {
            type: 'resource_content',
            callId: event.callId,
            data: { content: '' }
        });
    }
    /**
     * 格式化文件大小
     */
    formatFileSize(bytes) {
        if (bytes === 0)
            return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    /**
     * 获取所有工具定义
     */
    getTools() {
        return Array.from(this.tools.values());
    }
    /**
     * 清理过期连接
     */
    cleanupExpiredConnections(timeout = 30 * 60 * 1000) {
        const now = Date.now();
        for (const [connectionId, connection] of this.connections.entries()) {
            if (now - connection.lastActivity > timeout) {
                this.removeConnection(connectionId);
            }
        }
    }
}
exports.MCPService = MCPService;
//# sourceMappingURL=mcpService.js.map