"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCallId = generateCallId;
exports.formatFileSize = formatFileSize;
exports.validateFilePath = validateFilePath;
exports.delay = delay;
exports.retry = retry;
exports.generateRandomString = generateRandomString;
exports.isValidUrl = isValidUrl;
exports.deepClone = deepClone;
const uuid_1 = require("uuid");
/**
 * 生成唯一的调用ID
 */
function generateCallId() {
    return (0, uuid_1.v4)();
}
/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
    if (bytes === 0)
        return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
/**
 * 验证文件路径
 */
function validateFilePath(path) {
    if (!path || typeof path !== 'string')
        return false;
    // 检查路径格式
    const pathRegex = /^[\w\s\-\.\/]+$/;
    return pathRegex.test(path) && !path.includes('..');
}
/**
 * 延迟函数
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * 重试函数
 */
async function retry(fn, maxRetries = 3, delayMs = 1000) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (i < maxRetries - 1) {
                await delay(delayMs * Math.pow(2, i)); // 指数退避
            }
        }
    }
    throw lastError;
}
/**
 * 生成随机字符串
 */
function generateRandomString(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
/**
 * 检查是否为有效URL
 */
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    }
    catch (_) {
        return false;
    }
}
/**
 * 深度克隆对象
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    if (obj instanceof Array) {
        return obj.map(item => deepClone(item));
    }
    if (typeof obj === 'object') {
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }
    return obj;
}
//# sourceMappingURL=helpers.js.map