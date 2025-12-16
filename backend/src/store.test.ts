import { store } from './store';

describe('Guest Store', () => {
  beforeEach(() => {
    store.clear();
  });

  test('should add a guest with first and last name', () => {
    const guest = store.addGuest({
      firstName: 'John',
      lastName: 'Doe',
      familyId: null,
      tags: [],
    });

    expect(guest.id).toBeDefined();
    expect(guest.firstName).toBe('John');
    expect(guest.lastName).toBe('Doe');
  });

  test('should retrieve all guests', () => {
    store.addGuest({
      firstName: 'John',
      lastName: 'Doe',
      familyId: null,
      tags: [],
    });
    store.addGuest({
      firstName: 'Jane',
      lastName: 'Smith',
      familyId: null,
      tags: [],
    });

    const guests = store.getAllGuests();
    expect(guests).toHaveLength(2);
  });

  test('should update guest name', () => {
    const guest = store.addGuest({
      firstName: 'John',
      lastName: 'Doe',
      familyId: null,
      tags: [],
    });

    const updated = store.updateGuest(guest.id, {
      firstName: 'Jonathan',
      lastName: 'Doe',
    });

    expect(updated?.firstName).toBe('Jonathan');
    expect(updated?.lastName).toBe('Doe');
  });

  test('should delete a guest', () => {
    const guest = store.addGuest({
      firstName: 'John',
      lastName: 'Doe',
      familyId: null,
      tags: [],
    });

    const deleted = store.deleteGuest(guest.id);
    expect(deleted).toBe(true);
    expect(store.getGuest(guest.id)).toBeUndefined();
  });
});

