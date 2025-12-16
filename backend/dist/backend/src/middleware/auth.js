"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const auth_1 = require("../routes/auth");
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    const token = authHeader.substring(7);
    const session = auth_1.sessions.get(token);
    if (!session) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
    // Check if session expired
    if (session.expiresAt < Date.now()) {
        auth_1.sessions.delete(token);
        return res.status(401).json({ error: 'Session expired' });
    }
    // Attach user info to request
    req.user = { username: session.username };
    next();
}
