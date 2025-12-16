import express, { Request, Response } from 'express';
import crypto from 'crypto';

const router = express.Router();

// In-memory session store (in production, use Redis or database)
// Export it so middleware can access it
export const sessions = new Map<string, { username: string; expiresAt: number }>();

// Support multiple credential pairs
// Primary credentials - trim whitespace
const USERNAME_1 = (process.env.AUTH_USERNAME || process.env.AUTH_USERNAME_1 || 'jason').trim();
const PASSWORD_1 = (process.env.AUTH_PASSWORD || process.env.AUTH_PASSWORD_1 || 'jason').trim();

// Secondary credentials (optional) - trim whitespace if present
const USERNAME_2 = process.env.AUTH_USERNAME_2?.trim();
const PASSWORD_2 = process.env.AUTH_PASSWORD_2?.trim();

// Helper function to validate credentials
function isValidCredentials(username: string, password: string): boolean {
  // Check primary credentials
  if (username === USERNAME_1 && password === PASSWORD_1) {
    return true;
  }
  
  // Check secondary credentials if configured
  if (USERNAME_2 && PASSWORD_2 && username === USERNAME_2 && password === PASSWORD_2) {
    return true;
  }
  
  return false;
}

// Session expiration time (24 hours)
const SESSION_DURATION = 24 * 60 * 60 * 1000;

// Clean up expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (session.expiresAt < now) {
      sessions.delete(token);
    }
  }
}, 60 * 60 * 1000); // Run every hour

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  const { username: rawUsername, password: rawPassword } = req.body;
  
  // Trim whitespace from credentials
  const username = rawUsername?.trim();
  const password = rawPassword?.trim();

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  // Validate credentials
  if (isValidCredentials(username, password)) {
    // Generate a secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + SESSION_DURATION;
    
    sessions.set(token, { username, expiresAt });
    
    return res.json({ 
      token,
      username,
      expiresAt 
    });
  }

  res.status(401).json({ error: 'Invalid username or password' });
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    sessions.delete(token);
  }
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/check
router.get('/check', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ authenticated: false });
  }

  const token = authHeader.substring(7);
  const session = sessions.get(token);

  if (!session) {
    return res.status(401).json({ authenticated: false });
  }

  // Check if session expired
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return res.status(401).json({ authenticated: false });
  }

  res.json({ authenticated: true, username: session.username });
});

export default router;
