"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessions = void 0;
const express_1 = __importDefault(require("express"));
const crypto_1 = __importDefault(require("crypto"));
const router = express_1.default.Router();
// In-memory session store (in production, use Redis or database)
// Export it so middleware can access it
exports.sessions = new Map();
// Default credentials (should be in environment variables in production)
const DEFAULT_USERNAME = process.env.AUTH_USERNAME || 'jason';
const DEFAULT_PASSWORD = process.env.AUTH_PASSWORD || 'jason';
// Session expiration time (24 hours)
const SESSION_DURATION = 24 * 60 * 60 * 1000;
// Clean up expired sessions periodically
setInterval(() => {
    const now = Date.now();
    for (const [token, session] of exports.sessions.entries()) {
        if (session.expiresAt < now) {
            exports.sessions.delete(token);
        }
    }
}, 60 * 60 * 1000); // Run every hour
// POST /api/auth/login
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    // Validate credentials
    if (username === DEFAULT_USERNAME && password === DEFAULT_PASSWORD) {
        // Generate a secure token
        const token = crypto_1.default.randomBytes(32).toString('hex');
        const expiresAt = Date.now() + SESSION_DURATION;
        exports.sessions.set(token, { username, expiresAt });
        return res.json({
            token,
            username,
            expiresAt
        });
    }
    res.status(401).json({ error: 'Invalid username or password' });
});
// POST /api/auth/logout
router.post('/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        exports.sessions.delete(token);
    }
    res.json({ message: 'Logged out successfully' });
});
// GET /api/auth/check
router.get('/check', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ authenticated: false });
    }
    const token = authHeader.substring(7);
    const session = exports.sessions.get(token);
    if (!session) {
        return res.status(401).json({ authenticated: false });
    }
    // Check if session expired
    if (session.expiresAt < Date.now()) {
        exports.sessions.delete(token);
        return res.status(401).json({ authenticated: false });
    }
    res.json({ authenticated: true, username: session.username });
});
exports.default = router;
