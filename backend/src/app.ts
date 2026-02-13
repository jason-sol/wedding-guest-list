import express from 'express';
import cors from 'cors';
import guestsRouter from './routes/guests';
import familiesRouter from './routes/families';
import categoriesRouter from './routes/categories';
import eventsRouter from './routes/events';
import usersRouter from './routes/users';
import authRouter from './routes/auth';
import dataRouter from './routes/data';
import backupsRouter from './routes/backups';
import { authMiddleware } from './middleware/auth';
import { requireOwner } from './middleware/permissions';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Public routes
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api/auth', authRouter);

  // Protected routes
  app.use('/api/events', authMiddleware, eventsRouter);
  app.use('/api/events/:eventId/guests', authMiddleware, guestsRouter);
  app.use('/api/events/:eventId/families', authMiddleware, familiesRouter);
  app.use('/api/users', authMiddleware, requireOwner, usersRouter);
  app.use('/api/categories', authMiddleware, categoriesRouter);
  app.use('/api/data', authMiddleware, dataRouter);
  app.use('/api/backups', authMiddleware, backupsRouter);

  return app;
}
