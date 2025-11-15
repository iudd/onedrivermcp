"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadLimiter = exports.mcpLimiter = exports.authLimiter = exports.apiLimiter = exports.rateLimiter = void 0;
const express_rate_limit_1 = require("express-rate-limit");
// 通用 API 限流
const apiLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 生产环境限制更严格
    message: {
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
exports.apiLimiter = apiLimiter;
// 认证相关 API 限流（更严格）
const authLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 每个IP最多5次认证尝试
    message: {
        error: 'Too many authentication attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
exports.authLimiter = authLimiter;
// MCP SSE 连接限流
const mcpLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 60 * 60 * 1000, // 1小时
    max: process.env.MCP_MAX_CONNECTIONS || 10, // 每个IP最多连接数
    message: {
        error: 'Too many MCP connections from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
exports.mcpLimiter = mcpLimiter;
// 文件上传限流
const uploadLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 60 * 60 * 1000, // 1小时
    max: 10, // 每个IP最多10次上传
    message: {
        error: 'Too many upload attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
exports.uploadLimiter = uploadLimiter;
// 默认使用通用限流
exports.rateLimiter = apiLimiter;