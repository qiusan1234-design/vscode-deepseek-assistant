// ============================================================
// Local API Server — Express + WebSocket
// ============================================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { Claude1MContextEngine, EngineConfig } from '@claude-1m/core';
import { contextRouter } from './routes/context';
import { documentsRouter } from './routes/documents';
import { queryRouter } from './routes/query';
import { authMiddleware } from './middleware/auth';

const PORT = parseInt(process.env.PORT || '3721', 10);
const HOST = process.env.HOST || '127.0.0.1';

const engineConfig: EngineConfig = {
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
  maxContextTokens: parseInt(process.env.MAX_CONTEXT_TOKENS || '900000', 10),
  cacheDir: process.env.CACHE_DIR || './data/cache',
  vectorCacheDir: process.env.VECTOR_CACHE_DIR || './data/vector-cache',
};

let engine: Claude1MContextEngine;

async function main() {
  engine = new Claude1MContextEngine(engineConfig);
  await engine.initialize();

  const app = express();

  // Security
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'vscode://'],
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Logging
  app.use(morgan('dev'));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      version: '1.0.0',
      uptime: process.uptime(),
      pid: process.pid,
    });
  });

  // Engine status
  app.get('/api/status', authMiddleware, async (_req, res) => {
    try {
      const stats = await engine.getCacheStats();
      res.json({ status: 'ok', ...stats });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Routes
  app.use('/api/context', authMiddleware, contextRouter(engine));
  app.use('/api/documents', authMiddleware, documentsRouter(engine));
  app.use('/api/query', authMiddleware, queryRouter(engine));

  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  const server = createServer(app);

  // WebSocket for streaming responses
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');

    ws.on('message', async (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'query' && msg.payload) {
          const stream = engine.queryStream(msg.payload);
          for await (const chunk of stream) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'chunk', data: chunk }));
            }
          }
          ws.send(JSON.stringify({ type: 'done' }));
        }
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', error: (err as Error).message }));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  server.listen(PORT, HOST, () => {
    console.log(`\n  === Claude 1M Context Engine Server ===`);
    console.log(`  Local:   http://${HOST}:${PORT}`);
    console.log(`  Health:  http://${HOST}:${PORT}/health`);
    console.log(`  WebSocket: ws://${HOST}:${PORT}/ws`);
    console.log(`  ========================================\n`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...');
    wss.close();
    server.close();
    await engine.shutdown();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
