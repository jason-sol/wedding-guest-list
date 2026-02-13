import { createTestApp, setupOwnerSession, authAgent, store } from '../test/apiHelper';
import type { Express } from 'express';

describe('Categories API', () => {
  let app: Express;
  let token: string;

  beforeEach(async () => {
    await store.clear();
    app = createTestApp();
    token = setupOwnerSession();
  });

  test('GET /api/categories — returns categories (store starts with defaults after clear)', async () => {
    const res = await authAgent(app, token).get('/api/categories');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  test('POST /api/categories — creates category with auto-assigned color', async () => {
    const res = await authAgent(app, token)
      .post('/api/categories')
      .send({ name: 'VIP' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('VIP');
    expect(res.body.data.color).toBeDefined();
    expect(res.body.data.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  test('POST /api/categories — rejects duplicate category name', async () => {
    // Create the first category
    await authAgent(app, token)
      .post('/api/categories')
      .send({ name: 'VIP' });

    // Try to create the same category again
    const res = await authAgent(app, token)
      .post('/api/categories')
      .send({ name: 'VIP' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('PUT /api/categories/:name — renames category', async () => {
    // Create a category
    const createRes = await authAgent(app, token)
      .post('/api/categories')
      .send({ name: 'VIP' });
    const categoryName = createRes.body.data.name;

    // Rename it
    const res = await authAgent(app, token)
      .put(`/api/categories/${encodeURIComponent(categoryName)}`)
      .send({ name: 'Premium' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Premium');
  });

  test('DELETE /api/categories/:name — deletes category and verifies it is gone', async () => {
    // Create a category
    const createRes = await authAgent(app, token)
      .post('/api/categories')
      .send({ name: 'VIP' });
    const categoryName = createRes.body.data.name;

    // Delete it
    const deleteRes = await authAgent(app, token)
      .delete(`/api/categories/${encodeURIComponent(categoryName)}`);

    expect(deleteRes.status).toBe(204);

    // Verify it is gone
    const listRes = await authAgent(app, token).get('/api/categories');
    const names = listRes.body.data.map((c: { name: string }) => c.name);
    expect(names).not.toContain(categoryName);
  });
});
