import rateLimit from 'express-rate-limit';

// 通用 API 限流
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 生产环境限制更严格
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 认证相关 API 限流（更严格）
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 每个IP最多5次认证尝试
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// MCP SSE 连接限流
const mcpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: process.env.MCP_MAX_CONNECTIONS || 10, // 每个IP最多连接数
  message: {
    error: 'Too many MCP connections from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 文件上传限流
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 10, // 每个IP最多10次上传
  message: {
    error: 'Too many upload attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export { apiLimiter, authLimiter, mcpLimiter, uploadLimiter };

// 默认使用通用限流
export const rateLimiter = apiLimiter;