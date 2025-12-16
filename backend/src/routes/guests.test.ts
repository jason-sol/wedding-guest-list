import { store } from '../store';
import { Category } from '../../../shared/types/index';

describe('Guest Store Sorting', () => {
  beforeEach(() => {
    store.clear();
  });

  test('should sort guests by first name', () => {
    store.addGuest({ firstName: 'Zoe', lastName: 'Adams', familyId: null, tags: [] });
    store.addGuest({ firstName: 'Alice', lastName: 'Brown', familyId: null, tags: [] });
    store.addGuest({ firstName: 'Bob', lastName: 'Clark', familyId: null, tags: [] });

    const guests = store.getAllGuests();
    const sorted = guests.sort((a, b) => a.firstName.localeCompare(b.firstName));

    expect(sorted[0].firstName).toBe('Alice');
    expect(sorted[1].firstName).toBe('Bob');
    expect(sorted[2].firstName).toBe('Zoe');
  });

  test('should sort guests by last name', () => {
    store.addGuest({ firstName: 'John', lastName: 'Zebra', familyId: null, tags: [] });
    store.addGuest({ firstName: 'Jane', lastName: 'Adams', familyId: null, tags: [] });
    store.addGuest({ firstName: 'Bob', lastName: 'Brown', familyId: null, tags: [] });

    const guests = store.getAllGuests();
    const sorted = guests.sort((a, b) => a.lastName.localeCompare(b.lastName));

    expect(sorted[0].lastName).toBe('Adams');
    expect(sorted[1].lastName).toBe('Brown');
    expect(sorted[2].lastName).toBe('Zebra');
  });

  test('should handle guests with categories', () => {
    const guest = store.addGuest({
      firstName: 'John',
      lastName: 'Doe',
      familyId: null,
      tags: ['Bride Family', 'Church Friends'],
    });

    expect(guest.tags).toHaveLength(2);
    expect(guest.tags).toContain('Bride Family');
    expect(guest.tags).toContain('Church Friends');
  });

  test('should update guest categories', () => {
    const guest = store.addGuest({
      firstName: 'John',
      lastName: 'Doe',
      familyId: null,
      tags: ['Bride Family'],
    });

    const updated = store.updateGuest(guest.id, {
      tags: ['Groom Family', 'Church Friends'],
    });

    expect(updated?.tags).toHaveLength(2);
    expect(updated?.tags).toContain('Groom Family');
    expect(updated?.tags).toContain('Church Friends');
    expect(updated?.tags).not.toContain('Bride Family');
  });

  test('should group guests by family', () => {
    const guest1 = store.addGuest({
      firstName: 'John',
      lastName: 'Doe',
      familyId: null,
      tags: [],
    });
    const guest2 = store.addGuest({
      firstName: 'Jane',
      lastName: 'Doe',
      familyId: null,
      tags: [],
    });
    const family = store.addFamily({
      name: 'Doe Family',
      members: [guest1.id, guest2.id],
    });

    store.updateGuest(guest1.id, { familyId: family.id });
    store.updateGuest(guest2.id, { familyId: family.id });

    const guests = store.getAllGuests();
    const familyMembers = guests.filter((g) => g.familyId === family.id);

    expect(familyMembers).toHaveLength(2);
    expect(familyMembers.map((g) => g.id)).toContain(guest1.id);
    expect(familyMembers.map((g) => g.id)).toContain(guest2.id);
  });

  test('should handle individual guests separately from families', () => {
    const individualGuest = store.addGuest({
      firstName: 'Alice',
      lastName: 'Smith',
      familyId: null,
      tags: [],
    });
    const familyGuest = store.addGuest({
      firstName: 'John',
      lastName: 'Doe',
      familyId: null,
      tags: [],
    });
    const family = store.addFamily({
      name: 'Doe Family',
      members: [familyGuest.id],
    });

    store.updateGuest(familyGuest.id, { familyId: family.id });

    const guests = store.getAllGuests();
    const individualGuests = guests.filter((g) => !g.familyId);
    const familyGuests = guests.filter((g) => g.familyId === family.id);

    expect(individualGuests).toHaveLength(1);
    expect(individualGuests[0].id).toBe(individualGuest.id);
    expect(familyGuests).toHaveLength(1);
    expect(familyGuests[0].id).toBe(familyGuest.id);
  });
});
