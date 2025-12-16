import request from 'supertest';
import express from 'express';
import guestsRouter from './guests';
import { store } from '../store';
import { Category } from '../../../shared/types/index';

const app = express();
app.use(express.json());
app.use('/api/guests', guestsRouter);

describe('Guests API Routes', () => {
  beforeEach(() => {
    store.clear();
  });

  describe('GET /api/guests', () => {
    test('should return empty array when no guests', async () => {
      const response = await request(app).get('/api/guests');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    test('should return all guests sorted by last name by default', async () => {
      store.addGuest({ firstName: 'Zoe', lastName: 'Adams', familyId: null, tags: [] });
      store.addGuest({ firstName: 'Alice', lastName: 'Brown', familyId: null, tags: [] });

      const response = await request(app).get('/api/guests');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].lastName).toBe('Adams');
      expect(response.body[1].lastName).toBe('Brown');
    });

    test('should sort by first name when requested', async () => {
      store.addGuest({ firstName: 'Zoe', lastName: 'Adams', familyId: null, tags: [] });
      store.addGuest({ firstName: 'Alice', lastName: 'Brown', familyId: null, tags: [] });

      const response = await request(app).get('/api/guests?sortBy=firstName');
      expect(response.status).toBe(200);
      expect(response.body[0].firstName).toBe('Alice');
      expect(response.body[1].firstName).toBe('Zoe');
    });

    test('should sort by category when requested', async () => {
      store.addGuest({
        firstName: 'John',
        lastName: 'Doe',
        familyId: null,
        tags: ['Groom Family'],
      });
      store.addGuest({
        firstName: 'Jane',
        lastName: 'Smith',
        familyId: null,
        tags: ['Bride Family'],
      });

      const response = await request(app).get('/api/guests?sortBy=category');
      expect(response.status).toBe(200);
      expect(response.body[0].tags[0]).toBe('Bride Family');
      expect(response.body[1].tags[0]).toBe('Groom Family');
    });
  });

  describe('POST /api/guests', () => {
    test('should create a new guest', async () => {
      const response = await request(app)
        .post('/api/guests')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          tags: [],
        });

      expect(response.status).toBe(201);
      expect(response.body.firstName).toBe('John');
      expect(response.body.lastName).toBe('Doe');
      expect(response.body.id).toBeDefined();
    });

    test('should reject guest without first name', async () => {
      const response = await request(app)
        .post('/api/guests')
        .send({
          lastName: 'Doe',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    test('should reject guest without last name', async () => {
      const response = await request(app)
        .post('/api/guests')
        .send({
          firstName: 'John',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    test('should create guest with categories', async () => {
      const response = await request(app)
        .post('/api/guests')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          tags: ['Bride Family', 'Church Friends'],
        });

      expect(response.status).toBe(201);
      expect(response.body.tags).toHaveLength(2);
      expect(response.body.tags).toContain('Bride Family');
      expect(response.body.tags).toContain('Church Friends');
    });
  });

  describe('PUT /api/guests/:id', () => {
    test('should update guest name', async () => {
      const guest = store.addGuest({
        firstName: 'John',
        lastName: 'Doe',
        familyId: null,
        tags: [],
      });

      const response = await request(app)
        .put(`/api/guests/${guest.id}`)
        .send({
          firstName: 'Jonathan',
          lastName: 'Doe',
        });

      expect(response.status).toBe(200);
      expect(response.body.firstName).toBe('Jonathan');
    });

    test('should update guest categories', async () => {
      const guest = store.addGuest({
        firstName: 'John',
        lastName: 'Doe',
        familyId: null,
        tags: ['Bride Family'],
      });

      const response = await request(app)
        .put(`/api/guests/${guest.id}`)
        .send({
          tags: ['Groom Family', 'Church Friends'],
        });

      expect(response.status).toBe(200);
      expect(response.body.tags).toHaveLength(2);
      expect(response.body.tags).toContain('Groom Family');
      expect(response.body.tags).not.toContain('Bride Family');
    });

    test('should return 404 for non-existent guest', async () => {
      const response = await request(app)
        .put('/api/guests/non-existent-id')
        .send({
          firstName: 'John',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/guests/:id', () => {
    test('should delete a guest', async () => {
      const guest = store.addGuest({
        firstName: 'John',
        lastName: 'Doe',
        familyId: null,
        tags: [],
      });

      const response = await request(app).delete(`/api/guests/${guest.id}`);

      expect(response.status).toBe(204);
      expect(store.getGuest(guest.id)).toBeUndefined();
    });

    test('should return 404 for non-existent guest', async () => {
      const response = await request(app).delete('/api/guests/non-existent-id');

      expect(response.status).toBe(404);
    });
  });
});
