import express from 'express';
import cors from 'cors';
import { storage } from '@devbrain/core';

export function startServer(port = 3000) {
    const app = express();
    app.use(cors());
    app.use(express.json());

    app.get('/api/fixes', async (req: express.Request, res: express.Response) => {
        res.json(await storage.getFixes());
    });

    app.get('/api/stats', async (req: express.Request, res: express.Response) => {
        res.json(await storage.getStats());
    });

    app.post('/api/fixes', async (req: express.Request, res: express.Response) => {
        const fix = req.body;
        await storage.saveFix(fix);
        res.status(201).json({ success: true });
    });

    app.listen(port, () => {
        console.log(`[DevBrain API] Server running at http://localhost:${port}`);
    });
}
