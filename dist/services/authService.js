import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';
// JWT 配置
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-development-only';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '-refresh';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
/**
 * 生成访问令牌
 */
export function generateAccessToken(payload) {
    const tokenPayload = {
        ...payload,
        tokenType: 'access',
        iat: Math.floor(Date.now() / 1000),
    };
    return jwt.sign(tokenPayload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN
    });
}
/**
 * 生成刷新令牌
 */
export function generateRefreshToken(payload) {
    const tokenPayload = {
        ...payload,
        tokenType: 'refresh',
        iat: Math.floor(Date.now() / 1000),
    };
    return jwt.sign(tokenPayload, JWT_REFRESH_SECRET, {
        expiresIn: '7d'
    });
}
/**
 * 验证访问令牌
 */
export function verifyAccessToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.tokenType && decoded.tokenType !== 'access') {
            throw new Error('Invalid token type');
        }
        return decoded;
    }
    catch (error) {
        logger.error('Access token verification failed:', error);
        return null;
    }
}
/**
 * 验证刷新令牌
 */
export function verifyRefreshToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
        if (decoded.tokenType && decoded.tokenType !== 'refresh') {
            throw new Error('Invalid token type');
        }
        return decoded;
    }
    catch (error) {
        logger.error('Refresh token verification failed:', error);
        return null;
    }
}
/**
 * 解码令牌（不验证，仅用于调试）
 */
export function decodeToken(token) {
    try {
        return jwt.decode(token);
    }
    catch (error) {
        logger.error('Token decoding failed:', error);
        return null;
    }
}
/**
 * 检查令牌是否即将过期
 */
export function isTokenExpiringSoon(token, bufferSeconds = 300) {
    try {
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.exp) {
            return false;
        }
        const currentTime = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = decoded.exp - currentTime;
        return timeUntilExpiry <= bufferSeconds;
    }
    catch (error) {
        return false;
    }
}
/**
 * 获取令牌过期时间
 */
export function getTokenExpiration(token) {
    try {
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.exp) {
            return null;
        }
        return new Date(decoded.exp * 1000);
    }
    catch (error) {
        logger.error('Failed to get token expiration:', error);
        return null;
    }
}
// 默认导出已移除，直接使用命名导出
//# sourceMappingURL=authService.js.map