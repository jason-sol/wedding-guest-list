/**
 * Session store with file-based persistence.
 * Sessions survive server restarts but are cleaned up when expired.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { getConfig } from './config';

export interface Session {
  userId: string;
  username: string;
  isOwner: boolean;
  expiresAt: number;
  createdAt: number;
}

interface SessionData {
  sessions: Record<string, Session>;
  lastCleanup: number;
}

const SESSION_FILE = 'sessions.json';

class SessionStore {
  private sessions: Map<string, Session> = new Map();
  private filePath: string;
  private saveTimeout: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private initialized = false;

  constructor() {
    const config = getConfig();
    this.filePath = path.join(config.data.directory, SESSION_FILE);
  }

  /**
   * Initialize the session store - loads existing sessions from disk.
   * Must be called before using the store.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.loadFromFile();
    this.startCleanupInterval();
    this.initialized = true;
  }

  /**
   * Get a session by token.
   */
  get(token: string): Session | undefined {
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
  set(token: string, session: Session): void {
    this.sessions.set(token, session);
    this.scheduleSave();
  }

  /**
   * Delete a session.
   */
  delete(token: string): boolean {
    const deleted = this.sessions.delete(token);
    if (deleted) {
      this.scheduleSave();
    }
    return deleted;
  }

  /**
   * Check if a token exists and is valid.
   */
  has(token: string): boolean {
    return this.get(token) !== undefined;
  }

  /**
   * Get all sessions (for debugging/admin purposes).
   */
  getAll(): Map<string, Session> {
    return new Map(this.sessions);
  }

  /**
   * Get count of active sessions.
   */
  get size(): number {
    return this.sessions.size;
  }

  /**
   * Load sessions from file.
   */
  private async loadFromFile(): Promise<void> {
    try {
      const config = getConfig();

      // Ensure data directory exists
      await fs.mkdir(config.data.directory, { recursive: true });

      const data = await fs.readFile(this.filePath, 'utf-8');
      const parsed: SessionData = JSON.parse(data);

      // Load sessions, filtering out expired ones
      const now = Date.now();
      for (const [token, session] of Object.entries(parsed.sessions)) {
        if (session.expiresAt > now) {
          this.sessions.set(token, session);
        }
      }

      console.log(`Loaded ${this.sessions.size} active sessions from disk`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist - that's fine, start fresh
        console.log('No existing sessions file, starting fresh');
      } else {
        console.error('Error loading sessions:', error);
      }
    }
  }

  /**
   * Save sessions to file.
   * Uses debouncing to avoid excessive writes.
   */
  private scheduleSave(): void {
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
  private async saveToFile(): Promise<void> {
    try {
      const config = getConfig();

      // Ensure data directory exists
      await fs.mkdir(config.data.directory, { recursive: true });

      const data: SessionData = {
        sessions: Object.fromEntries(this.sessions),
        lastCleanup: Date.now(),
      };

      // Write atomically using temp file + rename
      const tempPath = `${this.filePath}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      await fs.rename(tempPath, this.filePath);
    } catch (error) {
      console.error('Error saving sessions to file:', error);
    }
  }

  /**
   * Start periodic cleanup of expired sessions.
   */
  private startCleanupInterval(): void {
    const config = getConfig();

    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, config.auth.sessionCleanupIntervalMs);

    // Don't prevent process exit
    this.cleanupInterval.unref();
  }

  /**
   * Remove expired sessions.
   */
  private cleanupExpired(): void {
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
  async flush(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    await this.saveToFile();
  }

  /**
   * Stop the cleanup interval and save sessions.
   */
  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    await this.flush();
  }
}

// Singleton instance
let storeInstance: SessionStore | null = null;

/**
 * Get the session store instance.
 * Call initialize() before first use.
 */
export function getSessionStore(): SessionStore {
  if (!storeInstance) {
    storeInstance = new SessionStore();
  }
  return storeInstance;
}

/**
 * Reset the store instance (for testing).
 */
export function resetSessionStore(): void {
  if (storeInstance) {
    storeInstance.shutdown().catch(console.error);
  }
  storeInstance = null;
}
