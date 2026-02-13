import { createTestApp, setupOwnerSession, setupUserSession, authAgent, setupTestEvent, store } from '../test/apiHelper';
import type { Express } from 'express';

describe('Events API', () => {
  let app: Express;
  let token: string;

  beforeEach(async () => {
    await store.clear();
    app = createTestApp();
    token = setupOwnerSession();
  });

  test('GET /api/events — returns events list', async () => {
    // store.clear() creates a default "Ceremony" event, so we start with 1
    const resBefore = await authAgent(app, token).get('/api/events');
    const initialCount = resBefore.body.data.length;

    // Create an additional event
    await setupTestEvent(app, token, 'Wedding Ceremony');

    const res = await authAgent(app, token).get('/api/events');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(initialCount + 1);
    const names = res.body.data.map((e: { name: string }) => e.name);
    expect(names).toContain('Wedding Ceremony');
  });

  test('POST /api/events — creates event (owner only) and returns 201', async () => {
    const res = await authAgent(app, token)
      .post('/api/events')
      .send({ name: 'Reception' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      name: 'Reception',
    });
    expect(res.body.data.id).toBeDefined();
  });

  test('POST /api/events — returns 403 for non-owner user', async () => {
    const userToken = setupUserSession('user-1', 'testuser');

    const res = await authAgent(app, userToken)
      .post('/api/events')
      .send({ name: 'Forbidden Event' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('PUT /api/events/:id — updates event name', async () => {
    const eventId = await setupTestEvent(app, token, 'Ceremony');

    const res = await authAgent(app, token)
      .put(`/api/events/${eventId}`)
      .send({ name: 'Updated Ceremony' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Updated Ceremony');
  });

  test('DELETE /api/events/:id — deletes event', async () => {
    // Create two events since the last event cannot be deleted
    const firstEventId = await setupTestEvent(app, token, 'Ceremony');
    await setupTestEvent(app, token, 'Reception');

    const res = await authAgent(app, token)
      .delete(`/api/events/${firstEventId}`);

    expect(res.status).toBe(204);

    // Verify only one event remains
    const listRes = await authAgent(app, token).get('/api/events');
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0].name).toBe('Reception');
  });
});
