"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const logger_js_1 = require("./utils/logger.js");
const errorHandler_js_1 = require("./middleware/errorHandler.js");
const rateLimiter_js_1 = require("./middleware/rateLimiter.js");
// Routes
const auth_js_1 = __importDefault(require("./routes/auth.js"));
const mcp_js_1 = __importDefault(require("./routes/mcp.js"));
const api_js_1 = __importDefault(require("./routes/api.js"));
// Initialize environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;

// Trust proxy settings for reverse proxy environments (e.g., Render.com)
app.set('trust proxy', true);
// Security middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));
// Compression
app.use((0, compression_1.default)());
// CORS configuration
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://yourdomain.com']
        : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
}));
// Body parsing
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Rate limiting
app.use(rateLimiter_js_1.rateLimiter);
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
    });
});
// API routes
app.use('/api/auth', auth_js_1.default);
app.use('/api', api_js_1.default);
app.use('/mcp', mcp_js_1.default);
// Error handling
app.use(errorHandler_js_1.errorHandler);
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
    });
});
// Create HTTP server for SSE support
const server = (0, http_1.createServer)(app);
// Graceful shutdown
process.on('SIGTERM', () => {
    logger_js_1.logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger_js_1.logger.info('Process terminated');
    });
});
process.on('SIGINT', () => {
    logger_js_1.logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
        logger_js_1.logger.info('Process terminated');
    });
});
// Start server
server.listen(PORT, () => {
    logger_js_1.logger.info(`🚀 OneDrive MCP Server running on port ${PORT}`);
    logger_js_1.logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger_js_1.logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
});
exports.default = app;