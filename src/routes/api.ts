import express, { Request, Response } from 'express';
import multer from 'multer';
import { OneDriveService } from '../services/onedriveService.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';
import { logger } from '../utils/logger.js';
import { verifyAccessToken } from '../services/authService.js';

const router = express.Router();

// 从请求中提取用户ID的辅助函数
function getUserIdFromRequest(req: Request): string {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError('Access token required', 401);
  }
  
  const token = authHeader.substring(7);
  const decoded = verifyAccessToken(token);
  
  if (!decoded || !decoded.userId) {
    throw createError('Invalid token', 401);
  }
  
  return decoded.userId;
}

// 配置文件上传
const upload = multer({
  storage: multer.memoryStorage(),
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
router.get('/files', asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  const { path = '/', recursive = false, limit = 100, skip = 0 } = req.query;
  
  const oneDriveService = new OneDriveService(userId);
  const files = await oneDriveService.listFiles({
    path: path as string,
    recursive: recursive === 'true',
    limit: parseInt(limit as string),
    skip: parseInt(skip as string)
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
router.get('/files/:id', asyncHandler(async (req, res) => {
  const userId = getUserIdFromRequest(req);
  const { id } = req.params;
  
  const oneDriveService = new OneDriveService(userId);
  const fileInfo = await oneDriveService.getFileInfo(id);
  
  res.json({
    success: true,
    data: fileInfo
  });
}));

/**
 * 读取文件内容
 */
router.get('/files/:id/content', asyncHandler(async (req, res) => {
  const userId = getUserIdFromRequest(req);
  const { id } = req.params;
  const { encoding = 'utf-8', maxSize = 1024 * 1024 } = req.query;
  
  const oneDriveService = new OneDriveService(userId);
  const content = await oneDriveService.readFile(
    id, 
    encoding as 'utf-8' | 'base64', 
    parseInt(maxSize as string)
  );
  
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
router.post('/files', uploadLimiter, upload.single('file'), asyncHandler(async (req, res) => {
  const userId = getUserIdFromRequest(req);
  
  if (!req.file) {
    throw createError('File is required', 400);
  }
  
  const { path = '/', overwrite = false } = req.body;
  const filePath = `${path === '/' ? '' : path}/${req.file.originalname}`;
  
  const oneDriveService = new OneDriveService(userId);
  
  let result;
  if (req.file.size > 5 * 1024 * 1024) {
    // 大文件使用分块上传
    result = await oneDriveService.uploadFileChunked(filePath, req.file.buffer);
  } else {
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
router.post('/files/create', asyncHandler(async (req, res) => {
  const userId = getUserIdFromRequest(req);
  
  const { path, content, overwrite = false } = req.body;
  
  if (!path || !content) {
    throw createError('Path and content are required', 400);
  }
  
  const oneDriveService = new OneDriveService(userId);
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
router.post('/folders', asyncHandler(async (req, res) => {
  const userId = getUserIdFromRequest(req);
  
  const { path, name } = req.body;
  
  if (!path || !name) {
    throw createError('Path and name are required', 400);
  }
  
  const oneDriveService = new OneDriveService(userId);
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
router.get('/search', asyncHandler(async (req, res) => {
  const userId = getUserIdFromRequest(req);
  
  const { q: query, path, fileType = 'all', maxResults = 50 } = req.query;
  
  if (!query) {
    throw createError('Search query is required', 400);
  }
  
  const oneDriveService = new OneDriveService(userId);
  const files = await oneDriveService.searchFiles({
    query: query as string,
    path: path as string,
    fileType: fileType as 'file' | 'folder' | 'all',
    maxResults: parseInt(maxResults as string)
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
router.delete('/files/:id', asyncHandler(async (req, res) => {
  const userId = getUserIdFromRequest(req);
  const { id } = req.params;
  
  const oneDriveService = new OneDriveService(userId);
  await oneDriveService.deleteFile(id);
  
  res.json({
    success: true,
    message: 'File deleted successfully'
  });
}));

/**
 * 批量操作
 */
router.post('/batch', asyncHandler(async (req, res) => {
  const userId = getUserIdFromRequest(req);
  
  const { operations } = req.body;
  
  if (!Array.isArray(operations)) {
    throw createError('Operations array is required', 400);
  }
  
  const oneDriveService = new OneDriveService(userId);
  const results: any[] = [];
  
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
    } catch (error: any) {
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

export default router;