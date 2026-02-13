import { createTestApp, setupOwnerSession, authAgent, setupTestEvent, store, request } from '../test/apiHelper';
import type { Express } from 'express';

describe('Family API', () => {
  let app: Express;
  let token: string;
  let eventId: string;

  beforeEach(async () => {
    await store.clear();
    app = createTestApp();
    token = setupOwnerSession();
    eventId = await setupTestEvent(app, token);
  });

  test('GET /api/events/:eventId/families — returns empty array initially', async () => {
    const res = await authAgent(app, token).get(`/api/events/${eventId}/families`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  test('POST /api/events/:eventId/families — creates family with name', async () => {
    const res = await authAgent(app, token)
      .post(`/api/events/${eventId}/families`)
      .send({ name: 'Smith Family' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      name: 'Smith Family',
      eventId,
    });
    expect(res.body.data.id).toBeDefined();
  });

  test('POST /api/events/:eventId/families — creates family with new member objects', async () => {
    const res = await authAgent(app, token)
      .post(`/api/events/${eventId}/families`)
      .send({
        name: 'Doe Family',
        members: [{ firstName: 'John', lastName: 'Doe' }],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Doe Family');
    expect(res.body.data.members).toHaveLength(1);
    // Members array contains guest IDs (strings)
    expect(typeof res.body.data.members[0]).toBe('string');
  });

  test('PUT /api/events/:eventId/families/:id — updates family name', async () => {
    const createRes = await authAgent(app, token)
      .post(`/api/events/${eventId}/families`)
      .send({ name: 'Smith Family' });
    const familyId = createRes.body.data.id;

    const updateRes = await authAgent(app, token)
      .put(`/api/events/${eventId}/families/${familyId}`)
      .send({ name: 'Johnson Family' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.name).toBe('Johnson Family');
  });

  test('DELETE /api/events/:eventId/families/:id — deletes family and sets members familyId to null', async () => {
    // Create a family with a member
    const createRes = await authAgent(app, token)
      .post(`/api/events/${eventId}/families`)
      .send({
        name: 'Doe Family',
        members: [{ firstName: 'John', lastName: 'Doe' }],
      });
    const familyId = createRes.body.data.id;
    const memberId = createRes.body.data.members[0];

    // Delete the family
    const deleteRes = await authAgent(app, token)
      .delete(`/api/events/${eventId}/families/${familyId}`);

    expect(deleteRes.status).toBe(204);

    // Verify the member's familyId is set to null
    const guestRes = await authAgent(app, token)
      .get(`/api/events/${eventId}/guests/${memberId}`);

    expect(guestRes.status).toBe(200);
    expect(guestRes.body.data.familyId).toBeNull();
  });

  test('POST /api/events/:eventId/families/:id/members — adds guest to family', async () => {
    // Create a guest
    const guestRes = await authAgent(app, token)
      .post(`/api/events/${eventId}/guests`)
      .send({ firstName: 'John', lastName: 'Doe' });
    const guestId = guestRes.body.data.id;

    // Create a family
    const familyRes = await authAgent(app, token)
      .post(`/api/events/${eventId}/families`)
      .send({ name: 'Doe Family' });
    const familyId = familyRes.body.data.id;

    // Add the guest to the family
    const addRes = await authAgent(app, token)
      .post(`/api/events/${eventId}/families/${familyId}/members`)
      .send({ guestId });

    expect(addRes.status).toBe(200);
    expect(addRes.body.success).toBe(true);
    expect(addRes.body.data.members).toContain(guestId);
  });

  test('DELETE /api/events/:eventId/families/:id/members/:guestId — removes member from family', async () => {
    // Create a family with a member
    const createRes = await authAgent(app, token)
      .post(`/api/events/${eventId}/families`)
      .send({
        name: 'Doe Family',
        members: [{ firstName: 'John', lastName: 'Doe' }],
      });
    const familyId = createRes.body.data.id;
    const memberId = createRes.body.data.members[0];

    // Remove the member from the family
    const removeRes = await authAgent(app, token)
      .delete(`/api/events/${eventId}/families/${familyId}/members/${memberId}`);

    expect(removeRes.status).toBe(200);
    expect(removeRes.body.success).toBe(true);
    expect(removeRes.body.data.members).not.toContain(memberId);
  });
});
