"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createError = exports.asyncHandler = exports.errorHandler = void 0;
const logger_js_1 = require("../utils/logger.js");
const errorHandler = (error, req, res, next) => {
    let { statusCode = 500, message } = error;
    // 记录错误
    logger_js_1.logger.error('Error occurred:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    // 生产环境下隐藏敏感错误信息
    if (process.env.NODE_ENV === 'production' && !error.isOperational) {
        message = 'Something went wrong';
    }
    // 处理特定类型的错误
    if (error.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation Error';
    }
    if (error.name === 'UnauthorizedError') {
        statusCode = 401;
        message = 'Unauthorized';
    }
    if (error.name === 'ForbiddenError') {
        statusCode = 403;
        message = 'Forbidden';
    }
    if (error.name === 'NotFoundError') {
        statusCode = 404;
        message = 'Resource not found';
    }
    // 发送错误响应
    res.status(statusCode).json({
        success: false,
        error: {
            message,
            ...(process.env.NODE_ENV === 'development' && {
                stack: error.stack,
                details: error.message
            })
        }
    });
};
exports.errorHandler = errorHandler;
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
exports.asyncHandler = asyncHandler;
const createError = (message, statusCode = 500, isOperational = true) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.isOperational = isOperational;
    return error;
};
exports.createError = createError;
//# sourceMappingURL=errorHandler.js.map