import dotenv from 'dotenv';
import path from 'path';

// Load .env file - try multiple locations
// 1. Project root (parent of backend directory)
const rootEnvPath = path.resolve(process.cwd(), '../.env');
// 2. Current directory (for when running from project root)
const currentEnvPath = path.resolve(process.cwd(), '.env');

// Try loading from project root first, then current directory
const result = dotenv.config({ path: rootEnvPath });
if (result.error) {
  // Fallback to current directory
  dotenv.config({ path: currentEnvPath });
}

import express from 'express';
import cors from 'cors';
import guestsRouter from './routes/guests';
import familiesRouter from './routes/families';
import categoriesRouter from './routes/categories';
import rsvpRouter from './routes/rsvp';
import eventsRouter from './routes/events';
import authRouter from './routes/auth';
import { authMiddleware } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Public routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Auth routes (public)
app.use('/api/auth', authRouter);

// Protected routes (require authentication)
app.use('/api/guests', authMiddleware, guestsRouter);
app.use('/api/families', authMiddleware, familiesRouter);
app.use('/api/categories', authMiddleware, categoriesRouter);
app.use('/api', authMiddleware, rsvpRouter);
app.use('/api/events', authMiddleware, eventsRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
