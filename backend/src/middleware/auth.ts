import { Request, Response, NextFunction } from 'express';
import { sessions } from '../routes/auth';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.substring(7);
  const session = sessions.get(token);

  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Check if session expired
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Session expired' });
  }

  // Attach user info to request
  (req as any).user = { username: session.username };
  next();
}
