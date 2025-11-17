import { Client } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';
export interface MicrosoftGraphToken {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    scope: string;
    expires_at: number;
}
export interface UserTokenStore {
    [userId: string]: MicrosoftGraphToken;
}
export declare class TokenService {
    private readonly clientId;
    private readonly clientSecret;
    private readonly redirectUri;
    private readonly tenantId?;
    private tokenStore;
    private readonly TOKEN_REFRESH_BUFFER;
    constructor(clientId: string, clientSecret: string, redirectUri: string, tenantId?: string | undefined);
    getAuthUrl(state?: string): string;
    exchangeCodeForToken(code: string): Promise<MicrosoftGraphToken>;
    refreshToken(refreshToken: string): Promise<MicrosoftGraphToken>;
    isTokenExpired(token: MicrosoftGraphToken): boolean;
    storeUserToken(userId: string, token: MicrosoftGraphToken): void;
    getUserToken(userId: string): MicrosoftGraphToken | null;
    getValidAccessToken(userId: string): Promise<string>;
    createGraphClient(userId: string): Promise<Client>;
    removeUserToken(userId: string): void;
    getAllUserIds(): string[];
}
export declare function getTokenService(): TokenService;
export declare class MockTokenService extends TokenService {
    constructor();
    getAuthUrl(state?: string): string;
    exchangeCodeForToken(code: string): Promise<MicrosoftGraphToken>;
    refreshToken(refreshToken: string): Promise<MicrosoftGraphToken>;
    createGraphClient(userId: string): Promise<Client>;
}
//# sourceMappingURL=tokenService.d.ts.map