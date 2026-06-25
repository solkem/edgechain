import { NextFunction, Request, Response } from 'express';

const LOCAL_ORIGINS = new Set([
  'http://localhost:5173',
  'http://localhost:8080',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8080',
]);

export function requireTrustedPilotOrigin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  const origin = req.header('origin');
  if (!origin) {
    // Allows coordinator scripts and server-to-server calls authenticated by
    // their own secret. Browsers always send Origin for cross-origin JSON posts.
    next();
    return;
  }

  const configured = new Set(
    (process.env.CORS_ORIGINS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );
  if (process.env.NODE_ENV !== 'production') {
    for (const localOrigin of LOCAL_ORIGINS) configured.add(localOrigin);
  }

  if (!configured.has(origin)) {
    res.status(403).json({ error: 'untrusted_origin' });
    return;
  }
  next();
}
