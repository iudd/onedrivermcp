import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { logger } from '../utils/logger.js';

// OAuth会话接口
export interface OAuthSession {
  id: string;
  state: string;
  createdAt: Date;
  expiresAt: Date;
  userId?: string;
  authCode?: string;
}

// 会话管理器类
export class SessionManager {
  private sessions: Map<string, OAuthSession> = new Map();
  private readonly SESSION_TIMEOUT = 5 * 60 * 1000; // 5分钟

  // 生成新的会话和状态码
  generateSession(): OAuthSession {
    const state = randomBytes(16).toString('hex');
    const sessionId = randomBytes(8).toString('hex');
    const now = new Date();
    
    const session: OAuthSession = {
      id: sessionId,
      state,
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.SESSION_TIMEOUT)
    };

    this.sessions.set(sessionId, session);
    logger.info(`Created new session: ${sessionId} with state: ${state}`);
    
    return session;
  }

  // 验证状态码
  verifyState(sessionId: string, receivedState: string): { valid: boolean; session?: OAuthSession; error?: string } {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return { valid: false, error: 'Session not found' };
    }
    
    if (session.expiresAt < new Date()) {
      this.sessions.delete(sessionId);
      return { valid: false, error: 'Session expired' };
    }
    
    if (session.state !== receivedState) {
      return { valid: false, error: 'State mismatch' };
    }
    
    return { valid: true, session };
  }

  // 更新会话数据
  updateSession(sessionId: string, updates: Partial<OAuthSession>): boolean {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return false;
    }
    
    Object.assign(session, updates);
    logger.info(`Updated session: ${sessionId}`);
    
    return true;
  }

  // 获取会话
  getSession(sessionId: string): OAuthSession | null {
    const session = this.sessions.get(sessionId);
    
    if (session && session.expiresAt < new Date()) {
      this.sessions.delete(sessionId);
      return null;
    }
    
    return session || null;
  }

  // 删除会话
  deleteSession(sessionId: string): boolean {
    const result = this.sessions.delete(sessionId);
    if (result) {
      logger.info(`Deleted session: ${sessionId}`);
    }
    return result;
  }

  // 清理过期会话
  cleanupExpiredSessions(): number {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(id);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} expired sessions`);
    }
    
    return cleanedCount;
  }

  // 获取所有活跃会话数量
  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  // 启动定时清理
  startCleanupTimer(intervalMs: number = 60 * 1000): void {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, intervalMs);
    
    logger.info('Session cleanup timer started');
  }
}

// 创建单例实例
const sessionManager = new SessionManager();

// 启动定时清理（每分钟）
sessionManager.startCleanupTimer();

// Express 中间件函数
export const sessionMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // 将会话管理器附加到请求对象
  req.sessionManager = sessionManager;
  
  // 从请求中提取会话ID（可以来自cookie、查询参数等）
  let sessionId = req.cookies?.sessionId || req.query.sessionId as string || req.headers['x-session-id'] as string;
  
  // 如果没有会话ID，生成一个新的
  if (!sessionId) {
    const session = sessionManager.generateSession();
    sessionId = session.id;
    
    // 设置会话ID cookie（如果需要）
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 5 * 60 * 1000 // 5分钟
    });
  }
  
  // 获取会话并附加到请求对象
  const session = sessionManager.getSession(sessionId);
  req.session = session;
  req.sessionId = sessionId;
  
  next();
};

// 导出会话管理器单例
export { sessionManager };

// 类型扩展，向Request类型添加会话相关属性
declare global {
  namespace Express {
    interface Request {
      sessionManager?: SessionManager;
      session?: OAuthSession | null;
      sessionId?: string;
    }
  }
}