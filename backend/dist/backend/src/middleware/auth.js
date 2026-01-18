"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const sessionStore_1 = require("../sessionStore");
const apiResponse_1 = require("../apiResponse");
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return (0, apiResponse_1.sendUnauthorized)(res, 'Authentication required');
    }
    const token = authHeader.substring(7);
    const sessionStore = (0, sessionStore_1.getSessionStore)();
    const session = sessionStore.get(token);
    // Session expiry is handled by sessionStore.get()
    if (!session) {
        return (0, apiResponse_1.sendUnauthorized)(res, 'Invalid or expired token');
    }
    // Attach user info to request (now properly typed)
    req.user = {
        userId: session.userId,
        username: session.username,
        isOwner: session.isOwner,
    };
    next();
}
