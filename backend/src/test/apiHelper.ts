import request from 'supertest';
import { createApp } from '../app';
import { getSessionStore } from '../sessionStore';
import { store } from '../store';
import crypto from 'crypto';
import type { Express } from 'express';

const TEST_TOKEN = 'test-token-' + crypto.randomBytes(8).toString('hex');

export function createTestApp(): Express {
  return createApp();
}

export function setupOwnerSession(): string {
  const sessionStore = getSessionStore();
  sessionStore.set(TEST_TOKEN, {
    userId: 'owner-1',
    username: 'testowner',
    isOwner: true,
    expiresAt: Date.now() + 3600000,
    createdAt: Date.now(),
  });
  return TEST_TOKEN;
}

export function setupUserSession(userId: string, username: string): string {
  const sessionStore = getSessionStore();
  const token = 'user-token-' + crypto.randomBytes(8).toString('hex');
  sessionStore.set(token, {
    userId,
    username,
    isOwner: false,
    expiresAt: Date.now() + 3600000,
    createdAt: Date.now(),
  });
  return token;
}

export function authAgent(app: Express, token: string) {
  return {
    get: (url: string) => request(app).get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string) => request(app).post(url).set('Authorization', `Bearer ${token}`),
    put: (url: string) => request(app).put(url).set('Authorization', `Bearer ${token}`),
    delete: (url: string) => request(app).delete(url).set('Authorization', `Bearer ${token}`),
  };
}

export async function setupTestEvent(app: Express, token: string, name = 'Test Event'): Promise<string> {
  const res = await authAgent(app, token).post('/api/events').send({ name });
  return res.body.data.id;
}

export { store, request };
