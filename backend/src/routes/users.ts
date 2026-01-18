/**
 * User management routes (owner only).
 * Handles CRUD operations for users and their permissions.
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { store } from '../store';
import { validate, CreateUserSchema, UpdateUserSchema } from '../validation';
import { sendSuccess, sendCreated, sendNoContent, sendNotFound, sendValidationError, sendError } from '../apiResponse';

const router = Router();
const BCRYPT_ROUNDS = 12;

// GET /api/users - List all users
router.get('/', (req: Request, res: Response) => {
  const users = store.getAllUsers();

  // Don't send password hashes to client
  const safeUsers = users.map(user => ({
    id: user.id,
    username: user.username,
    isOwner: user.isOwner,
    createdAt: user.createdAt,
    createdBy: user.createdBy,
  }));

  sendSuccess(res, safeUsers);
});

// GET /api/users/:id - Get a specific user
router.get('/:id', (req: Request, res: Response) => {
  const user = store.getUser(req.params.id);

  if (!user) {
    return sendNotFound(res, 'User');
  }

  // Don't send password hash
  const safeUser = {
    id: user.id,
    username: user.username,
    isOwner: user.isOwner,
    createdAt: user.createdAt,
    createdBy: user.createdBy,
  };

  sendSuccess(res, safeUser);
});

// POST /api/users - Create a new user
router.post('/', async (req: Request, res: Response) => {
  const validation = validate(CreateUserSchema, req.body);

  if (!validation.success) {
    return sendValidationError(res, validation.error, validation.details);
  }

  const { username, password } = validation.data;

  // Check if username already exists
  const existingUser = store.getUserByUsername(username);
  if (existingUser) {
    return sendError(res, 'Username already exists', 409);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Create user
  const user = store.addUser({
    username,
    passwordHash,
    isOwner: false,
    createdAt: Date.now(),
    createdBy: req.user?.username || 'system',
  });

  // Assign default viewer permissions for all existing events
  store.assignDefaultPermissions(user.id);

  // Don't send password hash
  const safeUser = {
    id: user.id,
    username: user.username,
    isOwner: user.isOwner,
    createdAt: user.createdAt,
    createdBy: user.createdBy,
  };

  sendCreated(res, safeUser);
});

// PUT /api/users/:id - Update a user (change password)
router.put('/:id', async (req: Request, res: Response) => {
  const user = store.getUser(req.params.id);

  if (!user) {
    return sendNotFound(res, 'User');
  }

  // Cannot modify owner user
  if (user.isOwner) {
    return sendError(res, 'Cannot modify owner user. Change owner credentials via environment variables.', 403);
  }

  const validation = validate(UpdateUserSchema, req.body);

  if (!validation.success) {
    return sendValidationError(res, validation.error, validation.details);
  }

  const updates: { passwordHash?: string } = {};

  if (validation.data.password) {
    updates.passwordHash = await bcrypt.hash(validation.data.password, BCRYPT_ROUNDS);
  }

  const updated = store.updateUser(req.params.id, updates);

  if (!updated) {
    return sendNotFound(res, 'User');
  }

  // Don't send password hash
  const safeUser = {
    id: updated.id,
    username: updated.username,
    isOwner: updated.isOwner,
    createdAt: updated.createdAt,
    createdBy: updated.createdBy,
  };

  sendSuccess(res, safeUser);
});

// DELETE /api/users/:id - Delete a user
router.delete('/:id', (req: Request, res: Response) => {
  const user = store.getUser(req.params.id);

  if (!user) {
    return sendNotFound(res, 'User');
  }

  // Cannot delete owner user
  if (user.isOwner) {
    return sendError(res, 'Cannot delete owner user', 403);
  }

  const deleted = store.deleteUser(req.params.id);

  if (!deleted) {
    return sendNotFound(res, 'User');
  }

  sendNoContent(res);
});

// GET /api/users/:id/permissions - Get user's event permissions
router.get('/:id/permissions', (req: Request, res: Response) => {
  const user = store.getUser(req.params.id);

  if (!user) {
    return sendNotFound(res, 'User');
  }

  // Owner has full access to everything
  if (user.isOwner) {
    const events = store.getAllEvents();
    const permissions = events.map(event => ({
      userId: user.id,
      eventId: event.id,
      permission: 'admin' as const, // Owner effectively has admin on all
    }));
    return sendSuccess(res, permissions);
  }

  const permissions = store.getUserPermissions(user.id);

  // Include events with no explicit permission (defaults to viewer)
  const events = store.getAllEvents();
  const result = events.map(event => {
    const existing = permissions.find(p => p.eventId === event.id);
    return existing || {
      userId: user.id,
      eventId: event.id,
      permission: 'viewer' as const,
    };
  });

  sendSuccess(res, result);
});

export default router;
