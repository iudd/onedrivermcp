import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// 简化的用户数据库（在生产环境中应该使用真正的数据库）
const users: any[] = [
  {
    id: 'user-123',
    email: 'user@example.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    displayName: '演示用户',
    isActive: true
  }
];

// 活跃的刷新令牌存储（生产环境中应使用Redis等）
const refreshTokens: Set<string> = new Set();

/**
 * 用户登录
 */
router.post('/login', authLimiter, asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    throw createError('邮箱和密码是必需的', 400);
  }
  
  // 查找用户
  const user = users.find(u => u.email === email);
  if (!user || !user.isActive) {
    throw createError('用户不存在或已禁用', 401);
  }
  
  // 验证密码
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw createError('密码错误', 401);
  }
  
  // 创建JWT访问令牌
  const jwtPayload = {
    userId: user.id,
    displayName: user.displayName,
    email: user.email
  };
  
  const jwtSecret = process.env.JWT_SECRET || 'test-jwt-secret-for-development-only';
  const jwtOptions: any = { expiresIn: process.env.JWT_EXPIRES_IN || '15m' };
  
  const accessToken = jwt.sign(jwtPayload, jwtSecret, jwtOptions);
  
  // 创建刷新令牌
  const refreshSecret = process.env.JWT_REFRESH_SECRET || jwtSecret + '-refresh';
  const refreshTokenOptions: any = { expiresIn: '7d' };
  const refreshToken = jwt.sign(
    { userId: user.id, tokenType: 'refresh' },
    refreshSecret,
    refreshTokenOptions
  );
  
  // 存储刷新令牌
  refreshTokens.add(refreshToken);
  
  logger.info(`用户登录: ${user.email}`);
  
  res.json({
    success: true,
    data: {
      accessToken,
      refreshToken,
      expiresIn: jwtOptions.expiresIn,
      user: {
        id: user.id,
        displayName: user.displayName,
        email: user.email
      }
    }
  });
}));

/**
 * 验证访问令牌
 */
router.post('/verify', authLimiter, asyncHandler(async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    throw createError('访问令牌是必需的', 400);
  }
  
  try {
    const jwtSecret = process.env.JWT_SECRET || 'test-jwt-secret-for-development-only';
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    res.json({
      success: true,
      data: {
        user: {
          id: decoded.userId,
          displayName: decoded.displayName,
          email: decoded.email
        },
        expiresAt: decoded.exp
      }
    });
  } catch (error) {
    throw createError('无效的访问令牌', 401);
  }
}));

/**
 * 获取当前用户信息
 */
router.get('/me', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError('缺少授权头', 401);
  }
  
  const token = authHeader.substring(7);
  
  try {
    const jwtSecret = process.env.JWT_SECRET || 'test-jwt-secret-for-development-only';
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    // 从数据库获取用户信息
    const user = users.find(u => u.id === decoded.userId);
    if (!user || !user.isActive) {
      throw createError('用户不存在或已禁用', 401);
    }
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          displayName: user.displayName,
          email: user.email
        }
      }
    });
  } catch (error) {
    throw createError('无效的访问令牌', 401);
  }
}));

/**
 * 刷新访问令牌
 */
router.post('/refresh', authLimiter, asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    throw createError('刷新令牌是必需的', 400);
  }
  
  if (!refreshTokens.has(refreshToken)) {
    throw createError('无效的刷新令牌', 401);
  }
  
  try {
    const refreshSecret = process.env.JWT_REFRESH_SECRET || 
      (process.env.JWT_SECRET || 'test-jwt-secret-for-development-only') + '-refresh';
    
    const decoded = jwt.verify(refreshToken, refreshSecret) as any;
    
    // 验证令牌类型
    if (decoded.tokenType !== 'refresh') {
      throw createError('无效的令牌类型', 401);
    }
    
    // 从数据库获取用户信息
    const user = users.find(u => u.id === decoded.userId);
    if (!user || !user.isActive) {
      throw createError('用户不存在或已禁用', 401);
    }
    
    // 创建新的访问令牌
    const jwtPayload = {
      userId: user.id,
      displayName: user.displayName,
      email: user.email
    };
    
    const jwtSecret = process.env.JWT_SECRET || 'test-jwt-secret-for-development-only';
    const jwtOptions: any = { expiresIn: process.env.JWT_EXPIRES_IN || '15m' };
    const newAccessToken = jwt.sign(jwtPayload, jwtSecret, jwtOptions);
    
    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        expiresIn: jwtOptions.expiresIn
      }
    });
  } catch (error) {
    throw createError('无效的刷新令牌', 401);
  }
}));

/**
 * 登出
 */
router.post('/logout', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  
  if (refreshToken && refreshTokens.has(refreshToken)) {
    refreshTokens.delete(refreshToken);
    logger.info('用户登出');
  }
  
  res.json({
    success: true,
    message: '登出成功'
  });
}));

/**
 * 认证成功页面
 */
router.get('/success', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>认证成功</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .success { color: green; font-size: 24px; }
        .info { color: #666; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="success">✅ 认证成功</div>
      <div class="info">您现在可以关闭此窗口并返回应用程序。</div>
      <script>
        // 通知父窗口认证成功
        if (window.opener) {
          window.opener.postMessage({ type: 'auth_success' }, '*');
          setTimeout(() => window.close(), 1000);
        }
      </script>
    </body>
    </html>
  `);
});

/**
 * 认证失败页面
 */
router.get('/failure', (req, res) => {
  const error = req.query.error || '认证失败';
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>认证失败</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .error { color: red; font-size: 24px; }
        .info { color: #666; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="error">❌ 认证失败</div>
      <div class="info">错误: ${error}</div>
      <div class="info">请重试。</div>
      <script>
        // 通知父窗口认证失败
        if (window.opener) {
          window.opener.postMessage({ type: 'auth_failure', error: '${error}' }, '*');
        }
      </script>
    </body>
    </html>
  `);
});

export default router;