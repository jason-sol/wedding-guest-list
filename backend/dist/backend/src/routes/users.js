"use strict";
/**
 * User management routes (owner only).
 * Handles CRUD operations for users and their permissions.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const store_1 = require("../store");
const validation_1 = require("../validation");
const apiResponse_1 = require("../apiResponse");
const router = (0, express_1.Router)();
const BCRYPT_ROUNDS = 12;
// GET /api/users - List all users
router.get('/', (req, res) => {
    const users = store_1.store.getAllUsers();
    // Don't send password hashes to client
    const safeUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        isOwner: user.isOwner,
        createdAt: user.createdAt,
        createdBy: user.createdBy,
    }));
    (0, apiResponse_1.sendSuccess)(res, safeUsers);
});
// GET /api/users/:id - Get a specific user
router.get('/:id', (req, res) => {
    const user = store_1.store.getUser(req.params.id);
    if (!user) {
        return (0, apiResponse_1.sendNotFound)(res, 'User');
    }
    // Don't send password hash
    const safeUser = {
        id: user.id,
        username: user.username,
        isOwner: user.isOwner,
        createdAt: user.createdAt,
        createdBy: user.createdBy,
    };
    (0, apiResponse_1.sendSuccess)(res, safeUser);
});
// POST /api/users - Create a new user
router.post('/', async (req, res) => {
    const validation = (0, validation_1.validate)(validation_1.CreateUserSchema, req.body);
    if (!validation.success) {
        return (0, apiResponse_1.sendValidationError)(res, validation.error, validation.details);
    }
    const { username, password } = validation.data;
    // Check if username already exists
    const existingUser = store_1.store.getUserByUsername(username);
    if (existingUser) {
        return (0, apiResponse_1.sendError)(res, 'Username already exists', 409);
    }
    // Hash password
    const passwordHash = await bcrypt_1.default.hash(password, BCRYPT_ROUNDS);
    // Create user
    const user = store_1.store.addUser({
        username,
        passwordHash,
        isOwner: false,
        createdAt: Date.now(),
        createdBy: req.user?.username || 'system',
    });
    // Assign default viewer permissions for all existing events
    store_1.store.assignDefaultPermissions(user.id);
    // Don't send password hash
    const safeUser = {
        id: user.id,
        username: user.username,
        isOwner: user.isOwner,
        createdAt: user.createdAt,
        createdBy: user.createdBy,
    };
    (0, apiResponse_1.sendCreated)(res, safeUser);
});
// PUT /api/users/:id - Update a user (change password)
router.put('/:id', async (req, res) => {
    const user = store_1.store.getUser(req.params.id);
    if (!user) {
        return (0, apiResponse_1.sendNotFound)(res, 'User');
    }
    // Cannot modify owner user
    if (user.isOwner) {
        return (0, apiResponse_1.sendError)(res, 'Cannot modify owner user. Change owner credentials via environment variables.', 403);
    }
    const validation = (0, validation_1.validate)(validation_1.UpdateUserSchema, req.body);
    if (!validation.success) {
        return (0, apiResponse_1.sendValidationError)(res, validation.error, validation.details);
    }
    const updates = {};
    if (validation.data.password) {
        updates.passwordHash = await bcrypt_1.default.hash(validation.data.password, BCRYPT_ROUNDS);
    }
    const updated = store_1.store.updateUser(req.params.id, updates);
    if (!updated) {
        return (0, apiResponse_1.sendNotFound)(res, 'User');
    }
    // Don't send password hash
    const safeUser = {
        id: updated.id,
        username: updated.username,
        isOwner: updated.isOwner,
        createdAt: updated.createdAt,
        createdBy: updated.createdBy,
    };
    (0, apiResponse_1.sendSuccess)(res, safeUser);
});
// DELETE /api/users/:id - Delete a user
router.delete('/:id', (req, res) => {
    const user = store_1.store.getUser(req.params.id);
    if (!user) {
        return (0, apiResponse_1.sendNotFound)(res, 'User');
    }
    // Cannot delete owner user
    if (user.isOwner) {
        return (0, apiResponse_1.sendError)(res, 'Cannot delete owner user', 403);
    }
    const deleted = store_1.store.deleteUser(req.params.id);
    if (!deleted) {
        return (0, apiResponse_1.sendNotFound)(res, 'User');
    }
    (0, apiResponse_1.sendNoContent)(res);
});
// GET /api/users/:id/permissions - Get user's event permissions
router.get('/:id/permissions', (req, res) => {
    const user = store_1.store.getUser(req.params.id);
    if (!user) {
        return (0, apiResponse_1.sendNotFound)(res, 'User');
    }
    // Owner has full access to everything
    if (user.isOwner) {
        const events = store_1.store.getAllEvents();
        const permissions = events.map(event => ({
            userId: user.id,
            eventId: event.id,
            permission: 'admin', // Owner effectively has admin on all
        }));
        return (0, apiResponse_1.sendSuccess)(res, permissions);
    }
    const permissions = store_1.store.getUserPermissions(user.id);
    // Include events with no explicit permission (defaults to viewer)
    const events = store_1.store.getAllEvents();
    const result = events.map(event => {
        const existing = permissions.find(p => p.eventId === event.id);
        return existing || {
            userId: user.id,
            eventId: event.id,
            permission: 'viewer',
        };
    });
    (0, apiResponse_1.sendSuccess)(res, result);
});
exports.default = router;
