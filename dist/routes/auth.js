"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get('/test', (req, res) => {
    res.json({ message: 'Auth route working' });
});
router.post('/verify', (req, res) => {
    res.json({ success: true, message: 'Token verification placeholder' });
});
router.get('/me', (req, res) => {
    res.json({ success: true, user: { id: 'test-user', name: 'Test User' } });
});
exports.default = router;