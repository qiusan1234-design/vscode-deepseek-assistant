import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import type { Claude1MContextEngine } from '@claude-1m/core';

const upload = multer({
  dest: path.join(process.cwd(), 'data', 'uploads'),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

export function documentsRouter(engine: Claude1MContextEngine): Router {
  const router = Router();

  // Upload and ingest a document
  router.post('/ingest', upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }
      const { title, tags } = req.body;
      const tagList: string[] = tags ? tags.split(',').map((t: string) => t.trim()) : [];

      const docMeta = await engine.ingestFile(req.file.path, title, tagList);
      res.status(201).json({ docMeta });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Ingest a file by path (local)
  router.post('/ingest-path', async (req: Request, res: Response) => {
    try {
      const { filePath, title, tags } = req.body;
      if (!filePath || !fs.existsSync(filePath)) {
        res.status(400).json({ error: 'Valid filePath is required' });
        return;
      }
      const tagList: string[] = tags || [];
      const docMeta = await engine.ingestFile(filePath, title, tagList);
      res.status(201).json({ docMeta });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Ingest entire directory
  router.post('/ingest-directory', async (req: Request, res: Response) => {
    try {
      const { dirPath } = req.body;
      if (!dirPath || !fs.statSync(dirPath).isDirectory()) {
        res.status(400).json({ error: 'Valid dirPath is required' });
        return;
      }
      const results = await engine.ingestDirectory(dirPath);
      res.status(201).json({ count: results.length, results });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Search vector cache
  router.get('/search', async (req: Request, res: Response) => {
    try {
      const q = req.query.q as string;
      const topK = parseInt(req.query.topK as string || '10', 10);
      if (!q) {
        res.status(400).json({ error: 'Query parameter q is required' });
        return;
      }
      const results = await engine.searchSimilar(q, topK);
      res.json({ results });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
