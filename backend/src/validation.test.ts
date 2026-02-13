import {
  CreateGuestSchema,
  UpdateGuestSchema,
  GuestSchema,
  CreateFamilySchema,
  UpdateFamilySchema,
  FamilySchema,
  CreateCategorySchema,
  CategoryInfoSchema,
  CreateEventSchema,
  UpdateEventSchema,
  EventSchema,
  CreateUserSchema,
  UpdateUserSchema,
  UserSchema,
  RSVPStatusSchema,
  AgeGroupSchema,
  PermissionLevelSchema,
  SetPermissionSchema,
  CopyGuestSchema,
  BulkRsvpUpdateSchema,
  UpdateBackupSettingsSchema,
  RestoreBackupSchema,
  BACKUP_FILENAME_REGEX,
  LoginSchema,
  ImportDataSchema,
  validate,
} from './validation';

describe('Validation Schemas', () => {
  // ============================================================
  // RSVPStatusSchema
  // ============================================================

  describe('RSVPStatusSchema', () => {
    test('should accept valid RSVP statuses', () => {
      expect(RSVPStatusSchema.parse('pending')).toBe('pending');
      expect(RSVPStatusSchema.parse('accepted')).toBe('accepted');
      expect(RSVPStatusSchema.parse('declined')).toBe('declined');
    });

    test('should reject invalid RSVP status', () => {
      expect(() => RSVPStatusSchema.parse('maybe')).toThrow();
    });
  });

  // ============================================================
  // AgeGroupSchema
  // ============================================================

  describe('AgeGroupSchema', () => {
    test('should accept valid age groups', () => {
      expect(AgeGroupSchema.parse('adult')).toBe('adult');
      expect(AgeGroupSchema.parse('child')).toBe('child');
    });

    test('should reject invalid age group', () => {
      expect(() => AgeGroupSchema.parse('teen')).toThrow();
    });
  });

  // ============================================================
  // PermissionLevelSchema
  // ============================================================

  describe('PermissionLevelSchema', () => {
    test('should accept valid permissions', () => {
      expect(PermissionLevelSchema.parse('admin')).toBe('admin');
      expect(PermissionLevelSchema.parse('viewer')).toBe('viewer');
      expect(PermissionLevelSchema.parse('none')).toBe('none');
    });

    test('should reject invalid permission', () => {
      expect(() => PermissionLevelSchema.parse('editor')).toThrow();
    });
  });

  // ============================================================
  // CreateGuestSchema
  // ============================================================

  describe('CreateGuestSchema', () => {
    test('should accept valid guest data', () => {
      const result = CreateGuestSchema.parse({
        firstName: 'John',
        lastName: 'Doe',
        tags: ['Bride Family'],
      });

      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.tags).toEqual(['Bride Family']);
    });

    test('should default firstName and lastName to empty string', () => {
      const result = CreateGuestSchema.parse({});
      expect(result.firstName).toBe('');
      expect(result.lastName).toBe('');
      expect(result.tags).toEqual([]);
    });

    test('should trim whitespace', () => {
      const result = CreateGuestSchema.parse({
        firstName: '  John  ',
        lastName: '  Doe  ',
      });
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
    });

    test('should strip XSS characters', () => {
      const result = CreateGuestSchema.parse({
        firstName: 'John<script>',
        lastName: 'Doe>alert',
      });
      expect(result.firstName).toBe('Johnscript');
      expect(result.lastName).toBe('Doealert');
    });

    test('should reject names exceeding max length', () => {
      const longName = 'a'.repeat(101);
      expect(() =>
        CreateGuestSchema.parse({ firstName: longName }),
      ).toThrow();
    });

    test('should accept optional RSVP status', () => {
      const result = CreateGuestSchema.parse({
        rsvp: 'accepted',
      });
      expect(result.rsvp).toBe('accepted');
    });

    test('should accept optional ageGroup', () => {
      const result = CreateGuestSchema.parse({
        ageGroup: 'child',
      });
      expect(result.ageGroup).toBe('child');
    });

    test('should accept optional dietary requirements', () => {
      const result = CreateGuestSchema.parse({
        dietaryRequirements: 'Vegetarian',
      });
      expect(result.dietaryRequirements).toBe('Vegetarian');
    });

    test('should reject too many tags', () => {
      const tags = Array.from({ length: 21 }, (_, i) => `tag-${i}`);
      expect(() => CreateGuestSchema.parse({ tags })).toThrow();
    });
  });

  // ============================================================
  // UpdateGuestSchema
  // ============================================================

  describe('UpdateGuestSchema', () => {
    test('should accept partial updates', () => {
      const result = UpdateGuestSchema.parse({ firstName: 'Jane' });
      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBeUndefined();
    });

    test('should accept empty object (no updates)', () => {
      const result = UpdateGuestSchema.parse({});
      expect(result).toEqual({});
    });

    test('should accept rsvp update', () => {
      const result = UpdateGuestSchema.parse({ rsvp: 'declined' });
      expect(result.rsvp).toBe('declined');
    });

    test('should accept ageGroup update', () => {
      const result = UpdateGuestSchema.parse({ ageGroup: 'child' });
      expect(result.ageGroup).toBe('child');
    });
  });

  // ============================================================
  // GuestSchema (full)
  // ============================================================

  describe('GuestSchema', () => {
    test('should accept valid full guest', () => {
      const result = GuestSchema.parse({
        id: 'guest-1',
        eventId: 'event-1',
        firstName: 'John',
        lastName: 'Doe',
        familyId: null,
        tags: ['tag1'],
        rsvp: 'pending',
        ageGroup: 'adult',
      });
      expect(result.id).toBe('guest-1');
    });

    test('should reject invalid guest ID format', () => {
      expect(() =>
        GuestSchema.parse({
          id: 'invalid-id',
          eventId: 'event-1',
          firstName: 'John',
          lastName: 'Doe',
          familyId: null,
          tags: [],
        }),
      ).toThrow();
    });

    test('should reject invalid event ID format', () => {
      expect(() =>
        GuestSchema.parse({
          id: 'guest-1',
          eventId: 'invalid-event',
          firstName: 'John',
          lastName: 'Doe',
          familyId: null,
          tags: [],
        }),
      ).toThrow();
    });
  });

  // ============================================================
  // CreateFamilySchema
  // ============================================================

  describe('CreateFamilySchema', () => {
    test('should accept valid family', () => {
      const result = CreateFamilySchema.parse({
        name: 'Doe Family',
        members: [{ firstName: 'John', lastName: 'Doe' }],
      });
      expect(result.name).toBe('Doe Family');
    });

    test('should require family name', () => {
      expect(() => CreateFamilySchema.parse({ members: [] })).toThrow();
    });

    test('should reject empty family name', () => {
      expect(() =>
        CreateFamilySchema.parse({ name: '', members: [] }),
      ).toThrow();
    });

    test('should strip XSS from name', () => {
      const result = CreateFamilySchema.parse({
        name: 'Doe<script>Family',
      });
      expect(result.name).toBe('DoescriptFamily');
    });

    test('should default members to empty array', () => {
      const result = CreateFamilySchema.parse({ name: 'Test' });
      expect(result.members).toEqual([]);
    });

    test('should accept string member (existing guest ID)', () => {
      const result = CreateFamilySchema.parse({
        name: 'Test',
        members: ['guest-1'],
      });
      expect(result.members[0]).toBe('guest-1');
    });
  });

  // ============================================================
  // UpdateFamilySchema
  // ============================================================

  describe('UpdateFamilySchema', () => {
    test('should accept partial update', () => {
      const result = UpdateFamilySchema.parse({ name: 'New Name' });
      expect(result.name).toBe('New Name');
    });

    test('should reject empty name', () => {
      expect(() => UpdateFamilySchema.parse({ name: '' })).toThrow();
    });
  });

  // ============================================================
  // FamilySchema (full)
  // ============================================================

  describe('FamilySchema', () => {
    test('should accept valid family', () => {
      const result = FamilySchema.parse({
        id: 'family-1',
        eventId: 'event-1',
        name: 'Doe Family',
        members: ['guest-1'],
        groupId: 'group-1',
      });
      expect(result.groupId).toBe('group-1');
    });

    test('should accept family without groupId', () => {
      const result = FamilySchema.parse({
        id: 'family-1',
        eventId: 'event-1',
        name: 'Doe Family',
        members: [],
      });
      expect(result.groupId).toBeUndefined();
    });

    test('should reject invalid family ID', () => {
      expect(() =>
        FamilySchema.parse({
          id: 'bad-id',
          eventId: 'event-1',
          name: 'Test',
          members: [],
        }),
      ).toThrow();
    });
  });

  // ============================================================
  // Category schemas
  // ============================================================

  describe('CreateCategorySchema', () => {
    test('should accept valid category name', () => {
      const result = CreateCategorySchema.parse({ name: 'Test Category' });
      expect(result.name).toBe('Test Category');
    });

    test('should reject empty name', () => {
      expect(() => CreateCategorySchema.parse({ name: '' })).toThrow();
    });

    test('should reject name exceeding max length', () => {
      expect(() =>
        CreateCategorySchema.parse({ name: 'a'.repeat(51) }),
      ).toThrow();
    });
  });

  describe('CategoryInfoSchema', () => {
    test('should accept valid category info', () => {
      const result = CategoryInfoSchema.parse({
        name: 'Test',
        color: '#FF0000',
      });
      expect(result.color).toBe('#FF0000');
    });

    test('should reject invalid color format', () => {
      expect(() =>
        CategoryInfoSchema.parse({ name: 'Test', color: 'red' }),
      ).toThrow();
      expect(() =>
        CategoryInfoSchema.parse({ name: 'Test', color: '#GGG000' }),
      ).toThrow();
    });
  });

  // ============================================================
  // Event schemas
  // ============================================================

  describe('CreateEventSchema', () => {
    test('should accept valid event', () => {
      const result = CreateEventSchema.parse({
        name: 'Ceremony',
        date: '2025-06-15',
        location: 'Church',
      });
      expect(result.name).toBe('Ceremony');
    });

    test('should require name', () => {
      expect(() => CreateEventSchema.parse({})).toThrow();
    });

    test('should accept event without date and location', () => {
      const result = CreateEventSchema.parse({ name: 'Ceremony' });
      expect(result.date).toBeUndefined();
      expect(result.location).toBeUndefined();
    });
  });

  describe('EventSchema', () => {
    test('should accept valid full event', () => {
      const result = EventSchema.parse({
        id: 'event-1',
        name: 'Ceremony',
        order: 0,
        createdAt: Date.now(),
        createdBy: 'admin',
      });
      expect(result.id).toBe('event-1');
    });
  });

  // ============================================================
  // User schemas
  // ============================================================

  describe('CreateUserSchema', () => {
    test('should accept valid user', () => {
      const result = CreateUserSchema.parse({
        username: 'testuser',
        password: 'password123',
      });
      expect(result.username).toBe('testuser');
    });

    test('should lowercase username', () => {
      const result = CreateUserSchema.parse({
        username: 'TestUser',
        password: 'pass',
      });
      expect(result.username).toBe('testuser');
    });

    test('should reject invalid username characters', () => {
      expect(() =>
        CreateUserSchema.parse({
          username: 'test user!',
          password: 'pass',
        }),
      ).toThrow();
    });

    test('should reject empty username', () => {
      expect(() =>
        CreateUserSchema.parse({ username: '', password: 'pass' }),
      ).toThrow();
    });
  });

  // ============================================================
  // Permission schemas
  // ============================================================

  describe('SetPermissionSchema', () => {
    test('should accept valid permission', () => {
      const result = SetPermissionSchema.parse({
        userId: 'user-1',
        eventId: 'event-1',
        permission: 'admin',
      });
      expect(result.permission).toBe('admin');
    });
  });

  // ============================================================
  // Copy schemas
  // ============================================================

  describe('CopyGuestSchema', () => {
    test('should accept valid target event ID', () => {
      const result = CopyGuestSchema.parse({ targetEventId: 'event-2' });
      expect(result.targetEventId).toBe('event-2');
    });

    test('should reject empty target event ID', () => {
      expect(() => CopyGuestSchema.parse({ targetEventId: '' })).toThrow();
    });
  });

  // ============================================================
  // Bulk RSVP
  // ============================================================

  describe('BulkRsvpUpdateSchema', () => {
    test('should accept valid bulk update', () => {
      const result = BulkRsvpUpdateSchema.parse({
        guestIds: ['guest-1', 'guest-2'],
        rsvp: 'accepted',
      });
      expect(result.guestIds).toHaveLength(2);
    });

    test('should reject empty guest IDs array', () => {
      expect(() =>
        BulkRsvpUpdateSchema.parse({ guestIds: [], rsvp: 'accepted' }),
      ).toThrow();
    });
  });

  // ============================================================
  // Backup schemas
  // ============================================================

  describe('UpdateBackupSettingsSchema', () => {
    test('should accept valid settings update', () => {
      const result = UpdateBackupSettingsSchema.parse({
        enabled: false,
        maxBackups: 3,
        backupTime: '14:30',
      });
      expect(result.enabled).toBe(false);
      expect(result.maxBackups).toBe(3);
      expect(result.backupTime).toBe('14:30');
    });

    test('should accept partial update', () => {
      const result = UpdateBackupSettingsSchema.parse({ enabled: true });
      expect(result.enabled).toBe(true);
      expect(result.maxBackups).toBeUndefined();
    });

    test('should reject maxBackups below 1', () => {
      expect(() =>
        UpdateBackupSettingsSchema.parse({ maxBackups: 0 }),
      ).toThrow();
    });

    test('should reject maxBackups above 10', () => {
      expect(() =>
        UpdateBackupSettingsSchema.parse({ maxBackups: 11 }),
      ).toThrow();
    });

    test('should reject invalid backup time format', () => {
      expect(() =>
        UpdateBackupSettingsSchema.parse({ backupTime: '2:30' }),
      ).toThrow();
      expect(() =>
        UpdateBackupSettingsSchema.parse({ backupTime: '25:00' }),
      ).toThrow();
      expect(() =>
        UpdateBackupSettingsSchema.parse({ backupTime: '12:60' }),
      ).toThrow();
    });

    test('should accept valid edge-case times', () => {
      expect(
        UpdateBackupSettingsSchema.parse({ backupTime: '00:00' }).backupTime,
      ).toBe('00:00');
      expect(
        UpdateBackupSettingsSchema.parse({ backupTime: '23:59' }).backupTime,
      ).toBe('23:59');
    });
  });

  describe('RestoreBackupSchema', () => {
    test('should accept valid backup filename', () => {
      const result = RestoreBackupSchema.parse({
        filename: 'data-backup-2024-01-15-143000.json',
      });
      expect(result.filename).toBe('data-backup-2024-01-15-143000.json');
    });

    test('should reject invalid filenames', () => {
      expect(() =>
        RestoreBackupSchema.parse({ filename: 'evil.json' }),
      ).toThrow();
      expect(() =>
        RestoreBackupSchema.parse({ filename: '../../../etc/passwd' }),
      ).toThrow();
    });
  });

  describe('BACKUP_FILENAME_REGEX', () => {
    test('should match valid backup filenames', () => {
      expect(BACKUP_FILENAME_REGEX.test('data-backup-2024-01-15-143000.json')).toBe(true);
      expect(BACKUP_FILENAME_REGEX.test('data-backup-20240115143000.json')).toBe(true);
    });

    test('should reject invalid filenames', () => {
      expect(BACKUP_FILENAME_REGEX.test('backup.json')).toBe(false);
      expect(BACKUP_FILENAME_REGEX.test('data-backup-abc.json')).toBe(false);
      expect(BACKUP_FILENAME_REGEX.test('../data-backup-123.json')).toBe(false);
    });
  });

  // ============================================================
  // Login schema
  // ============================================================

  describe('LoginSchema', () => {
    test('should accept valid credentials', () => {
      const result = LoginSchema.parse({
        username: 'admin',
        password: 'password',
      });
      expect(result.username).toBe('admin');
    });

    test('should reject empty username', () => {
      expect(() =>
        LoginSchema.parse({ username: '', password: 'pass' }),
      ).toThrow();
    });

    test('should reject empty password', () => {
      expect(() =>
        LoginSchema.parse({ username: 'admin', password: '' }),
      ).toThrow();
    });
  });

  // ============================================================
  // ImportDataSchema
  // ============================================================

  describe('ImportDataSchema', () => {
    const validEvent = {
      id: 'event-1',
      name: 'Test',
      order: 0,
      createdAt: Date.now(),
      createdBy: 'test',
    };

    test('should accept valid import data', () => {
      const result = ImportDataSchema.parse({
        guests: [
          {
            id: 'guest-1',
            eventId: 'event-1',
            firstName: 'John',
            lastName: 'Doe',
            familyId: null,
            tags: [],
          },
        ],
        families: [],
        categories: [{ name: 'Test', color: '#FF0000' }],
        events: [validEvent],
      });

      expect(result.guests).toHaveLength(1);
    });

    test('should reject guests referencing non-existent families', () => {
      const result = ImportDataSchema.safeParse({
        guests: [
          {
            id: 'guest-1',
            eventId: 'event-1',
            firstName: 'John',
            lastName: 'Doe',
            familyId: 'family-999',
            tags: [],
          },
        ],
        families: [],
        categories: [],
        events: [validEvent],
      });

      expect(result.success).toBe(false);
    });

    test('should reject families referencing non-existent guests', () => {
      const result = ImportDataSchema.safeParse({
        guests: [],
        families: [
          {
            id: 'family-1',
            eventId: 'event-1',
            name: 'Test',
            members: ['guest-999'],
          },
        ],
        categories: [],
        events: [validEvent],
      });

      expect(result.success).toBe(false);
    });

    test('should reject guests referencing non-existent events', () => {
      const result = ImportDataSchema.safeParse({
        guests: [
          {
            id: 'guest-1',
            eventId: 'event-999',
            firstName: 'John',
            lastName: 'Doe',
            familyId: null,
            tags: [],
          },
        ],
        families: [],
        categories: [],
        events: [validEvent],
      });

      expect(result.success).toBe(false);
    });

    test('should default optional arrays to empty', () => {
      const result = ImportDataSchema.parse({
        guests: [],
        families: [],
        categories: [],
        events: [],
      });

      expect(result.users).toEqual([]);
      expect(result.permissions).toEqual([]);
    });
  });

  // ============================================================
  // validate helper
  // ============================================================

  describe('validate helper', () => {
    test('should return success with parsed data', () => {
      const result = validate(CreateGuestSchema, {
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.firstName).toBe('John');
      }
    });

    test('should return error with message and details', () => {
      const result = validate(CreateEventSchema, {});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy();
        expect(result.details).toBeDefined();
      }
    });
  });
});
