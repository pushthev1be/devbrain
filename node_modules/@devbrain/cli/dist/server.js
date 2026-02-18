"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = startServer;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const core_1 = require("@devbrain/core");
function startServer(port = 3000) {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    app.get('/api/fixes', async (req, res) => {
        res.json(await core_1.storage.getFixes());
    });
    app.get('/api/stats', async (req, res) => {
        res.json(await core_1.storage.getStats());
    });
    app.post('/api/fixes', async (req, res) => {
        const fix = req.body;
        await core_1.storage.saveFix(fix);
        res.status(201).json({ success: true });
    });
    app.get('/api/anti-patterns', async (req, res) => {
        res.json(await core_1.storage.getAntiPatterns());
    });
    app.post('/api/anti-patterns', async (req, res) => {
        const pattern = req.body;
        await core_1.storage.saveAntiPattern(pattern);
        res.status(201).json({ success: true });
    });
    app.listen(port, () => {
        console.log(`[DevBrain API] Server running at http://localhost:${port}`);
    });
}
