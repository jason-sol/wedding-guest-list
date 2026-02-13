import dotenv from 'dotenv';
import path from 'path';

// Load .env file before any other imports that might use config
// Try multiple locations for flexibility in different run contexts
const envPaths = [
  path.resolve(process.cwd(), '../.env'),  // Project root from backend/
  path.resolve(process.cwd(), '.env'),      // Current directory
  path.resolve(__dirname, '../../.env'),    // Relative to compiled output
];

for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) break;
}

import { getConfig } from './config';
import { getSessionStore } from './sessionStore';
import { store } from './store';
import { getBackupService } from './backupService';
import { createApp } from './app';

// Initialize and validate config early - will throw if required vars are missing
const config = getConfig();

const app = createApp();

// Async startup to initialize stores
async function startServer() {
  try {
    // Initialize data store (loads persisted data)
    await store.ensureInitialized();

    // Initialize session store (loads persisted sessions)
    const sessionStore = getSessionStore();
    await sessionStore.initialize();

    // Initialize backup service (starts scheduled backups)
    const backupService = getBackupService();
    await backupService.initialize();

    const server = app.listen(config.port, () => {
      console.log(`Server running on http://localhost:${config.port} [${config.env}]`);
    });

    // Graceful shutdown handler
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received, shutting down gracefully...`);

      // Stop accepting new connections
      server.close(async () => {
        console.log('HTTP server closed');

        // Save data, sessions, and create shutdown backup before exit
        await Promise.all([
          store.flush().then(() => console.log('Data saved')),
          sessionStore.shutdown().then(() => console.log('Sessions saved')),
          backupService.shutdown().then(() => console.log('Backup service stopped')),
        ]);

        process.exit(0);
      });

      // Force exit after 10 seconds
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
