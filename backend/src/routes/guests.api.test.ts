import { createTestApp, setupOwnerSession, authAgent, setupTestEvent, store, request } from '../test/apiHelper';
import type { Express } from 'express';

describe('Guest API', () => {
  let app: Express;
  let token: string;
  let eventId: string;

  beforeEach(async () => {
    await store.clear();
    app = createTestApp();
    token = setupOwnerSession();
    eventId = await setupTestEvent(app, token);
  });

  test('GET /api/events/:eventId/guests — returns empty array initially', async () => {
    const res = await authAgent(app, token).get(`/api/events/${eventId}/guests`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  test('GET /api/events/:eventId/guests — returns 401 without auth token', async () => {
    const res = await request(app).get(`/api/events/${eventId}/guests`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/events/:eventId/guests — creates guest and returns 201', async () => {
    const res = await authAgent(app, token)
      .post(`/api/events/${eventId}/guests`)
      .send({ firstName: 'John', lastName: 'Doe' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      firstName: 'John',
      lastName: 'Doe',
      eventId,
    });
    expect(res.body.data.id).toBeDefined();
  });

  test('POST /api/events/:eventId/guests — defaults firstName and lastName to empty strings when not provided', async () => {
    const res = await authAgent(app, token)
      .post(`/api/events/${eventId}/guests`)
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.firstName).toBe('');
    expect(res.body.data.lastName).toBe('');
  });

  test('PUT /api/events/:eventId/guests/:id — updates guest fields', async () => {
    const createRes = await authAgent(app, token)
      .post(`/api/events/${eventId}/guests`)
      .send({ firstName: 'John', lastName: 'Doe' });
    const guestId = createRes.body.data.id;

    const updateRes = await authAgent(app, token)
      .put(`/api/events/${eventId}/guests/${guestId}`)
      .send({ firstName: 'Jane' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.firstName).toBe('Jane');
    expect(updateRes.body.data.lastName).toBe('Doe');
  });

  test('PUT /api/events/:eventId/guests/:id — returns 404 for non-existent guest', async () => {
    const res = await authAgent(app, token)
      .put(`/api/events/${eventId}/guests/guest-9999`)
      .send({ firstName: 'Jane' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('DELETE /api/events/:eventId/guests/:id — deletes guest and returns 204', async () => {
    const createRes = await authAgent(app, token)
      .post(`/api/events/${eventId}/guests`)
      .send({ firstName: 'John', lastName: 'Doe' });
    const guestId = createRes.body.data.id;

    const deleteRes = await authAgent(app, token)
      .delete(`/api/events/${eventId}/guests/${guestId}`);

    expect(deleteRes.status).toBe(204);
  });

  test('DELETE /api/events/:eventId/guests/:id — returns 404 for non-existent guest', async () => {
    const res = await authAgent(app, token)
      .delete(`/api/events/${eventId}/guests/guest-9999`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/events/:eventId/guests/:id/copy — copies guest to another event', async () => {
    // Create a guest in the first event
    const createRes = await authAgent(app, token)
      .post(`/api/events/${eventId}/guests`)
      .send({ firstName: 'John', lastName: 'Doe' });
    const guestId = createRes.body.data.id;

    // Create a second event
    const secondEventId = await setupTestEvent(app, token, 'Second Event');

    // Copy the guest to the second event
    const copyRes = await authAgent(app, token)
      .post(`/api/events/${eventId}/guests/${guestId}/copy`)
      .send({ targetEventId: secondEventId });

    expect(copyRes.status).toBe(201);
    expect(copyRes.body.success).toBe(true);
    expect(copyRes.body.data.eventId).toBe(secondEventId);
    expect(copyRes.body.data.firstName).toBe('John');
    expect(copyRes.body.data.lastName).toBe('Doe');

    // Verify the guest still exists in the original event
    const originalRes = await authAgent(app, token)
      .get(`/api/events/${eventId}/guests`);
    expect(originalRes.body.data).toHaveLength(1);

    // Verify the guest exists in the second event
    const secondRes = await authAgent(app, token)
      .get(`/api/events/${secondEventId}/guests`);
    expect(secondRes.body.data).toHaveLength(1);
  });
});
