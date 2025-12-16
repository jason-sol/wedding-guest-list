import { store } from '../store';
import { Category } from '../../../shared/types/index';

describe('Family Store', () => {
  beforeEach(() => {
    store.clear();
  });

  test('should create a family with members', () => {
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

    expect(family.id).toBeDefined();
    expect(family.name).toBe('Doe Family');
    expect(family.members).toHaveLength(2);
    expect(family.members).toContain(guest1.id);
    expect(family.members).toContain(guest2.id);
  });

  test('should retrieve all families', () => {
    store.addFamily({ name: 'Family 1', members: [] });
    store.addFamily({ name: 'Family 2', members: [] });

    const families = store.getAllFamilies();
    expect(families).toHaveLength(2);
  });

  test('should update family name', () => {
    const family = store.addFamily({ name: 'Old Name', members: [] });
    const updated = store.updateFamily(family.id, { name: 'New Name' });

    expect(updated?.name).toBe('New Name');
  });

  test('should delete a family', () => {
    const family = store.addFamily({ name: 'Test Family', members: [] });
    const deleted = store.deleteFamily(family.id);

    expect(deleted).toBe(true);
    expect(store.getFamily(family.id)).toBeUndefined();
  });

  test('should add guest to family and update guest familyId', () => {
    const guest = store.addGuest({
      firstName: 'John',
      lastName: 'Doe',
      familyId: null,
      tags: [],
    });
    const family = store.addFamily({ name: 'Doe Family', members: [] });

    store.updateFamily(family.id, { members: [guest.id] });
    store.updateGuest(guest.id, { familyId: family.id });

    const updatedGuest = store.getGuest(guest.id);
    const updatedFamily = store.getFamily(family.id);

    expect(updatedGuest?.familyId).toBe(family.id);
    expect(updatedFamily?.members).toContain(guest.id);
  });

  test('should remove guest from family', () => {
    const guest = store.addGuest({
      firstName: 'John',
      lastName: 'Doe',
      familyId: null,
      tags: [],
    });
    const family = store.addFamily({ name: 'Doe Family', members: [guest.id] });
    store.updateGuest(guest.id, { familyId: family.id });

    store.updateFamily(family.id, { members: [] });
    store.updateGuest(guest.id, { familyId: null });

    const updatedGuest = store.getGuest(guest.id);
    const updatedFamily = store.getFamily(family.id);

    expect(updatedGuest?.familyId).toBeNull();
    expect(updatedFamily?.members).not.toContain(guest.id);
  });
});
