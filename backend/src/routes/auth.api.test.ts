import { createTestApp, setupOwnerSession, authAgent, store, request } from '../test/apiHelper';
import { getSessionStore } from '../sessionStore';
import type { Express } from 'express';

describe('Auth API', () => {
  let app: Express;

  beforeEach(async () => {
    await store.clear();
    app = createTestApp();
  });

  test('POST /api/auth/login — returns 401 on invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'wrong', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/auth/login — returns token on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'dev', password: 'dev' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(typeof res.body.data.token).toBe('string');
  });

  test('POST /api/auth/logout — invalidates session', async () => {
    const token = setupOwnerSession();

    // Verify the session is valid before logout
    const checkBefore = await request(app)
      .get('/api/auth/check')
      .set('Authorization', `Bearer ${token}`);
    expect(checkBefore.status).toBe(200);

    // Logout
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);

    // Verify the session is no longer valid
    const sessionStore = getSessionStore();
    expect(sessionStore.get(token)).toBeUndefined();
  });

  test('GET /api/auth/check — returns user info for valid token', async () => {
    const token = setupOwnerSession();

    const res = await request(app)
      .get('/api/auth/check')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.authenticated).toBe(true);
    expect(res.body.data.isOwner).toBe(true);
    expect(res.body.data.username).toBeDefined();
  });

  test('GET /api/auth/check — returns 401 for invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/check')
      .set('Authorization', 'Bearer invalid-token-12345');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('GET /health — returns 200 with status ok', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
