import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';

import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { sessionMiddleware } from './middleware/session.js';

// Routes
import authRoutes from './routes/auth.js';
import mcpRoutes from './routes/mcp.js';
import apiRoutes from './routes/api.js';
import oauthRoutes from './routes/oauth.js';

// Initialize environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 配置信任代理以支持Render平台的反向代理
app.set('trust proxy', ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16']);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Compression
app.use(compression());

// CORS configuration - 动态配置允许的来源
const getAllowedOrigins = () => {
  if (process.env.NODE_ENV === 'production') {
    // 生产环境：从环境变量读取允许的来源
    const allowedOrigins = process.env.ALLOWED_ORIGINS;
    if (allowedOrigins) {
      return allowedOrigins.split(',').map(origin => origin.trim());
    }
    // 如果没有设置 ALLOWED_ORIGINS，默认允许 Render 部署的 URL
    const renderUrl = process.env.RENDER_EXTERNAL_URL || 'https://onedrivermcp.onrender.com';
    return [renderUrl];
  }
  // 开发环境：允许本地开发服务器
  return ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8080'];
};

const allowedOrigins = getAllowedOrigins();
logger.info(`CORS allowed origins: ${allowedOrigins.join(', ')}`);

app.use(cors({
  origin: (origin, callback) => {
    // 允许无来源的请求（如 Postman、curl 等）
    if (!origin) {
      return callback(null, true);
    }
    // 检查来源是否在允许列表中
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(rateLimiter);

// Session management
app.use(sessionMiddleware);

// Health check endpoint - 增强版本，包含配置信息
app.get('/health', (req, res) => {
  const healthData = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    cors: {
      allowedOrigins: getAllowedOrigins(),
      requestOrigin: req.headers.origin || 'none',
    },
    oauth: {
      configured: !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
      redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'not configured',
    },
  };

  res.status(200).json(healthData);
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api', apiRoutes);
app.use('/mcp', mcpRoutes);

// 添加根路径的 /tools 重定向到 /mcp/tools（解决404错误）
app.get('/tools', (req, res) => {
  res.redirect('/mcp/tools');
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
});

// Create HTTP server for SSE support
const server = createServer(app);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

// Start server
server.listen(PORT, () => {
  logger.info('='.repeat(60));
  logger.info('🚀 OneDrive MCP Server Started');
  logger.info('='.repeat(60));
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🌐 Port: ${PORT}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
  logger.info(`🔐 OAuth configured: ${!!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET)}`);
  logger.info(`🌍 CORS allowed origins: ${getAllowedOrigins().join(', ')}`);

  if (process.env.NODE_ENV === 'production') {
    const renderUrl = process.env.RENDER_EXTERNAL_URL || 'https://onedrivermcp.onrender.com';
    logger.info(`🚀 Production URL: ${renderUrl}`);
    logger.info(`📝 OAuth Redirect URI: ${process.env.MICROSOFT_REDIRECT_URI || 'NOT CONFIGURED'}`);
  }

  logger.info('='.repeat(60));
});

export default app;