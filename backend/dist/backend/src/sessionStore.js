"use strict";
/**
 * Session store with file-based persistence.
 * Sessions survive server restarts but are cleaned up when expired.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionStore = getSessionStore;
exports.resetSessionStore = resetSessionStore;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const config_1 = require("./config");
const SESSION_FILE = 'sessions.json';
class SessionStore {
    constructor() {
        this.sessions = new Map();
        this.saveTimeout = null;
        this.cleanupInterval = null;
        this.initialized = false;
        const config = (0, config_1.getConfig)();
        this.filePath = path.join(config.data.directory, SESSION_FILE);
    }
    /**
     * Initialize the session store - loads existing sessions from disk.
     * Must be called before using the store.
     */
    async initialize() {
        if (this.initialized)
            return;
        await this.loadFromFile();
        this.startCleanupInterval();
        this.initialized = true;
    }
    /**
     * Get a session by token.
     */
    get(token) {
        const session = this.sessions.get(token);
        // Check if expired
        if (session && session.expiresAt < Date.now()) {
            this.delete(token);
            return undefined;
        }
        return session;
    }
    /**
     * Create a new session.
     */
    set(token, session) {
        this.sessions.set(token, session);
        this.scheduleSave();
    }
    /**
     * Delete a session.
     */
    delete(token) {
        const deleted = this.sessions.delete(token);
        if (deleted) {
            this.scheduleSave();
        }
        return deleted;
    }
    /**
     * Check if a token exists and is valid.
     */
    has(token) {
        return this.get(token) !== undefined;
    }
    /**
     * Get all sessions (for debugging/admin purposes).
     */
    getAll() {
        return new Map(this.sessions);
    }
    /**
     * Get count of active sessions.
     */
    get size() {
        return this.sessions.size;
    }
    /**
     * Load sessions from file.
     */
    async loadFromFile() {
        try {
            const config = (0, config_1.getConfig)();
            // Ensure data directory exists
            await fs.mkdir(config.data.directory, { recursive: true });
            const data = await fs.readFile(this.filePath, 'utf-8');
            const parsed = JSON.parse(data);
            // Load sessions, filtering out expired ones
            const now = Date.now();
            for (const [token, session] of Object.entries(parsed.sessions)) {
                if (session.expiresAt > now) {
                    this.sessions.set(token, session);
                }
            }
            console.log(`Loaded ${this.sessions.size} active sessions from disk`);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                // File doesn't exist - that's fine, start fresh
                console.log('No existing sessions file, starting fresh');
            }
            else {
                console.error('Error loading sessions:', error);
            }
        }
    }
    /**
     * Save sessions to file.
     * Uses debouncing to avoid excessive writes.
     */
    scheduleSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        // Debounce saves by 1 second
        this.saveTimeout = setTimeout(() => {
            this.saveToFile().catch(err => {
                console.error('Error saving sessions:', err);
            });
        }, 1000);
    }
    /**
     * Actually write sessions to file.
     */
    async saveToFile() {
        try {
            const config = (0, config_1.getConfig)();
            // Ensure data directory exists
            await fs.mkdir(config.data.directory, { recursive: true });
            const data = {
                sessions: Object.fromEntries(this.sessions),
                lastCleanup: Date.now(),
            };
            // Write atomically using temp file + rename
            const tempPath = `${this.filePath}.tmp`;
            await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
            await fs.rename(tempPath, this.filePath);
        }
        catch (error) {
            console.error('Error saving sessions to file:', error);
        }
    }
    /**
     * Start periodic cleanup of expired sessions.
     */
    startCleanupInterval() {
        const config = (0, config_1.getConfig)();
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpired();
        }, config.auth.sessionCleanupIntervalMs);
        // Don't prevent process exit
        this.cleanupInterval.unref();
    }
    /**
     * Remove expired sessions.
     */
    cleanupExpired() {
        const now = Date.now();
        let cleaned = 0;
        for (const [token, session] of this.sessions.entries()) {
            if (session.expiresAt < now) {
                this.sessions.delete(token);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            console.log(`Cleaned up ${cleaned} expired sessions`);
            this.scheduleSave();
        }
    }
    /**
     * Force immediate save (useful for graceful shutdown).
     */
    async flush() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        await this.saveToFile();
    }
    /**
     * Stop the cleanup interval and save sessions.
     */
    async shutdown() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        await this.flush();
    }
}
// Singleton instance
let storeInstance = null;
/**
 * Get the session store instance.
 * Call initialize() before first use.
 */
function getSessionStore() {
    if (!storeInstance) {
        storeInstance = new SessionStore();
    }
    return storeInstance;
}
/**
 * Reset the store instance (for testing).
 */
function resetSessionStore() {
    if (storeInstance) {
        storeInstance.shutdown().catch(console.error);
    }
    storeInstance = null;
}
