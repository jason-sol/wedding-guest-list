import request from 'supertest';
import express from 'express';
import familiesRouter from './families';
import { store } from '../store';

const app = express();
app.use(express.json());
app.use('/api/families', familiesRouter);

describe('Families API Routes', () => {
  beforeEach(() => {
    store.clear();
  });

  describe('POST /api/families', () => {
    test('should create a family with new members', async () => {
      const response = await request(app)
        .post('/api/families')
        .send({
          name: 'Doe Family',
          members: [
            { firstName: 'John', lastName: 'Doe', tags: [] },
            { firstName: 'Jane', lastName: 'Doe', tags: [] },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Doe Family');
      expect(response.body.members).toHaveLength(2);
    });

    test('should reject family without name', async () => {
      const response = await request(app)
        .post('/api/families')
        .send({
          members: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('name is required');
    });

    test('should create family and assign guests to it', async () => {
      const response = await request(app)
        .post('/api/families')
        .send({
          name: 'Smith Family',
          members: [
            { firstName: 'John', lastName: 'Smith', tags: [] },
          ],
        });

      expect(response.status).toBe(201);
      const guest = store.getAllGuests().find(g => g.lastName === 'Smith');
      expect(guest?.familyId).toBe(response.body.id);
    });
  });

  describe('POST /api/families/:id/members', () => {
    test('should add existing guest to family', async () => {
      const guest = store.addGuest({
        firstName: 'John',
        lastName: 'Doe',
        familyId: null,
        tags: [],
      });
      const family = store.addFamily({
        name: 'Doe Family',
        members: [],
      });

      const response = await request(app)
        .post(`/api/families/${family.id}/members`)
        .send({ guestId: guest.id });

      expect(response.status).toBe(200);
      expect(response.body.members).toContain(guest.id);
      
      const updatedGuest = store.getGuest(guest.id);
      expect(updatedGuest?.familyId).toBe(family.id);
    });

    test('should return 404 if family not found', async () => {
      const guest = store.addGuest({
        firstName: 'John',
        lastName: 'Doe',
        familyId: null,
        tags: [],
      });

      const response = await request(app)
        .post('/api/families/non-existent-id/members')
        .send({ guestId: guest.id });

      expect(response.status).toBe(404);
    });

    test('should return 404 if guest not found', async () => {
      const family = store.addFamily({
        name: 'Doe Family',
        members: [],
      });

      const response = await request(app)
        .post(`/api/families/${family.id}/members`)
        .send({ guestId: 'non-existent-id' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/families/:id/members/:guestId', () => {
    test('should remove guest from family', async () => {
      const guest = store.addGuest({
        firstName: 'John',
        lastName: 'Doe',
        familyId: null,
        tags: [],
      });
      const family = store.addFamily({
        name: 'Doe Family',
        members: [guest.id],
      });
      store.updateGuest(guest.id, { familyId: family.id });

      const response = await request(app)
        .delete(`/api/families/${family.id}/members/${guest.id}`);

      expect(response.status).toBe(200);
      expect(response.body.members).not.toContain(guest.id);
      
      const updatedGuest = store.getGuest(guest.id);
      expect(updatedGuest?.familyId).toBeNull();
    });

    test('should return 404 if family not found', async () => {
      const guest = store.addGuest({
        firstName: 'John',
        lastName: 'Doe',
        familyId: null,
        tags: [],
      });

      const response = await request(app)
        .delete('/api/families/non-existent-id/members/' + guest.id);

      expect(response.status).toBe(404);
    });
  });
});
