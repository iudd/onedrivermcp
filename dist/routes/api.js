"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get('/files', (req, res) => {
    res.json({
        success: true,
        data: {
            files: [],
            message: 'OneDrive API placeholder'
        }
    });
});
router.post('/upload', (req, res) => {
    res.json({
        success: true,
        message: 'File upload placeholder'
    });
});
exports.default = router;