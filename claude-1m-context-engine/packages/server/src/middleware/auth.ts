import { Request, Response, NextFunction } from 'express';

// Lightweight local-only auth — server is designed for local/private deployment
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const localToken = process.env.LOCAL_API_TOKEN;

  // If no token is set, allow all localhost connections
  if (!localToken) {
    const ip = req.ip || req.socket.remoteAddress || '';
    if (
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip === '::ffff:127.0.0.1' ||
      ip.startsWith('192.168.') ||
      ip.startsWith('10.') ||
      ip.startsWith('172.')
    ) {
      next();
      return;
    }
    // Block non-local connections when no token is set
    res.status(403).json({
      error: 'Remote access denied. Set LOCAL_API_TOKEN to allow external connections.',
    });
    return;
  }

  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${localToken}`) {
    res.status(401).json({ error: 'Invalid or missing API token' });
    return;
  }

  next();
}
