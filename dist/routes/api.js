"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const onedriveService_js_1 = require("../services/onedriveService.js");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
const rateLimiter_js_1 = require("../middleware/rateLimiter.js");
const router = express_1.default.Router();
// 配置文件上传
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
        files: 1
    },
    fileFilter: (req, file, cb) => {
        // 允许所有文件类型
        cb(null, true);
    }
});
/**
 * 获取文件列表
 */
router.get('/files', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw (0, errorHandler_js_1.createError)('Access token required', 401);
    }
    const accessToken = authHeader.substring(7);
    const { path = '/', recursive = false, limit = 100, skip = 0 } = req.query;
    const oneDriveService = new onedriveService_js_1.OneDriveService(accessToken);
    const files = await oneDriveService.listFiles({
        path: path,
        recursive: recursive === 'true',
        limit: parseInt(limit),
        skip: parseInt(skip)
    });
    res.json({
        success: true,
        data: {
            files,
            total: files.length,
            path,
            recursive
        }
    });
}));
/**
 * 获取文件详情
 */
router.get('/files/:id', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw (0, errorHandler_js_1.createError)('Access token required', 401);
    }
    const accessToken = authHeader.substring(7);
    const { id } = req.params;
    const oneDriveService = new onedriveService_js_1.OneDriveService(accessToken);
    const fileInfo = await oneDriveService.getFileInfo(id);
    res.json({
        success: true,
        data: fileInfo
    });
}));
/**
 * 读取文件内容
 */
router.get('/files/:id/content', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw (0, errorHandler_js_1.createError)('Access token required', 401);
    }
    const accessToken = authHeader.substring(7);
    const { id } = req.params;
    const { encoding = 'utf-8', maxSize = 1024 * 1024 } = req.query;
    const oneDriveService = new onedriveService_js_1.OneDriveService(accessToken);
    const content = await oneDriveService.readFile(id, encoding, parseInt(maxSize));
    res.json({
        success: true,
        data: {
            content,
            encoding,
            size: content.length
        }
    });
}));
/**
 * 上传文件
 */
router.post('/files', rateLimiter_js_1.uploadLimiter, upload.single('file'), (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw (0, errorHandler_js_1.createError)('Access token required', 401);
    }
    if (!req.file) {
        throw (0, errorHandler_js_1.createError)('File is required', 400);
    }
    const accessToken = authHeader.substring(7);
    const { path = '/', overwrite = false } = req.body;
    const filePath = `${path === '/' ? '' : path}/${req.file.originalname}`;
    const oneDriveService = new onedriveService_js_1.OneDriveService(accessToken);
    let result;
    if (req.file.size > 5 * 1024 * 1024) {
        // 大文件使用分块上传
        result = await oneDriveService.uploadFileChunked(filePath, req.file.buffer);
    }
    else {
        // 小文件直接上传
        result = await oneDriveService.writeFile(filePath, req.file.buffer.toString('base64'), overwrite === 'true');
    }
    res.json({
        success: true,
        data: result,
        message: 'File uploaded successfully'
    });
}));
/**
 * 创建文件
 */
router.post('/files/create', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw (0, errorHandler_js_1.createError)('Access token required', 401);
    }
    const { path, content, overwrite = false } = req.body;
    if (!path || !content) {
        throw (0, errorHandler_js_1.createError)('Path and content are required', 400);
    }
    const accessToken = authHeader.substring(7);
    const oneDriveService = new onedriveService_js_1.OneDriveService(accessToken);
    const result = await oneDriveService.writeFile(path, content, overwrite);
    res.json({
        success: true,
        data: result,
        message: 'File created successfully'
    });
}));
/**
 * 创建文件夹
 */
router.post('/folders', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw (0, errorHandler_js_1.createError)('Access token required', 401);
    }
    const { path, name } = req.body;
    if (!path || !name) {
        throw (0, errorHandler_js_1.createError)('Path and name are required', 400);
    }
    const accessToken = authHeader.substring(7);
    const oneDriveService = new onedriveService_js_1.OneDriveService(accessToken);
    const result = await oneDriveService.createFolder(path, name);
    res.json({
        success: true,
        data: result,
        message: 'Folder created successfully'
    });
}));
/**
 * 搜索文件
 */
router.get('/search', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw (0, errorHandler_js_1.createError)('Access token required', 401);
    }
    const { q: query, path, fileType = 'all', maxResults = 50 } = req.query;
    if (!query) {
        throw (0, errorHandler_js_1.createError)('Search query is required', 400);
    }
    const accessToken = authHeader.substring(7);
    const oneDriveService = new onedriveService_js_1.OneDriveService(accessToken);
    const files = await oneDriveService.searchFiles({
        query: query,
        path: path,
        fileType: fileType,
        maxResults: parseInt(maxResults)
    });
    res.json({
        success: true,
        data: {
            files,
            query,
            total: files.length
        }
    });
}));
/**
 * 删除文件
 */
router.delete('/files/:id', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw (0, errorHandler_js_1.createError)('Access token required', 401);
    }
    const accessToken = authHeader.substring(7);
    const { id } = req.params;
    const oneDriveService = new onedriveService_js_1.OneDriveService(accessToken);
    await oneDriveService.deleteFile(id);
    res.json({
        success: true,
        message: 'File deleted successfully'
    });
}));
/**
 * 批量操作
 */
router.post('/batch', (0, errorHandler_js_1.asyncHandler)(async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw (0, errorHandler_js_1.createError)('Access token required', 401);
    }
    const { operations } = req.body;
    if (!Array.isArray(operations)) {
        throw (0, errorHandler_js_1.createError)('Operations array is required', 400);
    }
    const accessToken = authHeader.substring(7);
    const oneDriveService = new onedriveService_js_1.OneDriveService(accessToken);
    const results = [];
    for (const operation of operations) {
        try {
            let result;
            switch (operation.type) {
                case 'delete':
                    await oneDriveService.deleteFile(operation.fileId);
                    result = { success: true, operation: 'delete', fileId: operation.fileId };
                    break;
                case 'create_folder':
                    result = await oneDriveService.createFolder(operation.path, operation.name);
                    result = { success: true, operation: 'create_folder', result };
                    break;
                default:
                    result = { success: false, error: `Unknown operation type: ${operation.type}` };
            }
            results.push(result);
        }
        catch (error) {
            results.push({
                success: false,
                error: error.message,
                operation: operation.type
            });
        }
    }
    res.json({
        success: true,
        data: {
            operations: results,
            total: operations.length,
            successful: results.filter(r => r.success).length
        }
    });
}));
exports.default = router;
//# sourceMappingURL=api.js.map