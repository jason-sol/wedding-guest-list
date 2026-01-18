import { Request, Response, NextFunction } from 'express';
import { getSessionStore } from '../sessionStore';
import { sendUnauthorized } from '../apiResponse';

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        isOwner: boolean;
      };
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendUnauthorized(res, 'Authentication required');
  }

  const token = authHeader.substring(7);
  const sessionStore = getSessionStore();
  const session = sessionStore.get(token);

  // Session expiry is handled by sessionStore.get()
  if (!session) {
    return sendUnauthorized(res, 'Invalid or expired token');
  }

  // Attach user info to request (now properly typed)
  req.user = {
    userId: session.userId,
    username: session.username,
    isOwner: session.isOwner,
  };
  next();
}
