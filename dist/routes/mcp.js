"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get('/sse', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    res.write('event: connected\n');
    res.write('data: {\"message\": \"MCP SSE connected\"}\n\n');
    const interval = setInterval(() => {
        res.write('event: ping\n');
        res.write('data: {\"timestamp\": \"' + new Date().toISOString() + '\"}\n\n');
    }, 30000);
    req.on('close', () => {
        clearInterval(interval);
    });
});
router.post('/tools', (req, res) => {
    res.json({
        success: true,
        message: 'MCP tools endpoint placeholder'
    });
});
exports.default = router;