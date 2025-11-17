import winston from 'winston';
const logFormat = winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json());
const developmentFormat = winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.colorize(), winston.format.simple());
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.NODE_ENV === 'production' ? logFormat : developmentFormat,
    defaultMeta: { service: 'onedrive-mcp-server' },
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
    ],
});
// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
//# sourceMappingURL=logger.js.map