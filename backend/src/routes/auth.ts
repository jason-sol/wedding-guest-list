/**
 * Authentication routes.
 * Supports dual auth: owner via env vars, other users via bcrypt-hashed passwords.
 */

import express, { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { getConfig } from '../config';
import { getSessionStore } from '../sessionStore';
import { store } from '../store';
import { validate, LoginSchema } from '../validation';
import { sendSuccess, sendValidationError, sendUnauthorized } from '../apiResponse';

const router = express.Router();
const config = getConfig();

/**
 * Validates owner credentials from environment variables.
 * Uses constant-time comparison to prevent timing attacks.
 */
function isOwnerCredentials(username: string, password: string): boolean {
  const ownerCreds = config.auth.credentials[0]; // Owner is always first credential
  if (!ownerCreds) return false;

  // Use constant-time comparison to prevent timing attacks
  const usernameMatch = crypto.timingSafeEqual(
    Buffer.from(username.padEnd(256)),
    Buffer.from(ownerCreds.username.padEnd(256))
  );
  const passwordMatch = crypto.timingSafeEqual(
    Buffer.from(password.padEnd(256)),
    Buffer.from(ownerCreds.password.padEnd(256))
  );

  return usernameMatch && passwordMatch;
}

/**
 * Get or create owner user record.
 * Owner user is created on first login and uses env vars for auth.
 */
function getOrCreateOwnerUser(username: string): { id: string; username: string; isOwner: boolean } {
  let ownerUser = store.getUserByUsername(username);

  if (!ownerUser) {
    // Create owner user record (passwordHash is empty - uses env vars)
    ownerUser = store.addUser({
      username,
      passwordHash: '', // Owner uses env vars, not stored password
      isOwner: true,
      createdAt: Date.now(),
      createdBy: 'system',
    });
    console.log(`Created owner user record: ${username}`);
  } else if (!ownerUser.isOwner) {
    // User exists but isn't marked as owner - update it
    store.updateUser(ownerUser.id, { isOwner: true });
    ownerUser.isOwner = true;
  }

  return {
    id: ownerUser.id,
    username: ownerUser.username,
    isOwner: true,
  };
}

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const validation = validate(LoginSchema, req.body);

  if (!validation.success) {
    return sendValidationError(res, validation.error, validation.details);
  }

  const { username, password } = validation.data;

  // First, check if this is the owner logging in (env var credentials)
  if (isOwnerCredentials(username, password)) {
    const ownerUser = getOrCreateOwnerUser(username);

    // Generate session
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = now + config.auth.sessionDurationMs;

    const sessionStore = getSessionStore();
    sessionStore.set(token, {
      userId: ownerUser.id,
      username: ownerUser.username,
      isOwner: true,
      expiresAt,
      createdAt: now,
    });

    return sendSuccess(res, {
      token,
      userId: ownerUser.id,
      username: ownerUser.username,
      isOwner: true,
      expiresAt,
    });
  }

  // Not owner - check regular users
  const user = store.getUserByUsername(username);

  if (!user) {
    return sendUnauthorized(res, 'Invalid username or password');
  }

  // Owner users must use env var credentials, not stored password
  if (user.isOwner) {
    return sendUnauthorized(res, 'Invalid username or password');
  }

  // Verify password with bcrypt
  const passwordValid = await bcrypt.compare(password, user.passwordHash);

  if (!passwordValid) {
    return sendUnauthorized(res, 'Invalid username or password');
  }

  // Generate session
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const expiresAt = now + config.auth.sessionDurationMs;

  const sessionStore = getSessionStore();
  sessionStore.set(token, {
    userId: user.id,
    username: user.username,
    isOwner: false,
    expiresAt,
    createdAt: now,
  });

  return sendSuccess(res, {
    token,
    userId: user.id,
    username: user.username,
    isOwner: false,
    expiresAt,
  });
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const sessionStore = getSessionStore();
    sessionStore.delete(token);
  }
  sendSuccess(res, { message: 'Logged out successfully' });
});

// GET /api/auth/check
router.get('/check', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendUnauthorized(res, 'Not authenticated');
  }

  const token = authHeader.substring(7);
  const sessionStore = getSessionStore();
  const session = sessionStore.get(token);

  if (!session) {
    return sendUnauthorized(res, 'Invalid or expired session');
  }

  // Session expiry is handled by sessionStore.get()
  sendSuccess(res, {
    authenticated: true,
    userId: session.userId,
    username: session.username,
    isOwner: session.isOwner,
  });
});

export default router;
