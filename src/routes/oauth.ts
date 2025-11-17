import express from 'express';
import { getTokenService, MockTokenService } from '../services/tokenService.js';
import { v4 as uuidv4 } from 'uuid';
import { generateAccessToken, generateRefreshToken, verifyAccessToken } from '../services/authService.js';
import { sessionManager } from '../middleware/session.js';

const router = express.Router();
const isDevelopment = process.env.NODE_ENV === 'development';

// 获取授权URL
router.get('/authorize', (req, res) => {
  try {
    const { state } = req.query;
    // 根据环境选择TokenService
    const tokenService = isDevelopment ? new MockTokenService() : getTokenService();
    
    // 使用会话管理器生成新的会话和状态码
    const session = sessionManager.generateSession();
    const authState = (state as string) || session.state;
    
    // 更新会话中的状态码
    sessionManager.updateSession(session.id, { state: authState });
    
    console.log('OAuth state generated:', authState);
    
    res.json({
      success: true,
      data: {
        authorizationUrl: tokenService.getAuthUrl(authState),
        state: authState,
        sessionId: session.id // 返回会话ID，用于回调验证
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// OAuth回调处理
router.get('/callback', async (req, res) => {
  try {
    const { code, state, sessionId } = req.query;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }
    
    // 验证会话和状态码
    const stateVerification = sessionManager.verifyState(sessionId as string, state as string);
    
    if (!stateVerification.valid) {
      return res.status(400).json({
        success: false,
        error: 'State verification failed',
        details: stateVerification.error
      });
    }
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required'
      });
    }
    
    console.log('OAuth state verification successful:', { 
      sessionId: sessionId, 
      state: state 
    });
    
    // 更新会话，添加授权码
    sessionManager.updateSession(sessionId as string, { authCode: code as string });
    
    // 根据环境选择TokenService
    const tokenService = isDevelopment ? new MockTokenService() : getTokenService();
    
    // 使用授权码交换访问令牌
    const token = await tokenService.exchangeCodeForToken(code as string);
    
    // 生成用户ID（在实际应用中，这可能来自Microsoft Graph的用户信息）
    const userId = uuidv4();
    
    // 存储令牌
    tokenService.storeUserToken(userId, token);
    
    // 更新会话，关联用户ID
    sessionManager.updateSession(sessionId as string, { userId });
    
    // 生成JWT令牌用于客户端认证
    const jwtToken = generateAccessToken({ 
      userId,
      microsoftAuthenticated: true 
    });
    
    res.json({
      success: true,
      data: {
        accessToken: jwtToken,
        refreshToken: generateRefreshToken({ userId }),
        tokenType: 'Bearer',
        expiresIn: '24h',
        message: 'OAuth授权成功',
        debugInfo: {
          tokenType: token.token_type,
          expiresIn: token.expires_in,
          scope: token.scope,
        }
      }
    });
    
    // 在生产环境中，重定向到客户端应用
    // const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}?token=${jwtToken}`;
    // res.redirect(redirectUrl);
    
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    res.status(500).json({
      success: false,
      error: 'OAuth callback failed',
      details: error.message
    });
  }
});

// 仅用于开发环境的模拟成功回调
router.get('/mock-success', (req, res) => {
  if (!isDevelopment) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  const { state, sessionId } = req.query;
  
  try {
    // 直接返回模拟的授权码，包含会话ID
    const redirectUrl = `/api/oauth/callback?code=mock-auth-code-${Date.now()}&state=${state}&sessionId=${sessionId}`;
    res.redirect(redirectUrl);
  } catch (error: any) {
    console.error('Mock OAuth error:', error);
    res.status(500).json({
      success: false,
      error: 'Mock OAuth failed'
    });
  }
});

// 获取用户令牌状态
router.get('/status', async (req, res) => {
  try {
    // 从JWT令牌中获取用户ID
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);
    
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // 根据环境选择TokenService
    const tokenService = isDevelopment ? new MockTokenService() : getTokenService();
    const userToken = tokenService.getUserToken(decoded.userId);
    
    if (!userToken) {
      return res.json({
        success: true,
        data: {
          authenticated: false,
          message: 'No Microsoft Graph token found for this user'
        }
      });
    }
    
    const isExpired = tokenService.isTokenExpired(userToken);
    
    res.json({
      success: true,
      data: {
        authenticated: !isExpired,
        expiresAt: new Date(userToken.expires_at).toISOString(),
        scope: userToken.scope,
        tokenType: userToken.token_type
      }
    });
  } catch (error: any) {
    console.error('Token status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get token status',
      details: error.message
    });
  }
});

// 刷新Microsoft Graph令牌
router.post('/refresh', async (req, res) => {
  try {
    // 从JWT令牌中获取用户ID
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);
    
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // 根据环境选择TokenService
    const tokenService = isDevelopment ? new MockTokenService() : getTokenService();
    const userToken = tokenService.getUserToken(decoded.userId);
    
    if (!userToken) {
      return res.status(404).json({ 
        success: false, 
        error: 'No token found for this user' 
      });
    }
    
    // 刷新令牌
    const newToken = await tokenService.refreshToken(userToken.refresh_token);
    
    // 更新存储的令牌
    tokenService.storeUserToken(decoded.userId, newToken);
    
    res.json({
      success: true,
      data: {
        message: 'Token refreshed successfully',
        expiresAt: new Date(newToken.expires_at).toISOString(),
        scope: newToken.scope,
        tokenType: newToken.token_type
      }
    });
  } catch (error: any) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token',
      details: error.message
    });
  }
});

// 撤销授权
router.post('/revoke', async (req, res) => {
  try {
    // 从JWT令牌中获取用户ID
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);
    
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // 根据环境选择TokenService
    const tokenService = isDevelopment ? new MockTokenService() : getTokenService();
    
    // 删除用户令牌
    tokenService.removeUserToken(decoded.userId);
    
    res.json({
      success: true,
      data: {
        message: 'Authorization revoked successfully'
      }
    });
  } catch (error: any) {
    console.error('Token revoke error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke authorization',
      details: error.message
    });
  }
});

export default router;