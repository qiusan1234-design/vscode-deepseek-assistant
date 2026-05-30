import { Router, Request, Response } from 'express';
import type { Claude1MContextEngine, QueryRequest } from '@claude-1m/core';

export function queryRouter(engine: Claude1MContextEngine): Router {
  const router = Router();

  // Send a query
  router.post('/', async (req: Request, res: Response) => {
    try {
      const queryReq: QueryRequest = {
        query: req.body.query,
        contextTreeId: req.body.contextTreeId,
        maxTokens: req.body.maxTokens,
        temperature: req.body.temperature,
        topK: req.body.topK,
        includeSources: req.body.includeSources ?? true,
        language: req.body.language || 'auto',
        systemPrompt: req.body.systemPrompt,
        stream: req.body.stream || false,
      };

      if (!queryReq.query || typeof queryReq.query !== 'string') {
        res.status(400).json({ error: 'Query string is required' });
        return;
      }

      if (req.body.stream) {
        // Server-Sent Events streaming
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        const stream = engine.queryStream(queryReq);
        for await (const chunk of stream) {
          res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        }
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }

      const result = await engine.query(queryReq);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Memory operations
  router.get('/memory', (_req: Request, res: Response) => {
    try {
      const store = engine.getMemoryStore();
      res.json(store);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/memory', (req: Request, res: Response) => {
    try {
      const { label, content, priority, ttlMinutes } = req.body;
      if (!label || !content) {
        res.status(400).json({ error: 'label and content are required' });
        return;
      }
      engine.addMemory(label, content, priority ?? 5, ttlMinutes);
      res.status(201).json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.delete('/memory/:slotId', (req: Request, res: Response) => {
    try {
      engine.removeMemory(req.params.slotId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
