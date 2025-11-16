import express from 'express';
import passport from 'passport';
import { BearerStrategy } from 'passport-azure-ad';
import jwt from 'jsonwebtoken';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// 配置 Azure AD Bearer 策略（用于验证 access token）
passport.use(new BearerStrategy({
  identityMetadata: 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration',
  clientID: process.env.ONEDRIVE_CLIENT_ID || 'test-client-id',
  validateIssuer: false,
  passReqToCallback: false
}, async (token: any, done: any) => {
  try {
    // 验证 token 并获取用户信息
    const user = {
      id: token.oid || token.sub,
      displayName: token.name,
      email: token.preferred_username,
      accessToken: token
    };
    
    done(null, user);
  } catch (error) {
    logger.error('Azure AD authentication error:', error);
    done(error, null);
  }
}));

// 序列化用户
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// 反序列化用户
passport.deserializeUser(async (id: string, done) => {
  try {
    // 这里可以从数据库获取用户信息
    // 简化实现，直接返回用户ID
    done(null, { id });
  } catch (error) {
    done(error, null);
  }
});

/**
 * 验证 access token
 */
router.post('/verify', authLimiter, asyncHandler(async (req, res, next) => {
  passport.authenticate('oauth-bearer', { session: false }, (error, user) => {
    if (error) {
      logger.error('Token verification error:', error);
      return res.status(401).json({
        success: false,
        error: 'Token verification failed'
      });
    }
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed'
      });
    }
    
    // 生成 JWT token
    const jwtPayload = {
      userId: user.id,
      displayName: user.displayName,
      email: user.email
    };
    const jwtSecret = process.env.JWT_SECRET || 'test-jwt-secret-for-development-only';
    const jwtOptions: any = { expiresIn: process.env.JWT_EXPIRES_IN || '7d' };
    
    const token = jwt.sign(jwtPayload, jwtSecret, jwtOptions);
    
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          displayName: user.displayName,
          email: user.email
        }
      }
    });
  })(req, res, next);
}));

/**
 * 获取当前用户信息
 */
router.get('/me', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError('Authorization header required', 401);
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    res.json({
      success: true,
      data: {
        user: {
          id: decoded.userId,
          displayName: decoded.displayName,
          email: decoded.email
        }
      }
    });
  } catch (error) {
    throw createError('Invalid token', 401);
  }
}));

/**
 * 刷新 access token
 */
router.post('/refresh', authLimiter, asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    throw createError('Refresh token required', 400);
  }
  
  // 这里应该实现 refresh token 的逻辑
  // 简化实现，直接返回错误
  throw createError('Refresh token not implemented', 501);
}));

/**
 * 登出
 */
router.post('/logout', asyncHandler(async (req, res) => {
  // 清除客户端 token
  res.json({
    success: true,
    message: 'Logged out successfully'
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
      <title>Authentication Successful</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .success { color: green; font-size: 24px; }
        .info { color: #666; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="success">✅ Authentication Successful</div>
      <div class="info">You can now close this window and return to the application.</div>
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
  const error = req.query.error || 'Authentication failed';
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Authentication Failed</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .error { color: red; font-size: 24px; }
        .info { color: #666; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="error">❌ Authentication Failed</div>
      <div class="info">Error: ${error}</div>
      <div class="info">Please try again.</div>
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