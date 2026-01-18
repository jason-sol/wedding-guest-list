"use strict";
/**
 * Authentication routes.
 * Supports dual auth: owner via env vars, other users via bcrypt-hashed passwords.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const crypto_1 = __importDefault(require("crypto"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const config_1 = require("../config");
const sessionStore_1 = require("../sessionStore");
const store_1 = require("../store");
const validation_1 = require("../validation");
const apiResponse_1 = require("../apiResponse");
const router = express_1.default.Router();
const config = (0, config_1.getConfig)();
/**
 * Validates owner credentials from environment variables.
 * Uses constant-time comparison to prevent timing attacks.
 */
function isOwnerCredentials(username, password) {
    const ownerCreds = config.auth.credentials[0]; // Owner is always first credential
    if (!ownerCreds)
        return false;
    // Use constant-time comparison to prevent timing attacks
    const usernameMatch = crypto_1.default.timingSafeEqual(Buffer.from(username.padEnd(256)), Buffer.from(ownerCreds.username.padEnd(256)));
    const passwordMatch = crypto_1.default.timingSafeEqual(Buffer.from(password.padEnd(256)), Buffer.from(ownerCreds.password.padEnd(256)));
    return usernameMatch && passwordMatch;
}
/**
 * Get or create owner user record.
 * Owner user is created on first login and uses env vars for auth.
 */
function getOrCreateOwnerUser(username) {
    let ownerUser = store_1.store.getUserByUsername(username);
    if (!ownerUser) {
        // Create owner user record (passwordHash is empty - uses env vars)
        ownerUser = store_1.store.addUser({
            username,
            passwordHash: '', // Owner uses env vars, not stored password
            isOwner: true,
            createdAt: Date.now(),
            createdBy: 'system',
        });
        console.log(`Created owner user record: ${username}`);
    }
    else if (!ownerUser.isOwner) {
        // User exists but isn't marked as owner - update it
        store_1.store.updateUser(ownerUser.id, { isOwner: true });
        ownerUser.isOwner = true;
    }
    return {
        id: ownerUser.id,
        username: ownerUser.username,
        isOwner: true,
    };
}
// POST /api/auth/login
router.post('/login', async (req, res) => {
    const validation = (0, validation_1.validate)(validation_1.LoginSchema, req.body);
    if (!validation.success) {
        return (0, apiResponse_1.sendValidationError)(res, validation.error, validation.details);
    }
    const { username, password } = validation.data;
    // First, check if this is the owner logging in (env var credentials)
    if (isOwnerCredentials(username, password)) {
        const ownerUser = getOrCreateOwnerUser(username);
        // Generate session
        const token = crypto_1.default.randomBytes(32).toString('hex');
        const now = Date.now();
        const expiresAt = now + config.auth.sessionDurationMs;
        const sessionStore = (0, sessionStore_1.getSessionStore)();
        sessionStore.set(token, {
            userId: ownerUser.id,
            username: ownerUser.username,
            isOwner: true,
            expiresAt,
            createdAt: now,
        });
        return (0, apiResponse_1.sendSuccess)(res, {
            token,
            userId: ownerUser.id,
            username: ownerUser.username,
            isOwner: true,
            expiresAt,
        });
    }
    // Not owner - check regular users
    const user = store_1.store.getUserByUsername(username);
    if (!user) {
        return (0, apiResponse_1.sendUnauthorized)(res, 'Invalid username or password');
    }
    // Owner users must use env var credentials, not stored password
    if (user.isOwner) {
        return (0, apiResponse_1.sendUnauthorized)(res, 'Invalid username or password');
    }
    // Verify password with bcrypt
    const passwordValid = await bcrypt_1.default.compare(password, user.passwordHash);
    if (!passwordValid) {
        return (0, apiResponse_1.sendUnauthorized)(res, 'Invalid username or password');
    }
    // Generate session
    const token = crypto_1.default.randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = now + config.auth.sessionDurationMs;
    const sessionStore = (0, sessionStore_1.getSessionStore)();
    sessionStore.set(token, {
        userId: user.id,
        username: user.username,
        isOwner: false,
        expiresAt,
        createdAt: now,
    });
    return (0, apiResponse_1.sendSuccess)(res, {
        token,
        userId: user.id,
        username: user.username,
        isOwner: false,
        expiresAt,
    });
});
// POST /api/auth/logout
router.post('/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const sessionStore = (0, sessionStore_1.getSessionStore)();
        sessionStore.delete(token);
    }
    (0, apiResponse_1.sendSuccess)(res, { message: 'Logged out successfully' });
});
// GET /api/auth/check
router.get('/check', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return (0, apiResponse_1.sendUnauthorized)(res, 'Not authenticated');
    }
    const token = authHeader.substring(7);
    const sessionStore = (0, sessionStore_1.getSessionStore)();
    const session = sessionStore.get(token);
    if (!session) {
        return (0, apiResponse_1.sendUnauthorized)(res, 'Invalid or expired session');
    }
    // Session expiry is handled by sessionStore.get()
    (0, apiResponse_1.sendSuccess)(res, {
        authenticated: true,
        userId: session.userId,
        username: session.username,
        isOwner: session.isOwner,
    });
});
exports.default = router;
