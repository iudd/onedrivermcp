interface TokenPayload {
    userId: string;
    displayName?: string;
    email?: string;
    microsoftAuthenticated?: boolean;
    tokenType?: string;
}
/**
 * 生成访问令牌
 */
export declare function generateAccessToken(payload: TokenPayload): string;
/**
 * 生成刷新令牌
 */
export declare function generateRefreshToken(payload: {
    userId: string;
}): string;
/**
 * 验证访问令牌
 */
export declare function verifyAccessToken(token: string): TokenPayload | null;
/**
 * 验证刷新令牌
 */
export declare function verifyRefreshToken(token: string): TokenPayload | null;
/**
 * 解码令牌（不验证，仅用于调试）
 */
export declare function decodeToken(token: string): TokenPayload | null;
/**
 * 检查令牌是否即将过期
 */
export declare function isTokenExpiringSoon(token: string, bufferSeconds?: number): boolean;
/**
 * 获取令牌过期时间
 */
export declare function getTokenExpiration(token: string): Date | null;
export {};
//# sourceMappingURL=authService.d.ts.map