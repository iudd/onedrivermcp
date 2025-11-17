# OneDrive MCP 认证系统说明

## 概述

本系统已简化为使用JWT(JSON Web Token)进行认证，移除了复杂的Azure AD集成，使部署更加简单可靠。

## 认证流程

1. **用户登录**：提供邮箱和密码，获取访问令牌和刷新令牌
2. **令牌验证**：验证访问令牌的有效性
3. **获取用户信息**：使用访问令牌获取当前用户信息
4. **刷新令牌**：使用刷新令牌获取新的访问令牌
5. **登出**：使刷新令牌失效

## 测试用户

系统内置了一个测试用户：
- 邮箱: `user@example.com`
- 密码: `password`

## API端点

### 登录
```
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

返回：
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "15m",
    "user": {
      "id": "user-123",
      "displayName": "演示用户",
      "email": "user@example.com"
    }
  }
}
```

### 验证令牌
```
POST /auth/verify
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 获取当前用户信息
```
GET /auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 刷新令牌
```
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 登出
```
POST /auth/logout
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## 如何运行

1. 构建项目：
```
npm run build
```

2. 启动服务器：
```
npm start
```

3. 或者在Windows上使用快速启动脚本：
```
start-and-test.bat
```

## 安全注意事项

1. **令牌有效期**：
   - 访问令牌默认15分钟过期
   - 刷新令牌默认7天过期

2. **密码安全**：
   - 密码使用bcrypt进行哈希存储
   - 测试密码为"password"，生产环境请使用强密码

3. **环境变量**：
   - JWT_SECRET: 用于签名访问令牌
   - JWT_REFRESH_SECRET: 用于签名刷新令牌
   - 生产环境中请使用强随机密钥

## 与旧系统的兼容性

新的认证系统保持了与前端应用的API兼容性，但有以下变化：

1. 移除了Azure AD相关的认证流程
2. 访问令牌有效期从7天缩短为15分钟
3. 增加了刷新令牌机制
4. 登录端点从`/auth/verify`变为`/auth/login`

如需将访问令牌有效期恢复为7天，可在`.env`文件中设置：
```
JWT_EXPIRES_IN=7d
```