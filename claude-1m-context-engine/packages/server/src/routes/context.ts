import { Router, Request, Response } from 'express';
import type { Claude1MContextEngine, ContextTree } from '@claude-1m/core';

export function contextRouter(engine: Claude1MContextEngine): Router {
  const router = Router();

  // List all context trees
  router.get('/', (_req: Request, res: Response) => {
    try {
      const trees = engine.listContextTrees();
      res.json({ trees });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Create a new context tree
  router.post('/', (req: Request, res: Response) => {
    try {
      const { name } = req.body;
      if (!name || typeof name !== 'string') {
        res.status(400).json({ error: 'Name is required' });
        return;
      }
      const tree = engine.createContextTree(name);
      res.status(201).json({ tree });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Get a specific tree
  router.get('/:treeId', (req: Request, res: Response) => {
    try {
      const tree = engine.getContextTree(req.params.treeId);
      if (!tree) {
        res.status(404).json({ error: 'Context tree not found' });
        return;
      }
      res.json({ tree });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Add a document node to a tree
  router.post('/:treeId/nodes', async (req: Request, res: Response) => {
    try {
      const { docId, parentId, title, tags } = req.body;
      if (!docId) {
        res.status(400).json({ error: 'docId is required' });
        return;
      }

      // Ingest first if path provided
      const docMeta = await engine.ingestFile(docId, title, tags);
      const node = engine.addToTree(req.params.treeId, docMeta, parentId);
      res.status(201).json({ node, docMeta });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Pin a node
  router.post('/:treeId/nodes/:nodeId/pin', (req: Request, res: Response) => {
    try {
      engine.pinNode(req.params.treeId, req.params.nodeId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Remove a node
  router.delete('/:treeId/nodes/:nodeId', (req: Request, res: Response) => {
    try {
      engine.removeFromTree(req.params.treeId, req.params.nodeId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
