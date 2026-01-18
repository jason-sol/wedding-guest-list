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

import express from 'express';
import cors from 'cors';
import { getConfig } from './config';
import { getSessionStore } from './sessionStore';
import { store } from './store';
import guestsRouter from './routes/guests';
import familiesRouter from './routes/families';
import categoriesRouter from './routes/categories';
import eventsRouter from './routes/events';
import usersRouter from './routes/users';
import authRouter from './routes/auth';
import dataRouter from './routes/data';
import { authMiddleware } from './middleware/auth';
import { requireOwner } from './middleware/permissions';

// Initialize and validate config early - will throw if required vars are missing
const config = getConfig();

const app = express();

// Configure CORS based on environment
const corsOptions: cors.CorsOptions = config.isDevelopment
  ? {} // Allow all origins in development
  : {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) {
          callback(null, true);
          return;
        }
        if (config.cors.allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
      credentials: true,
    };

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Add reasonable limit for import

// Public routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Auth routes (public)
app.use('/api/auth', authRouter);

// Protected routes (require authentication)

// Events routes - includes permission-based sub-routes
app.use('/api/events', authMiddleware, eventsRouter);

// Event-scoped guest and family routes
// These are mounted under /api/events/:eventId and use mergeParams
app.use('/api/events/:eventId/guests', authMiddleware, guestsRouter);
app.use('/api/events/:eventId/families', authMiddleware, familiesRouter);

// User management routes (owner only)
app.use('/api/users', authMiddleware, requireOwner, usersRouter);

// Global routes (categories, data import/export)
app.use('/api/categories', authMiddleware, categoriesRouter);
app.use('/api/data', authMiddleware, dataRouter);

// Async startup to initialize stores
async function startServer() {
  try {
    // Initialize data store (loads persisted data)
    await store.ensureInitialized();

    // Initialize session store (loads persisted sessions)
    const sessionStore = getSessionStore();
    await sessionStore.initialize();

    const server = app.listen(config.port, () => {
      console.log(`Server running on http://localhost:${config.port} [${config.env}]`);
    });

    // Graceful shutdown handler
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received, shutting down gracefully...`);

      // Stop accepting new connections
      server.close(async () => {
        console.log('HTTP server closed');

        // Save data and sessions before exit
        await Promise.all([
          store.flush().then(() => console.log('Data saved')),
          sessionStore.shutdown().then(() => console.log('Sessions saved')),
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
