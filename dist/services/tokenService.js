import { Client } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';
import axios from 'axios';
// 令牌服务类
export class TokenService {
    clientId;
    clientSecret;
    redirectUri;
    tenantId;
    tokenStore = {};
    TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // 5分钟缓冲时间
    constructor(clientId, clientSecret, redirectUri, tenantId) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
        this.tenantId = tenantId;
    }
    // 获取授权URL
    getAuthUrl(state) {
        const baseUrl = this.tenantId
            ? `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/authorize`
            : 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
        const scopes = ['https://graph.microsoft.com/Files.ReadWrite', 'https://graph.microsoft.com/User.Read'];
        const params = new URLSearchParams({
            client_id: this.clientId,
            response_type: 'code',
            redirect_uri: this.redirectUri,
            scope: scopes.join(' '),
            response_mode: 'query',
        });
        if (state) {
            params.append('state', state);
        }
        return `${baseUrl}?${params.toString()}`;
    }
    // 使用授权码交换令牌
    async exchangeCodeForToken(code) {
        const tokenUrl = this.tenantId
            ? `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`
            : 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
        const params = new URLSearchParams({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: this.redirectUri,
        });
        try {
            const response = await axios.post(tokenUrl, params.toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            const tokenData = response.data;
            const expiresAt = Date.now() + (tokenData.expires_in * 1000);
            const token = {
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expires_in: tokenData.expires_in,
                token_type: tokenData.token_type,
                scope: tokenData.scope,
                expires_at: expiresAt,
            };
            return token;
        }
        catch (error) {
            throw new Error(`Failed to exchange code for token: ${error.message}`);
        }
    }
    // 刷新令牌
    async refreshToken(refreshToken) {
        const tokenUrl = this.tenantId
            ? `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`
            : 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
        const params = new URLSearchParams({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        });
        try {
            const response = await axios.post(tokenUrl, params.toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            const tokenData = response.data;
            const expiresAt = Date.now() + (tokenData.expires_in * 1000);
            const token = {
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token || refreshToken, // 如果没有返回新的refresh_token，使用旧的
                expires_in: tokenData.expires_in,
                token_type: tokenData.token_type,
                scope: tokenData.scope,
                expires_at: expiresAt,
            };
            return token;
        }
        catch (error) {
            throw new Error(`Failed to refresh token: ${error.message}`);
        }
    }
    // 检查令牌是否过期
    isTokenExpired(token) {
        return Date.now() >= (token.expires_at - this.TOKEN_REFRESH_BUFFER);
    }
    // 存储用户令牌
    storeUserToken(userId, token) {
        this.tokenStore[userId] = token;
    }
    // 获取用户令牌
    getUserToken(userId) {
        return this.tokenStore[userId] || null;
    }
    // 获取有效的访问令牌（如果需要会自动刷新）
    async getValidAccessToken(userId) {
        let token = this.getUserToken(userId);
        if (!token) {
            throw new Error(`No token found for user ${userId}`);
        }
        if (this.isTokenExpired(token)) {
            try {
                console.log(`Token expired for user ${userId}, refreshing...`);
                token = await this.refreshToken(token.refresh_token);
                this.storeUserToken(userId, token);
                console.log(`Token refreshed successfully for user ${userId}`);
            }
            catch (error) {
                throw new Error(`Failed to refresh token for user ${userId}: ${error}`);
            }
        }
        return token.access_token;
    }
    // 创建已认证的Microsoft Graph客户端
    async createGraphClient(userId) {
        const accessToken = await this.getValidAccessToken(userId);
        return Client.init({
            authProvider: (done) => {
                done(null, accessToken);
            }
        });
    }
    // 删除用户令牌
    removeUserToken(userId) {
        delete this.tokenStore[userId];
    }
    // 获取存储的所有用户ID
    getAllUserIds() {
        return Object.keys(this.tokenStore);
    }
}
// 令牌服务单例
let tokenServiceInstance = null;
export function getTokenService() {
    if (!tokenServiceInstance) {
        const clientId = process.env.MICROSOFT_CLIENT_ID || '';
        const clientSecret = process.env.MICROSOFT_CLIENT_SECRET || '';
        const redirectUri = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3001/api/auth/callback';
        const tenantId = process.env.MICROSOFT_TENANT_ID || undefined;
        if (!clientId || !clientSecret) {
            throw new Error('Microsoft OAuth credentials are not configured');
        }
        tokenServiceInstance = new TokenService(clientId, clientSecret, redirectUri, tenantId);
    }
    return tokenServiceInstance;
}
// 开发环境的模拟令牌服务
export class MockTokenService extends TokenService {
    constructor() {
        super('', '', '');
    }
    getAuthUrl(state) {
        // 在开发环境中，返回本地服务器的完整URL
        const baseUrl = 'http://localhost:3000';
        return `${baseUrl}/api/oauth/mock-success?state=${state || 'mock-state'}`;
    }
    async exchangeCodeForToken(code) {
        // 返回模拟令牌
        const expiresAt = Date.now() + (60 * 60 * 1000); // 1小时后过期
        return {
            access_token: 'mock-access-token-' + Date.now(),
            refresh_token: 'mock-refresh-token',
            expires_in: 3600,
            token_type: 'Bearer',
            scope: 'https://graph.microsoft.com/Files.ReadWrite https://graph.microsoft.com/User.Read',
            expires_at: expiresAt,
        };
    }
    async refreshToken(refreshToken) {
        const expiresAt = Date.now() + (60 * 60 * 1000);
        return {
            access_token: 'mock-access-token-refreshed-' + Date.now(),
            refresh_token: refreshToken,
            expires_in: 3600,
            token_type: 'Bearer',
            scope: 'https://graph.microsoft.com/Files.ReadWrite https://graph.microsoft.com/User.Read',
            expires_at: expiresAt,
        };
    }
    async createGraphClient(userId) {
        // 在开发环境中返回模拟的Graph客户端
        return Client.init({
            authProvider: (done) => {
                done(null, 'mock-access-token');
            }
        });
    }
}
//# sourceMappingURL=tokenService.js.map