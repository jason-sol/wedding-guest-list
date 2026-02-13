import { store } from './store';

const TEST_EVENT_ID = 'event-1';
const TEST_EVENT_ID_2 = 'event-2';

describe('DataStore', () => {
  beforeEach(async () => {
    await store.clear();
    // Create test events
    store.addEvent({
      name: 'Ceremony',
      order: 0,
      createdAt: Date.now(),
      createdBy: 'test',
    });
    store.addEvent({
      name: 'Reception',
      order: 1,
      createdAt: Date.now(),
      createdBy: 'test',
    });
  });

  // ============================================================
  // Guest CRUD
  // ============================================================

  describe('Guest CRUD', () => {
    test('should add a guest with event scope', () => {
      const guest = store.addGuest({
        eventId: TEST_EVENT_ID,
        firstName: 'John',
        lastName: 'Doe',
        familyId: null,
        tags: [],
      });

      expect(guest.id).toMatch(/^guest-\d+$/);
      expect(guest.firstName).toBe('John');
      expect(guest.lastName).toBe('Doe');
      expect(guest.eventId).toBe(TEST_EVENT_ID);
    });

    test('should retrieve a guest by ID', () => {
      const guest = store.addGuest({
        eventId: TEST_EVENT_ID,
        firstName: 'Jane',
        lastName: 'Smith',
        familyId: null,
        tags: [],
      });

      const found = store.getGuest(guest.id);
      expect(found).toBeDefined();
      expect(found?.firstName).toBe('Jane');
    });

    test('should return undefined for non-existent guest', () => {
      expect(store.getGuest('guest-999')).toBeUndefined();
    });

    test('should retrieve guests scoped by event', () => {
      store.addGuest({
        eventId: TEST_EVENT_ID,
        firstName: 'John',
        lastName: 'Doe',
        familyId: null,
        tags: [],
      });
      store.addGuest({
        eventId: TEST_EVENT_ID_2,
        firstName: 'Jane',
        lastName: 'Smith',
        familyId: null,
        tags: [],
      });

      const event1Guests = store.getGuestsForEvent(TEST_EVENT_ID);
      const event2Guests = store.getGuestsForEvent(TEST_EVENT_ID_2);

      expect(event1Guests).toHaveLength(1);
      expect(event1Guests[0].firstName).toBe('John');
      expect(event2Guests).toHaveLength(1);
      expect(event2Guests[0].firstName).toBe('Jane');
    });

    test('should return empty array for event with no guests', () => {
      expect(store.getGuestsForEvent('event-999')).toHaveLength(0);
    });

    test('should update guest name', () => {
      const guest = store.addGuest({
        eventId: TEST_EVENT_ID,
        firstName: 'John',
        lastName: 'Doe',
        familyId: null,
        tags: [],
      });

      const updated = store.updateGuest(guest.id, { firstName: 'Jonathan' });

      expect(updated?.firstName).toBe('Jonathan');
      expect(updated?.lastName).toBe('Doe');
    });

    test('should return null when updating non-existent guest', () => {
      expect(store.updateGuest('guest-999', { firstName: 'X' })).toBeNull();
    });

    test('should update name index when name changes', () => {
      const guest = store.addGuest({
        eventId: TEST_EVENT_ID,
        firstName: 'John',
        lastName: 'Doe',
        familyId: null,
        tags: [],
      });

      store.updateGuest(guest.id, { firstName: 'Jane' });

      expect(store.getGuestsByName('John', 'Doe')).toHaveLength(0);
      expect(store.getGuestsByName('Jane', 'Doe')).toHaveLength(1);
    });

    test('should delete a guest', () => {
      const guest = store.addGuest({
        eventId: TEST_EVENT_ID,
        firstName: 'John',
        lastName: 'Doe',
        familyId: null,
        tags: [],
      });

      expect(store.deleteGuest(guest.id)).toBe(true);
      expect(store.getGuest(guest.id)).toBeUndefined();
      expect(store.getGuestsForEvent(TEST_EVENT_ID)).toHaveLength(0);
    });

    test('should return false when deleting non-existent guest', () => {
      expect(store.deleteGuest('guest-999')).toBe(false);
    });

    test('should remove guest from family when deleting', () => {
      const guest = store.addGuest({
        eventId: TEST_EVENT_ID,
        firstName: 'John',
        lastName: 'Doe',
        familyId: null,
        tags: [],
      });
      const family = store.addFamily({
        eventId: TEST_EVENT_ID,
        name: 'Doe Family',
        members: [guest.id],
      });
      store.updateGuest(guest.id, { familyId: family.id });

      store.deleteGuest(guest.id);

      const updatedFamily = store.getFamily(family.id);
      expect(updatedFamily?.members).not.toContain(guest.id);
    });

    test('should add guest with tags', () => {
      const guest = store.addGuest({
        eventId: TEST_EVENT_ID,
        firstName: 'John',
        lastName: 'Doe',
        familyId: null,
        tags: ['Bride Family', 'Church Friends'],
      });

      expect(guest.tags).toHaveLength(2);
      expect(guest.tags).toContain('Bride Family');
    });

    test('should add guest with ageGroup', () => {
      const guest = store.addGuest({
        eventId: TEST_EVENT_ID,
        firstName: 'Junior',
        lastName: 'Doe',
        familyId: null,
        tags: [],
        ageGroup: 'child',
      });

      expect(guest.ageGroup).toBe('child');
    });

    test('should update guest tags', () => {
      const guest = store.addGuest({
        eventId: TEST_EVENT_ID,
        firstName: 'John',
        lastName: 'Doe',
        familyId: null,
        tags: ['Bride Family'],
      });

      const updated = store.updateGuest(guest.id, { tags: ['Groom Family'] });
      expect(updated?.tags).toEqual(['Groom Family']);
    });
  });

  // ============================================================
  // Guest name index
  // ============================================================

  describe('Guest name index', () => {
    test('should find guests by name (case-insensitive)', () => {
      store.addGuest({
        eventId: TEST_EVENT_ID,
        firstName: 'John',
        lastName: 'Doe',
        familyId: null,
        tags: [],
      });

      expect(store.getGuestsByName('john', 'doe')).toHaveLength(1);
      expect(store.getGuestsByName('JOHN', 'DOE')).toHaveLength(1);
    });

    test('should find guests with same name across events', () => {
      store.addGuest({
        eventId: TEST_EVENT_ID,
        firstName: 'John',
        lastName: 'Doe',
        familyId: null,
        tags: [],
      });
      store.addGuest({
        eventId: TEST_EVENT_ID_2,
        firstName: 'John',
        lastName: 'Doe',
        familyId: null,
        tags: [],
      });

      expect(store.getGuestsByName('John', 'Doe')).toHaveLength(2);
    });

    test('should return empty array for non-existent name', () => {
      expect(store.getGuestsByName('Nobody', 'Here')).toHaveLength(0);
    });
  });

  // ============================================================
  // Family CRUD
  // ============================================================

  describe('Family CRUD', () => {
    test('should create a family with event scope', () => {
      const family = store.addFamily({
        eventId: TEST_EVENT_ID,
        name: 'Doe Family',
        members: [],
      });

      expect(family.id).toMatch(/^family-\d+$/);
      expect(family.name).toBe('Doe Family');
      expect(family.eventId).toBe(TEST_EVENT_ID);
    });

    test('should auto-assign groupId if not provided', () => {
      const family = store.addFamily({
        eventId: TEST_EVENT_ID,
        name: 'Doe Family',
        members: [],
      });

      expect(family.groupId).toBe(family.id);
    });

    test('should preserve provided groupId', () => {
      const family = store.addFamily({
        eventId: TEST_EVENT_ID,
        name: 'Doe Family',
        members: [],
        groupId: 'custom-group-1',
      });

      expect(family.groupId).toBe('custom-group-1');
    });

    test('should create a family with members', () => {
      const guest1 = store.addGuest({
        eventId: TEST_EVENT_ID,
        firstName: 'John',
        lastName: 'Doe',
        familyId: null,
        tags: [],
      });
      const guest2 = store.addGuest({
        eventId: TEST_EVENT_ID,
        firstName: 'Jane',
        lastName: 'Doe',
        familyId: null,
        tags: [],
      });

      const family = store.addFamily({
        eventId: TEST_EVENT_ID,
        name: 'Doe Family',
        members: [guest1.id, guest2.id],
      });

      expect(family.members).toHaveLength(2);
      expect(family.members).toContain(guest1.id);
      expect(family.members).toContain(guest2.id);
    });

    test('should retrieve families scoped by event', () => {
      store.addFamily({ eventId: TEST_EVENT_ID, name: 'Family A', members: [] });
      store.addFamily({ eventId: TEST_EVENT_ID_2, name: 'Family B', members: [] });

      const event1Families = store.getFamiliesForEvent(TEST_EVENT_ID);
      expect(event1Families).toHaveLength(1);
      expect(event1Families[0].name).toBe('Family A');
    });

    test('should update family name', () => {
      const family = store.addFamily({
        eventId: TEST_EVENT_ID,
        name: 'Old Name',
        members: [],
      });

      const updated = store.updateFamily(family.id, { name: 'New Name' });
      expect(updated?.name).toBe('New Name');
    });

    test('should return null when updating non-existent family', () => {
      expect(store.updateFamily('family-999', { name: 'X' })).toBeNull();
    });

    test('should delete a family and clear member familyIds', () => {
      const guest = store.addGuest({
        eventId: TEST_EVENT_ID,
        firstName: 'John',
        lastName: 'Doe',
        familyId: null,
        tags: [],
      });
      const family = store.addFamily({
        eventId: TEST_EVENT_ID,
        name: 'Doe Family',
        members: [guest.id],
      });
      store.updateGuest(guest.id, { familyId: family.id });

      expect(store.deleteFamily(family.id)).toBe(true);
      expect(store.getFamily(family.id)).toBeUndefined();
      expect(store.getGuest(guest.id)?.familyId).toBeNull();
    });

    test('should return false when deleting non-existent family', () => {
      expect(store.deleteFamily('family-999')).toBe(false);
    });
  });

  // ============================================================
  // Cross-event guest copy
  // ============================================================

  describe('copyGuestToEvent', () => {
    test('should copy a guest to another event', () => {
      const guest = store.addGuest({
        eventId: TEST_EVENT_ID,
        firstName: 'John',
        lastName: 'Doe',
        familyId: null,
        tags: ['Bride Family'],
        ageGroup: 'adult',
      });

      const copied = store.copyGuestToEvent(guest.id, TEST_EVENT_ID_2);

      expect(copied).not.toBeNull();
      expect(copied?.eventId).toBe(TEST_EVENT_ID_2);
      expect(copied?.firstName).toBe('John');
      expect(copied?.lastName).toBe('Doe');
      expect(copied?.tags).toEqual(['Bride Family']);
      expect(copied?.rsvp).toBeUndefined(); // RSVP reset
      expect(copied?.ageGroup).toBe('adult');
    });

    test('should return existing guest if name already exists in target event', () => {
      const guest = store.addGuest({
        eventId: TEST_EVENT_ID,
        firstName: 'John',
        lastName: 'Doe',
        familyId: null,
        tags: [],
      });
      const existing = store.addGuest({
        eventId: TEST_EVENT_ID_2,
        firstName: 'John',
        lastName: 'Doe',
        familyId: null,
        tags: [],
      });

      const result = store.copyGuestToEvent(guest.id, TEST_EVENT_ID_2);
      expect(result?.id).toBe(existing.id);
    });

    test('should return null for non-existent source guest', () => {
      expect(store.copyGuestToEvent('guest-999', TEST_EVENT_ID_2)).toBeNull();
    });
  });

  // ============================================================
  // Cross-event family operations
  // ============================================================

  describe('addMemberAcrossGroup', () => {
    test('should add member to families with same groupId', () => {
      const family1 = store.addFamily({
        eventId: TEST_EVENT_ID,
        name: 'Doe Family',
        members: [],
        groupId: 'group-1',
      });
      store.addFamily({
        eventId: TEST_EVENT_ID_2,
        name: 'Doe Family',
        members: [],
        groupId: 'group-1',
      });

      const guest = store.addGuest({
        eventId: TEST_EVENT_ID,
        firstName: 'John',
        lastName: 'Doe',
        familyId: family1.id,
        tags: [],
      });

      const updated = store.addMemberAcrossGroup(family1.id, guest);
      expect(updated).toBe(1);

      // Verify guest was created in event 2
      const event2Guests = store.getGuestsForEvent(TEST_EVENT_ID_2);
      expect(event2Guests).toHaveLength(1);
      expect(event2Guests[0].firstName).toBe('John');
    });

    test('should return 0 if family has no groupId', () => {
      const family = store.addFamily({
        eventId: TEST_EVENT_ID,
        name: 'No Group',
        members: [],
      });
      // groupId defaults to family.id, so no other families share it
      const guest = store.addGuest({
        eventId: TEST_EVENT_ID,
        firstName: 'Test',
        lastName: 'User',
        familyId: family.id,
        tags: [],
      });

      expect(store.addMemberAcrossGroup(family.id, guest)).toBe(0);
    });

    test('should not duplicate if guest already exists in other event', () => {
      const family1 = store.addFamily({
        eventId: TEST_EVENT_ID,
        name: 'Doe Family',
        members: [],
        groupId: 'group-1',
      });
      const family2 = store.addFamily({
        eventId: TEST_EVENT_ID_2,
        name: 'Doe Family',
        members: [],
        groupId: 'group-1',
      });

      // Guest already exists in event 2
      const existingGuest = store.addGuest({
        eventId: TEST_EVENT_ID_2,
        firstName: 'John',
        lastName: 'Doe',
        familyId: null,
        tags: [],
      });

      const guest = store.addGuest({
        eventId: TEST_EVENT_ID,
        firstName: 'John',
        lastName: 'Doe',
        familyId: family1.id,
        tags: [],
      });

      store.addMemberAcrossGroup(family1.id, guest);

      // Should not create a new guest but add existing to family
      const event2Guests = store.getGuestsForEvent(TEST_EVENT_ID_2);
      expect(event2Guests).toHaveLength(1);
      expect(event2Guests[0].id).toBe(existingGuest.id);
      expect(event2Guests[0].familyId).toBe(family2.id);
    });
  });

  describe('removeMemberAcrossGroup', () => {
    test('should remove member from families with same groupId', () => {
      const family1 = store.addFamily({
        eventId: TEST_EVENT_ID,
        name: 'Doe Family',
        members: [],
        groupId: 'group-1',
      });
      const family2 = store.addFamily({
        eventId: TEST_EVENT_ID_2,
        name: 'Doe Family',
        members: [],
        groupId: 'group-1',
      });

      // Add John to both families
      const guest1 = store.addGuest({
        eventId: TEST_EVENT_ID,
        firstName: 'John',
        lastName: 'Doe',
        familyId: family1.id,
        tags: [],
      });
      family1.members.push(guest1.id);

      const guest2 = store.addGuest({
        eventId: TEST_EVENT_ID_2,
        firstName: 'John',
        lastName: 'Doe',
        familyId: family2.id,
        tags: [],
      });
      family2.members.push(guest2.id);

      const updated = store.removeMemberAcrossGroup(family1.id, 'John', 'Doe');
      expect(updated).toBe(1);

      // Verify guest removed from family2
      const updatedFamily2 = store.getFamily(family2.id);
      expect(updatedFamily2?.members).not.toContain(guest2.id);
      expect(store.getGuest(guest2.id)?.familyId).toBeNull();
    });

    test('should return 0 if no matching members found', () => {
      const family = store.addFamily({
        eventId: TEST_EVENT_ID,
        name: 'Doe Family',
        members: [],
        groupId: 'group-1',
      });
      store.addFamily({
        eventId: TEST_EVENT_ID_2,
        name: 'Doe Family',
        members: [],
        groupId: 'group-1',
      });

      expect(store.removeMemberAcrossGroup(family.id, 'Nobody', 'Here')).toBe(0);
    });
  });

  // ============================================================
  // Category operations
  // ============================================================

  describe('Category operations', () => {
    test('should add a category', () => {
      store.addCategory({ name: 'Test Category', color: '#FF0000' });

      const category = store.getCategory('Test Category');
      expect(category).toBeDefined();
      expect(category?.color).toBe('#FF0000');
    });

    test('should get category case-insensitively', () => {
      store.addCategory({ name: 'Test Category', color: '#FF0000' });

      expect(store.getCategory('test category')).toBeDefined();
      expect(store.getCategory('TEST CATEGORY')).toBeDefined();
    });

    test('should return all categories sorted alphabetically', () => {
      // Clear default categories
      const categories = store.getAllCategories();
      for (const cat of categories) {
        store.deleteCategory(cat.name);
      }

      store.addCategory({ name: 'Zebra', color: '#000000' });
      store.addCategory({ name: 'Apple', color: '#111111' });

      const sorted = store.getAllCategories();
      expect(sorted[0].name).toBe('Apple');
      expect(sorted[1].name).toBe('Zebra');
    });

    test('should delete a category', () => {
      store.addCategory({ name: 'To Delete', color: '#FF0000' });
      expect(store.deleteCategory('To Delete')).toBe(true);
      expect(store.getCategory('To Delete')).toBeUndefined();
    });

    test('should return false deleting non-existent category', () => {
      expect(store.deleteCategory('Nonexistent')).toBe(false);
    });

    test('should rename a category and update guest tags', () => {
      store.addCategory({ name: 'Old Cat', color: '#FF0000' });
      store.addGuest({
        eventId: TEST_EVENT_ID,
        firstName: 'John',
        lastName: 'Doe',
        familyId: null,
        tags: ['Old Cat'],
      });

      const renamed = store.renameCategory('Old Cat', 'New Cat');

      expect(renamed?.name).toBe('New Cat');
      expect(store.getCategory('Old Cat')).toBeUndefined();
      expect(store.getCategory('New Cat')).toBeDefined();

      const guests = store.getGuestsForEvent(TEST_EVENT_ID);
      expect(guests[0].tags).toContain('New Cat');
      expect(guests[0].tags).not.toContain('Old Cat');
    });

    test('should return null when renaming non-existent category', () => {
      expect(store.renameCategory('Nonexistent', 'New')).toBeNull();
    });

    test('should return null when renaming to existing name', () => {
      store.addCategory({ name: 'Cat A', color: '#000' });
      store.addCategory({ name: 'Cat B', color: '#111' });

      expect(store.renameCategory('Cat A', 'Cat B')).toBeNull();
    });
  });

  // ============================================================
  // Event operations
  // ============================================================

  describe('Event operations', () => {
    test('should add an event', () => {
      const event = store.addEvent({
        name: 'New Event',
        order: 2,
        createdAt: Date.now(),
        createdBy: 'test',
      });

      expect(event.id).toMatch(/^event-\d+$/);
      expect(event.name).toBe('New Event');
    });

    test('should get all events sorted by order', () => {
      const events = store.getAllEvents();
      expect(events.length).toBeGreaterThanOrEqual(2);
      for (let i = 1; i < events.length; i++) {
        expect(events[i].order).toBeGreaterThanOrEqual(events[i - 1].order);
      }
    });

    test('should update an event', () => {
      const events = store.getAllEvents();
      const updated = store.updateEvent(events[0].id, { name: 'Updated' });
      expect(updated?.name).toBe('Updated');
    });

    test('should return null updating non-existent event', () => {
      expect(store.updateEvent('event-999', { name: 'X' })).toBeNull();
    });

    test('should delete an event and all associated data', () => {
      const event = store.addEvent({
        name: 'To Delete',
        order: 10,
        createdAt: Date.now(),
        createdBy: 'test',
      });
      store.addGuest({
        eventId: event.id,
        firstName: 'Test',
        lastName: 'Guest',
        familyId: null,
        tags: [],
      });
      store.addFamily({ eventId: event.id, name: 'Test Family', members: [] });

      store.deleteEvent(event.id);

      expect(store.getEvent(event.id)).toBeUndefined();
      expect(store.getGuestsForEvent(event.id)).toHaveLength(0);
      expect(store.getFamiliesForEvent(event.id)).toHaveLength(0);
    });

    test('should reorder events', () => {
      const events = store.getAllEvents();
      const ids = events.map((e) => e.id).reverse();

      store.reorderEvents(ids);

      const reordered = store.getAllEvents();
      expect(reordered[0].id).toBe(ids[0]);
    });
  });

  // ============================================================
  // User operations
  // ============================================================

  describe('User operations', () => {
    test('should add a user', () => {
      const user = store.addUser({
        username: 'testuser',
        passwordHash: 'hash123',
        isOwner: false,
        createdAt: Date.now(),
        createdBy: 'test',
      });

      expect(user.id).toMatch(/^user-\d+$/);
      expect(user.username).toBe('testuser');
    });

    test('should find user by username (case-insensitive)', () => {
      store.addUser({
        username: 'TestUser',
        passwordHash: 'hash',
        isOwner: false,
        createdAt: Date.now(),
        createdBy: 'test',
      });

      expect(store.getUserByUsername('testuser')).toBeDefined();
      expect(store.getUserByUsername('TESTUSER')).toBeDefined();
    });

    test('should update a user', () => {
      const user = store.addUser({
        username: 'testuser',
        passwordHash: 'oldhash',
        isOwner: false,
        createdAt: Date.now(),
        createdBy: 'test',
      });

      const updated = store.updateUser(user.id, { passwordHash: 'newhash' });
      expect(updated?.passwordHash).toBe('newhash');
    });

    test('should delete a user and their permissions', () => {
      const user = store.addUser({
        username: 'todelete',
        passwordHash: 'hash',
        isOwner: false,
        createdAt: Date.now(),
        createdBy: 'test',
      });
      store.setPermission(user.id, TEST_EVENT_ID, 'admin');

      store.deleteUser(user.id);

      expect(store.getUser(user.id)).toBeUndefined();
      // Permission should be cleaned up
      expect(store.getPermission(user.id, TEST_EVENT_ID)).toBe('viewer'); // defaults
    });
  });

  // ============================================================
  // Permission operations
  // ============================================================

  describe('Permission operations', () => {
    test('should set and get permission', () => {
      const user = store.addUser({
        username: 'permuser',
        passwordHash: 'hash',
        isOwner: false,
        createdAt: Date.now(),
        createdBy: 'test',
      });

      store.setPermission(user.id, TEST_EVENT_ID, 'admin');
      expect(store.getPermission(user.id, TEST_EVENT_ID)).toBe('admin');
    });

    test('should default to viewer for unset permissions', () => {
      expect(store.getPermission('user-999', TEST_EVENT_ID)).toBe('viewer');
    });

    test('should return user permissions', () => {
      const user = store.addUser({
        username: 'multiuser',
        passwordHash: 'hash',
        isOwner: false,
        createdAt: Date.now(),
        createdBy: 'test',
      });

      store.setPermission(user.id, TEST_EVENT_ID, 'admin');
      store.setPermission(user.id, TEST_EVENT_ID_2, 'viewer');

      const perms = store.getUserPermissions(user.id);
      expect(perms).toHaveLength(2);
    });

    test('should return event permissions', () => {
      const user1 = store.addUser({
        username: 'user1',
        passwordHash: 'hash',
        isOwner: false,
        createdAt: Date.now(),
        createdBy: 'test',
      });
      const user2 = store.addUser({
        username: 'user2',
        passwordHash: 'hash',
        isOwner: false,
        createdAt: Date.now(),
        createdBy: 'test',
      });

      store.setPermission(user1.id, TEST_EVENT_ID, 'admin');
      store.setPermission(user2.id, TEST_EVENT_ID, 'viewer');

      const perms = store.getEventPermissions(TEST_EVENT_ID);
      expect(perms.length).toBeGreaterThanOrEqual(2);
    });

    test('should assign default permissions to new user', () => {
      const user = store.addUser({
        username: 'defaultuser',
        passwordHash: 'hash',
        isOwner: false,
        createdAt: Date.now(),
        createdBy: 'test',
      });

      store.assignDefaultPermissions(user.id);

      const events = store.getAllEvents();
      for (const event of events) {
        expect(store.getPermission(user.id, event.id)).toBe('viewer');
      }
    });
  });

  // ============================================================
  // Backup settings
  // ============================================================

  describe('Backup settings', () => {
    test('should return default backup settings', () => {
      const settings = store.getBackupSettings();
      expect(settings.enabled).toBe(true);
      expect(settings.maxBackups).toBe(5);
      expect(settings.backupTime).toBe('02:00');
    });

    test('should update backup settings partially', () => {
      store.updateBackupSettings({ maxBackups: 10 });

      const settings = store.getBackupSettings();
      expect(settings.maxBackups).toBe(10);
      expect(settings.enabled).toBe(true); // unchanged
    });

    test('should return a copy (not reference)', () => {
      const settings1 = store.getBackupSettings();
      settings1.maxBackups = 999;

      const settings2 = store.getBackupSettings();
      expect(settings2.maxBackups).not.toBe(999);
    });
  });

  // ============================================================
  // Import/Export
  // ============================================================

  describe('Import/Export', () => {
    test('should export data', () => {
      store.addGuest({
        eventId: TEST_EVENT_ID,
        firstName: 'John',
        lastName: 'Doe',
        familyId: null,
        tags: [],
      });

      const exported = store.getExportData();
      expect(exported.guests.length).toBeGreaterThanOrEqual(1);
      expect(exported.events?.length).toBeGreaterThanOrEqual(2);
      expect(exported.categories.length).toBeGreaterThanOrEqual(1);
    });

    test('should import data and replace existing', () => {
      store.addGuest({
        eventId: TEST_EVENT_ID,
        firstName: 'Old',
        lastName: 'Guest',
        familyId: null,
        tags: [],
      });

      store.importData({
        guests: [
          {
            id: 'guest-100',
            eventId: 'event-1',
            firstName: 'Imported',
            lastName: 'Guest',
            familyId: null,
            tags: [],
          },
        ],
        families: [],
        categories: [{ name: 'New Cat', color: '#FF0000' }],
        users: [],
        events: [
          {
            id: 'event-1',
            name: 'Imported Event',
            order: 0,
            createdAt: Date.now(),
            createdBy: 'import',
          },
        ],
        permissions: [],
      });

      expect(store.getAllGuests()).toHaveLength(1);
      expect(store.getAllGuests()[0].firstName).toBe('Imported');
    });
  });

  // ============================================================
  // Clear
  // ============================================================

  describe('clear', () => {
    test('should clear all data', async () => {
      store.addGuest({
        eventId: TEST_EVENT_ID,
        firstName: 'John',
        lastName: 'Doe',
        familyId: null,
        tags: [],
      });

      await store.clear();

      expect(store.getAllGuests()).toHaveLength(0);
      expect(store.getAllFamilies()).toHaveLength(0);
      expect(store.getAllUsers()).toHaveLength(0);
    });
  });
});
