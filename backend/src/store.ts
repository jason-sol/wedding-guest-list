/**
 * Data store with async file persistence.
 * Uses in-memory Maps for fast access with async JSON file backup.
 * Supports multi-user permissions and event-scoped guest lists.
 */

import { Guest, Family, CategoryInfo, User, Event, UserEventPermission, PermissionLevel, BackupSettings, Table } from '../../shared/types/index';
import { getCategoryColor } from '../../shared/utils/colors';
import * as fs from 'fs/promises';
import { getConfig } from './config';

// Default categories
const DEFAULT_CATEGORIES: CategoryInfo[] = [
  { name: 'Bridal Party', color: getCategoryColor('Bridal Party') },
  { name: 'Bride Family', color: getCategoryColor('Bride Family') },
  { name: 'Groom Family', color: getCategoryColor('Groom Family') },
  { name: 'Church Friends', color: getCategoryColor('Church Friends') },
  { name: 'Church Families', color: getCategoryColor('Church Families') },
  { name: 'Sophie UTS', color: getCategoryColor('Sophie UTS') },
  { name: 'Sophie High School', color: getCategoryColor('Sophie High School') },
  { name: 'Sophie Other', color: getCategoryColor('Sophie Other') },
  { name: 'Jason High School', color: getCategoryColor('Jason High School') },
  { name: 'Jason UNSW', color: getCategoryColor('Jason UNSW') },
  { name: 'Jason Other', color: getCategoryColor('Jason Other') },
];

// Legacy guest format (before event-scoped lists)
interface LegacyGuest {
  id: string;
  firstName: string;
  lastName: string;
  familyId: string | null;
  tags: string[];
  rsvp?: string;
  reception?: boolean;
  events?: string[];
}

// Legacy family format
interface LegacyFamily {
  id: string;
  name: string;
  members: string[];
}

interface StoredData {
  guests: Guest[];
  families: Family[];
  categories: CategoryInfo[];
  users?: User[];
  events?: Event[];
  permissions?: UserEventPermission[];
  backupSettings?: BackupSettings;
  tables?: Table[];
}

/**
 * In-memory data store with async JSON file persistence.
 * Data is kept in memory for fast access and persisted to disk asynchronously.
 */
class DataStore {
  // Core data
  private guests: Map<string, Guest> = new Map();
  private families: Map<string, Family> = new Map();
  private categories: Map<string, CategoryInfo> = new Map();
  private tables: Map<string, Table> = new Map();

  // Secondary indexes for fast event-scoped and name-based lookups
  private guestsByEvent: Map<string, Set<string>> = new Map();    // eventId → guestIds
  private familiesByEvent: Map<string, Set<string>> = new Map();  // eventId → familyIds
  private guestsByName: Map<string, Set<string>> = new Map();     // "firstname|lastname" → guestIds
  private tablesByEvent: Map<string, Set<string>> = new Map();    // eventId → tableIds

  // Multi-user data
  private users: Map<string, User> = new Map();
  private events: Map<string, Event> = new Map();
  private permissions: Map<string, UserEventPermission> = new Map(); // key: `${userId}-${eventId}`

  // Backup settings
  private backupSettings: BackupSettings = {
    enabled: true,
    maxBackups: 5,
    backupTime: '02:00',
  };

  // ID counters
  private nextGuestId = 1;
  private nextFamilyId = 1;
  private nextUserId = 1;
  private nextEventId = 1;
  private nextTableId = 1;

  // File persistence
  private dataFilePath: string;
  private saveTimeout: NodeJS.Timeout | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    const config = getConfig();
    this.dataFilePath = config.data.filePath;
    this.initializeDefaultCategories();
    // Start initialization immediately
    this.initPromise = this.loadFromFile();
  }

  /**
   * Ensure the store is initialized before use.
   * Safe to call multiple times - will return cached promise.
   */
  async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  // ============================================================
  // Index maintenance helpers
  // ============================================================

  private static nameKey(firstName: string, lastName: string): string {
    return `${firstName.toLowerCase()}|${lastName.toLowerCase()}`;
  }

  private addGuestToIndexes(guest: Guest): void {
    // Event index
    let eventSet = this.guestsByEvent.get(guest.eventId);
    if (!eventSet) {
      eventSet = new Set();
      this.guestsByEvent.set(guest.eventId, eventSet);
    }
    eventSet.add(guest.id);

    // Name index
    const nk = DataStore.nameKey(guest.firstName, guest.lastName);
    let nameSet = this.guestsByName.get(nk);
    if (!nameSet) {
      nameSet = new Set();
      this.guestsByName.set(nk, nameSet);
    }
    nameSet.add(guest.id);
  }

  private removeGuestFromIndexes(guest: Guest): void {
    // Event index
    const eventSet = this.guestsByEvent.get(guest.eventId);
    if (eventSet) {
      eventSet.delete(guest.id);
      if (eventSet.size === 0) this.guestsByEvent.delete(guest.eventId);
    }

    // Name index
    const nk = DataStore.nameKey(guest.firstName, guest.lastName);
    const nameSet = this.guestsByName.get(nk);
    if (nameSet) {
      nameSet.delete(guest.id);
      if (nameSet.size === 0) this.guestsByName.delete(nk);
    }
  }

  private addFamilyToIndex(family: Family): void {
    let eventSet = this.familiesByEvent.get(family.eventId);
    if (!eventSet) {
      eventSet = new Set();
      this.familiesByEvent.set(family.eventId, eventSet);
    }
    eventSet.add(family.id);
  }

  private removeFamilyFromIndex(family: Family): void {
    const eventSet = this.familiesByEvent.get(family.eventId);
    if (eventSet) {
      eventSet.delete(family.id);
      if (eventSet.size === 0) this.familiesByEvent.delete(family.eventId);
    }
  }

  private addTableToIndex(table: Table): void {
    let eventSet = this.tablesByEvent.get(table.eventId);
    if (!eventSet) {
      eventSet = new Set();
      this.tablesByEvent.set(table.eventId, eventSet);
    }
    eventSet.add(table.id);
  }

  private removeTableFromIndex(table: Table): void {
    const eventSet = this.tablesByEvent.get(table.eventId);
    if (eventSet) {
      eventSet.delete(table.id);
      if (eventSet.size === 0) this.tablesByEvent.delete(table.eventId);
    }
  }

  private rebuildIndexes(): void {
    this.guestsByEvent.clear();
    this.familiesByEvent.clear();
    this.guestsByName.clear();
    this.tablesByEvent.clear();

    for (const guest of this.guests.values()) {
      this.addGuestToIndexes(guest);
    }
    for (const family of this.families.values()) {
      this.addFamilyToIndex(family);
    }
    for (const table of this.tables.values()) {
      this.addTableToIndex(table);
    }
  }

  private initializeDefaultCategories(): void {
    DEFAULT_CATEGORIES.forEach(cat => {
      this.categories.set(cat.name.toLowerCase(), cat);
    });
  }

  /**
   * Migrate legacy data format to event-scoped format.
   * Called automatically on first load if events array is missing.
   */
  private migrateToEventScoped(data: StoredData): StoredData {
    // Check if already migrated (has events)
    if (data.events && data.events.length > 0) {
      return data;
    }

    console.log('Migrating to event-scoped format...');

    const now = Date.now();

    // Create default events
    const ceremonyEvent: Event = {
      id: 'event-1',
      name: 'Ceremony',
      order: 0,
      createdAt: now,
      createdBy: 'system',
    };

    const receptionEvent: Event = {
      id: 'event-2',
      name: 'Reception',
      order: 1,
      createdAt: now,
      createdBy: 'system',
    };

    // Cast guests to legacy format to access reception field
    const legacyGuests = data.guests as unknown as LegacyGuest[];
    const legacyFamilies = data.families as unknown as LegacyFamily[];

    // Maps to track old ID -> new IDs for each event
    const ceremonyGuestIdMap = new Map<string, string>();
    const receptionGuestIdMap = new Map<string, string>();
    const ceremonyFamilyIdMap = new Map<string, string>();
    const receptionFamilyIdMap = new Map<string, string>();

    const migratedGuests: Guest[] = [];
    const migratedFamilies: Family[] = [];
    let guestIdCounter = 1;
    let familyIdCounter = 1;

    // Migrate guests to ceremony event (all guests)
    for (const oldGuest of legacyGuests) {
      const newId = `guest-${guestIdCounter++}`;
      ceremonyGuestIdMap.set(oldGuest.id, newId);

      migratedGuests.push({
        id: newId,
        eventId: ceremonyEvent.id,
        firstName: oldGuest.firstName || '',
        lastName: oldGuest.lastName || '',
        familyId: null, // Will be set after family migration
        tags: oldGuest.tags || [],
        rsvp: oldGuest.rsvp as Guest['rsvp'],
      });
    }

    // Migrate reception guests (those with reception: true)
    for (const oldGuest of legacyGuests) {
      if (oldGuest.reception === true) {
        const newId = `guest-${guestIdCounter++}`;
        receptionGuestIdMap.set(oldGuest.id, newId);

        migratedGuests.push({
          id: newId,
          eventId: receptionEvent.id,
          firstName: oldGuest.firstName || '',
          lastName: oldGuest.lastName || '',
          familyId: null, // Will be set after family migration
          tags: oldGuest.tags || [],
          rsvp: oldGuest.rsvp as Guest['rsvp'],
        });
      }
    }

    // Migrate families to ceremony event
    for (const oldFamily of legacyFamilies) {
      const newId = `family-${familyIdCounter++}`;
      ceremonyFamilyIdMap.set(oldFamily.id, newId);

      // Map member IDs to new ceremony guest IDs
      const newMembers = oldFamily.members
        .map(oldMemberId => ceremonyGuestIdMap.get(oldMemberId))
        .filter((id): id is string => id !== undefined);

      migratedFamilies.push({
        id: newId,
        eventId: ceremonyEvent.id,
        name: oldFamily.name,
        members: newMembers,
      });

      // Update guest familyId references
      for (const memberId of newMembers) {
        const guest = migratedGuests.find(g => g.id === memberId);
        if (guest) {
          guest.familyId = newId;
        }
      }
    }

    // Migrate families to reception event (only if they have reception members)
    for (const oldFamily of legacyFamilies) {
      const receptionMembers = oldFamily.members
        .map(oldMemberId => receptionGuestIdMap.get(oldMemberId))
        .filter((id): id is string => id !== undefined);

      if (receptionMembers.length > 0) {
        const newId = `family-${familyIdCounter++}`;
        receptionFamilyIdMap.set(oldFamily.id, newId);

        migratedFamilies.push({
          id: newId,
          eventId: receptionEvent.id,
          name: oldFamily.name,
          members: receptionMembers,
        });

        // Update guest familyId references
        for (const memberId of receptionMembers) {
          const guest = migratedGuests.find(g => g.id === memberId);
          if (guest) {
            guest.familyId = newId;
          }
        }
      }
    }

    console.log(`Migration complete: ${migratedGuests.length} guests, ${migratedFamilies.length} families`);

    return {
      guests: migratedGuests,
      families: migratedFamilies,
      categories: data.categories,
      users: [],
      events: [ceremonyEvent, receptionEvent],
      permissions: [],
    };
  }

  private async loadFromFile(): Promise<void> {
    try {
      const config = getConfig();

      // Ensure data directory exists
      await fs.mkdir(config.data.directory, { recursive: true });

      const rawData = await fs.readFile(this.dataFilePath, 'utf-8');
      let parsed: StoredData = JSON.parse(rawData);

      // Migrate if needed
      parsed = this.migrateToEventScoped(parsed);

      // Load guests
      if (parsed.guests && Array.isArray(parsed.guests)) {
        parsed.guests.forEach((guest: Guest) => {
          this.guests.set(guest.id, guest);
          const idNum = parseInt(guest.id.replace('guest-', ''));
          if (idNum >= this.nextGuestId) {
            this.nextGuestId = idNum + 1;
          }
        });
      }

      // Load families
      if (parsed.families && Array.isArray(parsed.families)) {
        parsed.families.forEach((family: Family) => {
          // Backfill groupId for existing families that don't have one
          if (!family.groupId) {
            family.groupId = family.id;
          }
          this.families.set(family.id, family);
          const idNum = parseInt(family.id.replace('family-', ''));
          if (idNum >= this.nextFamilyId) {
            this.nextFamilyId = idNum + 1;
          }
        });
      }

      // Load categories
      if (parsed.categories && Array.isArray(parsed.categories)) {
        this.categories.clear();
        parsed.categories.forEach((category: CategoryInfo) => {
          this.categories.set(category.name.toLowerCase(), category);
        });
      }

      // Load users
      if (parsed.users && Array.isArray(parsed.users)) {
        parsed.users.forEach((user: User) => {
          this.users.set(user.id, user);
          const idNum = parseInt(user.id.replace('user-', ''));
          if (idNum >= this.nextUserId) {
            this.nextUserId = idNum + 1;
          }
        });
      }

      // Load events
      if (parsed.events && Array.isArray(parsed.events)) {
        parsed.events.forEach((event: Event) => {
          this.events.set(event.id, event);
          const idNum = parseInt(event.id.replace('event-', ''));
          if (idNum >= this.nextEventId) {
            this.nextEventId = idNum + 1;
          }
        });
      }

      // Load permissions
      if (parsed.permissions && Array.isArray(parsed.permissions)) {
        parsed.permissions.forEach((perm: UserEventPermission) => {
          const key = `${perm.userId}-${perm.eventId}`;
          this.permissions.set(key, perm);
        });
      }

      // Load tables
      if (parsed.tables && Array.isArray(parsed.tables)) {
        parsed.tables.forEach((table: Table) => {
          this.tables.set(table.id, table);
          const idNum = parseInt(table.id.replace('table-', ''));
          if (idNum >= this.nextTableId) {
            this.nextTableId = idNum + 1;
          }
        });
      }

      // Load backup settings
      if (parsed.backupSettings) {
        this.backupSettings = { ...this.backupSettings, ...parsed.backupSettings };
      }

      // Build secondary indexes after loading all data
      this.rebuildIndexes();

      console.log(`Loaded: ${this.guests.size} guests, ${this.families.size} families, ${this.categories.size} categories, ${this.users.size} users, ${this.events.size} events`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log('No existing data file, starting fresh');
        // Create default ceremony event
        const now = Date.now();
        const defaultEvent: Event = {
          id: `event-${this.nextEventId++}`,
          name: 'Ceremony',
          order: 0,
          createdAt: now,
          createdBy: 'system',
        };
        this.events.set(defaultEvent.id, defaultEvent);
      } else {
        console.error('Error loading data from file:', error);
      }
    } finally {
      this.initialized = true;
    }
  }

  /**
   * Schedule an async save operation.
   * Debounces multiple rapid changes into a single write.
   */
  private scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      this.saveToFile().catch(err => {
        console.error('Error saving data to file:', err);
      });
    }, 500);
  }

  private async saveToFile(): Promise<void> {
    try {
      const config = getConfig();

      await fs.mkdir(config.data.directory, { recursive: true });

      const data: StoredData = {
        guests: Array.from(this.guests.values()),
        families: Array.from(this.families.values()),
        categories: Array.from(this.categories.values()),
        users: Array.from(this.users.values()),
        events: Array.from(this.events.values()),
        permissions: Array.from(this.permissions.values()),
        tables: Array.from(this.tables.values()),
        backupSettings: this.backupSettings,
      };

      const tempPath = `${this.dataFilePath}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      await fs.rename(tempPath, this.dataFilePath);
    } catch (error) {
      console.error('Error saving data to file:', error);
      throw error;
    }
  }

  /**
   * Force immediate save (useful for testing or shutdown).
   */
  async flush(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    await this.saveToFile();
  }

  // ============================================================
  // User operations
  // ============================================================

  addUser(user: Omit<User, 'id'>): User {
    const id = `user-${this.nextUserId++}`;
    const newUser: User = { ...user, id };
    this.users.set(id, newUser);
    this.scheduleSave();
    return newUser;
  }

  getUser(id: string): User | undefined {
    return this.users.get(id);
  }

  getUserByUsername(username: string): User | undefined {
    for (const user of this.users.values()) {
      if (user.username.toLowerCase() === username.toLowerCase()) {
        return user;
      }
    }
    return undefined;
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  updateUser(id: string, updates: Partial<Omit<User, 'id'>>): User | null {
    const user = this.users.get(id);
    if (!user) return null;
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    this.scheduleSave();
    return updated;
  }

  deleteUser(id: string): boolean {
    const deleted = this.users.delete(id);
    if (deleted) {
      // Also delete user's permissions
      for (const [key, perm] of this.permissions.entries()) {
        if (perm.userId === id) {
          this.permissions.delete(key);
        }
      }
      this.scheduleSave();
    }
    return deleted;
  }

  // ============================================================
  // Event operations
  // ============================================================

  addEvent(event: Omit<Event, 'id'>): Event {
    const id = `event-${this.nextEventId++}`;
    const newEvent: Event = { ...event, id };
    this.events.set(id, newEvent);

    // Give all existing non-owner users viewer permission on new event
    for (const user of this.users.values()) {
      if (!user.isOwner) {
        this.setPermission(user.id, id, 'viewer');
      }
    }

    this.scheduleSave();
    return newEvent;
  }

  getEvent(id: string): Event | undefined {
    return this.events.get(id);
  }

  getAllEvents(): Event[] {
    return Array.from(this.events.values()).sort((a, b) => a.order - b.order);
  }

  updateEvent(id: string, updates: Partial<Omit<Event, 'id'>>): Event | null {
    const event = this.events.get(id);
    if (!event) return null;
    const updated = { ...event, ...updates };
    this.events.set(id, updated);
    this.scheduleSave();
    return updated;
  }

  deleteEvent(id: string): boolean {
    const deleted = this.events.delete(id);
    if (deleted) {
      // Delete all guests in this event (and update name indexes)
      for (const [guestId, guest] of this.guests.entries()) {
        if (guest.eventId === id) {
          this.removeGuestFromIndexes(guest);
          this.guests.delete(guestId);
        }
      }
      // Clean up event index entirely
      this.guestsByEvent.delete(id);

      // Delete all families in this event
      for (const [familyId, family] of this.families.entries()) {
        if (family.eventId === id) {
          this.families.delete(familyId);
        }
      }
      this.familiesByEvent.delete(id);

      // Delete all tables in this event
      for (const [tableId, table] of this.tables.entries()) {
        if (table.eventId === id) {
          this.tables.delete(tableId);
        }
      }
      this.tablesByEvent.delete(id);

      // Delete all permissions for this event
      for (const [key, perm] of this.permissions.entries()) {
        if (perm.eventId === id) {
          this.permissions.delete(key);
        }
      }
      this.scheduleSave();
    }
    return deleted;
  }

  reorderEvents(eventIds: string[]): void {
    eventIds.forEach((id, index) => {
      const event = this.events.get(id);
      if (event) {
        event.order = index;
        this.events.set(id, event);
      }
    });
    this.scheduleSave();
  }

  // ============================================================
  // Permission operations
  // ============================================================

  setPermission(userId: string, eventId: string, permission: PermissionLevel): void {
    const key = `${userId}-${eventId}`;
    if (permission === 'none') {
      // Could either store 'none' or delete - we'll store it for explicit tracking
    }
    this.permissions.set(key, { userId, eventId, permission });
    this.scheduleSave();
  }

  getPermission(userId: string, eventId: string): PermissionLevel {
    const key = `${userId}-${eventId}`;
    const perm = this.permissions.get(key);
    // Default to viewer if no explicit permission
    return perm?.permission ?? 'viewer';
  }

  getUserPermissions(userId: string): UserEventPermission[] {
    const result: UserEventPermission[] = [];
    for (const perm of this.permissions.values()) {
      if (perm.userId === userId) {
        result.push(perm);
      }
    }
    return result;
  }

  getEventPermissions(eventId: string): UserEventPermission[] {
    const result: UserEventPermission[] = [];
    for (const perm of this.permissions.values()) {
      if (perm.eventId === eventId) {
        result.push(perm);
      }
    }
    return result;
  }

  /**
   * Assign default viewer permissions to a new user for all existing events.
   */
  assignDefaultPermissions(userId: string): void {
    for (const event of this.events.values()) {
      this.setPermission(userId, event.id, 'viewer');
    }
  }

  // ============================================================
  // Guest operations (event-scoped)
  // ============================================================

  addGuest(guest: Omit<Guest, 'id'>): Guest {
    const id = `guest-${this.nextGuestId++}`;
    const newGuest: Guest = { ...guest, id };
    this.guests.set(id, newGuest);
    this.addGuestToIndexes(newGuest);
    this.scheduleSave();
    return newGuest;
  }

  getGuest(id: string): Guest | undefined {
    return this.guests.get(id);
  }

  getAllGuests(): Guest[] {
    return Array.from(this.guests.values());
  }

  getGuestsForEvent(eventId: string): Guest[] {
    const ids = this.guestsByEvent.get(eventId);
    if (!ids) return [];
    return Array.from(ids).map(id => this.guests.get(id)!).filter(Boolean);
  }

  getGuestsByName(firstName: string, lastName: string): Guest[] {
    const nk = DataStore.nameKey(firstName, lastName);
    const ids = this.guestsByName.get(nk);
    if (!ids) return [];
    return Array.from(ids).map(id => this.guests.get(id)!).filter(Boolean);
  }

  updateGuest(id: string, updates: Partial<Omit<Guest, 'id'>>): Guest | null {
    const guest = this.guests.get(id);
    if (!guest) return null;

    // If name is changing, update name index
    const nameChanging = (updates.firstName !== undefined && updates.firstName !== guest.firstName) ||
                         (updates.lastName !== undefined && updates.lastName !== guest.lastName);
    if (nameChanging) {
      this.removeGuestFromIndexes(guest);
    }

    const updated = { ...guest, ...updates };
    this.guests.set(id, updated);

    if (nameChanging) {
      this.addGuestToIndexes(updated);
    }

    this.scheduleSave();
    return updated;
  }

  deleteGuest(id: string): boolean {
    const guest = this.guests.get(id);
    if (!guest) return false;

    // Remove from any family
    if (guest.familyId) {
      const family = this.families.get(guest.familyId);
      if (family) {
        family.members = family.members.filter(m => m !== id);
        this.families.set(family.id, family);
      }
    }

    this.removeGuestFromIndexes(guest);
    const deleted = this.guests.delete(id);
    if (deleted) {
      this.scheduleSave();
    }
    return deleted;
  }

  /**
   * Copy a guest to another event, preserving family relationships.
   */
  copyGuestToEvent(guestId: string, targetEventId: string): Guest | null {
    const sourceGuest = this.guests.get(guestId);
    if (!sourceGuest) return null;

    // Check if a guest with the same name already exists in the target event
    const targetEventGuests = this.getGuestsForEvent(targetEventId);
    const existingGuest = targetEventGuests.find(g =>
      g.firstName.toLowerCase() === sourceGuest.firstName.toLowerCase() &&
      g.lastName.toLowerCase() === sourceGuest.lastName.toLowerCase()
    );

    if (existingGuest) {
      // Guest already exists in target event, but check if we need to add them to a family
      if (!existingGuest.familyId && sourceGuest.familyId) {
        this.ensureFamilyForGuestInEvent(existingGuest, sourceGuest.familyId, targetEventId);
      }
      return existingGuest;
    }

    // Create the new guest first (without family)
    const newGuest = this.addGuest({
      eventId: targetEventId,
      firstName: sourceGuest.firstName,
      lastName: sourceGuest.lastName,
      familyId: null,
      tags: [...sourceGuest.tags],
      rsvp: undefined, // Reset RSVP for new event
      ageGroup: sourceGuest.ageGroup,
    });

    // If source guest belongs to a family, try to preserve the relationship
    if (sourceGuest.familyId) {
      this.ensureFamilyForGuestInEvent(newGuest, sourceGuest.familyId, targetEventId);
    }

    return newGuest;
  }

  /**
   * Ensure a guest is part of the appropriate family in the target event.
   * Creates the family if it doesn't exist, or adds to existing family.
   */
  private ensureFamilyForGuestInEvent(guest: Guest, sourceFamilyId: string, targetEventId: string): void {
    const sourceFamily = this.families.get(sourceFamilyId);
    if (!sourceFamily) return;

    const targetEventFamilies = this.getFamiliesForEvent(targetEventId);
    const targetEventGuests = this.getGuestsForEvent(targetEventId);

    // Get source family members
    const sourceFamilyMembers = sourceFamily.members
      .map(id => this.guests.get(id))
      .filter((g): g is Guest => g !== undefined);

    // Find target guests that match source family members (by name)
    const matchingTargetGuests = targetEventGuests.filter(targetGuest => {
      return sourceFamilyMembers.some(sourceMember =>
        sourceMember.firstName.toLowerCase() === targetGuest.firstName.toLowerCase() &&
        sourceMember.lastName.toLowerCase() === targetGuest.lastName.toLowerCase()
      );
    });

    // Look for an existing family in target where ALL its members belong to THIS source family
    // This prevents accidentally merging different families that have the same name
    let targetFamily: Family | undefined;

    for (const family of targetEventFamilies) {
      const familyMembers = family.members
        .map(id => this.guests.get(id))
        .filter((g): g is Guest => g !== undefined);

      if (familyMembers.length === 0) continue;

      // Check if ALL members of this target family match members from our source family
      const allMembersFromSourceFamily = familyMembers.every(member =>
        sourceFamilyMembers.some(sourceMember =>
          sourceMember.firstName.toLowerCase() === member.firstName.toLowerCase() &&
          sourceMember.lastName.toLowerCase() === member.lastName.toLowerCase()
        )
      );

      // Also check if at least one member matches (to confirm it's the right family)
      const hasMatchingMember = familyMembers.some(member =>
        sourceFamilyMembers.some(sourceMember =>
          sourceMember.firstName.toLowerCase() === member.firstName.toLowerCase() &&
          sourceMember.lastName.toLowerCase() === member.lastName.toLowerCase()
        )
      );

      if (allMembersFromSourceFamily && hasMatchingMember) {
        targetFamily = family;
        break;
      }
    }

    // If no suitable family found, create a new one
    if (!targetFamily && matchingTargetGuests.length >= 1) {
      // Create a new family in the target event, preserving groupId
      targetFamily = this.addFamily({
        eventId: targetEventId,
        name: sourceFamily.name,
        members: [],
        groupId: sourceFamily.groupId,
      });

      // Add existing matching members to the new family (remove from other families if needed)
      for (const member of matchingTargetGuests) {
        // Remove from any existing family first
        if (member.familyId) {
          const oldFamily = this.families.get(member.familyId);
          if (oldFamily) {
            oldFamily.members = oldFamily.members.filter(id => id !== member.id);
            // Clean up empty family
            if (oldFamily.members.length === 0) {
              this.removeFamilyFromIndex(oldFamily);
              this.families.delete(oldFamily.id);
            } else {
              this.families.set(oldFamily.id, oldFamily);
            }
          }
        }

        if (!targetFamily.members.includes(member.id)) {
          targetFamily.members.push(member.id);
          member.familyId = targetFamily.id;
          this.guests.set(member.id, member);
        }
      }
      this.families.set(targetFamily.id, targetFamily);
    }

    // Add this guest to the target family
    if (targetFamily && !targetFamily.members.includes(guest.id)) {
      targetFamily.members.push(guest.id);
      this.families.set(targetFamily.id, targetFamily);
      guest.familyId = targetFamily.id;
      this.guests.set(guest.id, guest);
    }

    this.scheduleSave();
  }

  /**
   * Reconstruct family relationships in a target event based on a source event.
   * This is useful for fixing events where families were lost or merged during copy.
   * Each source family maps to its own unique target family (even if names are the same).
   */
  reconstructFamiliesFromSource(sourceEventId: string, targetEventId: string): { familiesCreated: number; guestsUpdated: number } {
    const sourceFamilies = this.getFamiliesForEvent(sourceEventId);
    const targetGuests = this.getGuestsForEvent(targetEventId);

    let familiesCreated = 0;
    let guestsUpdated = 0;

    // Map from source family ID to target family ID to prevent re-using families
    const sourceFamilyToTargetFamily = new Map<string, string>();

    // For each family in source event
    for (const sourceFamily of sourceFamilies) {
      // Get the source family members
      const sourceFamilyMembers = sourceFamily.members
        .map(id => this.guests.get(id))
        .filter((g): g is Guest => g !== undefined);

      if (sourceFamilyMembers.length === 0) continue;

      // Find matching guests in target event (by name) that match THIS source family's members
      const matchingTargetGuests = targetGuests.filter(targetGuest => {
        return sourceFamilyMembers.some(sourceMember =>
          sourceMember.firstName.toLowerCase() === targetGuest.firstName.toLowerCase() &&
          sourceMember.lastName.toLowerCase() === targetGuest.lastName.toLowerCase()
        );
      });

      // If we have at least 2 matching guests, create/update a family
      if (matchingTargetGuests.length >= 2) {
        let targetFamily: Family | undefined;

        // Check if we've already created a target family for this source family
        const existingTargetFamilyId = sourceFamilyToTargetFamily.get(sourceFamily.id);
        if (existingTargetFamilyId) {
          targetFamily = this.families.get(existingTargetFamilyId);
        }

        if (!targetFamily) {
          // Look for an existing family that contains ONLY members from this source family
          // and hasn't been claimed by another source family
          const targetFamilies = this.getFamiliesForEvent(targetEventId);
          const claimedFamilyIds = new Set(sourceFamilyToTargetFamily.values());

          for (const family of targetFamilies) {
            // Skip families already claimed by other source families
            if (claimedFamilyIds.has(family.id)) continue;

            // Check if this family's members are all from our source family
            const familyMembers = family.members
              .map(id => this.guests.get(id))
              .filter((g): g is Guest => g !== undefined);

            const allMembersMatch = familyMembers.length > 0 && familyMembers.every(member =>
              sourceFamilyMembers.some(sourceMember =>
                sourceMember.firstName.toLowerCase() === member.firstName.toLowerCase() &&
                sourceMember.lastName.toLowerCase() === member.lastName.toLowerCase()
              )
            );

            if (allMembersMatch) {
              targetFamily = family;
              break;
            }
          }
        }

        if (!targetFamily) {
          // Create new family for this specific source family
          targetFamily = this.addFamily({
            eventId: targetEventId,
            name: sourceFamily.name,
            members: [],
          });
          familiesCreated++;
        }

        // Register this mapping
        sourceFamilyToTargetFamily.set(sourceFamily.id, targetFamily.id);

        // Add/move guests to the family
        for (const guest of matchingTargetGuests) {
          // Remove from any existing family first (even if it's a different target family)
          if (guest.familyId && guest.familyId !== targetFamily.id) {
            const oldFamily = this.families.get(guest.familyId);
            if (oldFamily) {
              oldFamily.members = oldFamily.members.filter(id => id !== guest.id);
              this.families.set(oldFamily.id, oldFamily);
            }
          }

          if (!targetFamily.members.includes(guest.id)) {
            targetFamily.members.push(guest.id);
            guest.familyId = targetFamily.id;
            this.guests.set(guest.id, guest);
            guestsUpdated++;
          }
        }
        this.families.set(targetFamily.id, targetFamily);
      }
    }

    // Clean up empty families
    const targetFamilies = this.getFamiliesForEvent(targetEventId);
    for (const family of targetFamilies) {
      if (family.members.length === 0) {
        this.removeFamilyFromIndex(family);
        this.families.delete(family.id);
      }
    }

    this.scheduleSave();
    return { familiesCreated, guestsUpdated };
  }

  // ============================================================
  // Family operations (event-scoped)
  // ============================================================

  addFamily(family: Omit<Family, 'id'>): Family {
    const id = `family-${this.nextFamilyId++}`;
    const newFamily: Family = { ...family, id, groupId: family.groupId || id };
    this.families.set(id, newFamily);
    this.addFamilyToIndex(newFamily);
    this.scheduleSave();
    return newFamily;
  }

  getFamily(id: string): Family | undefined {
    return this.families.get(id);
  }

  getAllFamilies(): Family[] {
    return Array.from(this.families.values());
  }

  getFamiliesForEvent(eventId: string): Family[] {
    const ids = this.familiesByEvent.get(eventId);
    if (!ids) return [];
    return Array.from(ids).map(id => this.families.get(id)!).filter(Boolean);
  }

  updateFamily(id: string, updates: Partial<Omit<Family, 'id'>>): Family | null {
    const family = this.families.get(id);
    if (!family) return null;
    const updated = { ...family, ...updates };
    this.families.set(id, updated);
    this.scheduleSave();
    return updated;
  }

  deleteFamily(id: string): boolean {
    const family = this.families.get(id);
    if (!family) return false;

    // Remove familyId from all members
    for (const memberId of family.members) {
      const guest = this.guests.get(memberId);
      if (guest) {
        guest.familyId = null;
        this.guests.set(memberId, guest);
      }
    }

    this.removeFamilyFromIndex(family);
    const deleted = this.families.delete(id);
    if (deleted) {
      this.scheduleSave();
    }
    return deleted;
  }

  /**
   * Copy a family and its members to another event.
   */
  copyFamilyToEvent(familyId: string, targetEventId: string): { family: Family; guests: Guest[] } | null {
    const sourceFamily = this.families.get(familyId);
    if (!sourceFamily) return null;

    const targetEventGuests = this.getGuestsForEvent(targetEventId);
    const targetEventFamilies = this.getFamiliesForEvent(targetEventId);

    // Check if family with same name already exists
    const existingFamily = targetEventFamilies.find(f =>
      f.name.toLowerCase() === sourceFamily.name.toLowerCase()
    );

    // Copy all member guests (or use existing ones)
    const copiedGuests: Guest[] = [];
    const memberIdMap = new Map<string, string>(); // old ID -> new ID

    for (const memberId of sourceFamily.members) {
      const sourceGuest = this.guests.get(memberId);
      if (sourceGuest) {
        // Check if guest with same name already exists in target event
        const existingGuest = targetEventGuests.find(g =>
          g.firstName.toLowerCase() === sourceGuest.firstName.toLowerCase() &&
          g.lastName.toLowerCase() === sourceGuest.lastName.toLowerCase()
        );

        if (existingGuest) {
          // Use existing guest
          copiedGuests.push(existingGuest);
          memberIdMap.set(memberId, existingGuest.id);
        } else {
          // Create new guest
          const newGuest = this.addGuest({
            eventId: targetEventId,
            firstName: sourceGuest.firstName,
            lastName: sourceGuest.lastName,
            familyId: null, // Will be set below
            tags: [...sourceGuest.tags],
            rsvp: undefined,
            ageGroup: sourceGuest.ageGroup,
          });
          copiedGuests.push(newGuest);
          memberIdMap.set(memberId, newGuest.id);
        }
      }
    }

    let family: Family;

    if (existingFamily) {
      // Add members to existing family (if not already in it)
      const existingMemberIds = new Set(existingFamily.members);
      const newMemberIds = copiedGuests
        .filter(g => !existingMemberIds.has(g.id))
        .map(g => g.id);

      if (newMemberIds.length > 0) {
        existingFamily.members = [...existingFamily.members, ...newMemberIds];
        this.families.set(existingFamily.id, existingFamily);
      }
      family = existingFamily;
    } else {
      // Create the family with new member IDs, preserving groupId
      family = this.addFamily({
        eventId: targetEventId,
        name: sourceFamily.name,
        members: copiedGuests.map(g => g.id),
        groupId: sourceFamily.groupId,
      });
    }

    // Update guests with family reference
    for (const guest of copiedGuests) {
      if (guest.familyId !== family.id) {
        guest.familyId = family.id;
        this.guests.set(guest.id, guest);
      }
    }

    this.scheduleSave();
    return { family, guests: copiedGuests };
  }

  /**
   * Add a member to all families sharing the same groupId.
   * Used to sync family membership across events.
   * Returns the number of families updated.
   */
  addMemberAcrossGroup(familyId: string, guest: Guest): number {
    const family = this.families.get(familyId);
    if (!family || !family.groupId) return 0;

    const groupId = family.groupId;
    let updated = 0;

    for (const [, otherFamily] of this.families) {
      if (otherFamily.id === familyId) continue;
      if (otherFamily.groupId !== groupId) continue;

      // Check if a guest with the same name already exists in this event
      const eventGuests = this.getGuestsForEvent(otherFamily.eventId);
      const existingGuest = eventGuests.find(g =>
        g.firstName.toLowerCase() === guest.firstName.toLowerCase() &&
        g.lastName.toLowerCase() === guest.lastName.toLowerCase()
      );

      if (existingGuest) {
        // Already exists — just ensure they're in the family
        if (!otherFamily.members.includes(existingGuest.id)) {
          otherFamily.members.push(existingGuest.id);
          existingGuest.familyId = otherFamily.id;
          this.guests.set(existingGuest.id, existingGuest);
          this.families.set(otherFamily.id, otherFamily);
          updated++;
        }
      } else {
        // Create new guest in other event's family
        const newGuest = this.addGuest({
          eventId: otherFamily.eventId,
          firstName: guest.firstName,
          lastName: guest.lastName,
          familyId: otherFamily.id,
          tags: [...guest.tags],
          rsvp: undefined,
          ageGroup: guest.ageGroup,
        });
        otherFamily.members.push(newGuest.id);
        this.families.set(otherFamily.id, otherFamily);
        updated++;
      }
    }

    if (updated > 0) {
      this.scheduleSave();
    }

    return updated;
  }

  /**
   * Remove a member from all families sharing the same groupId.
   * Mirrors addMemberAcrossGroup() for cross-event member removal.
   * Returns the number of families updated.
   */
  removeMemberAcrossGroup(familyId: string, guestFirstName: string, guestLastName: string): number {
    const family = this.families.get(familyId);
    if (!family || !family.groupId) return 0;

    const groupId = family.groupId;
    let updated = 0;

    for (const [, otherFamily] of this.families) {
      if (otherFamily.id === familyId) continue;
      if (otherFamily.groupId !== groupId) continue;

      // Find the member matching by name (case-insensitive)
      const memberIndex = otherFamily.members.findIndex(memberId => {
        const member = this.guests.get(memberId);
        if (!member) return false;
        return member.firstName.toLowerCase() === guestFirstName.toLowerCase() &&
               member.lastName.toLowerCase() === guestLastName.toLowerCase();
      });

      if (memberIndex !== -1) {
        const memberId = otherFamily.members[memberIndex];
        const member = this.guests.get(memberId);

        // Remove from family members array
        otherFamily.members.splice(memberIndex, 1);
        this.families.set(otherFamily.id, otherFamily);

        // Clear guest's familyId
        if (member) {
          member.familyId = null;
          this.guests.set(memberId, member);
        }

        updated++;
      }
    }

    if (updated > 0) {
      this.scheduleSave();
    }

    return updated;
  }

  // ============================================================
  // Table operations (event-scoped, seating chart)
  // ============================================================

  addTable(table: Omit<Table, 'id'>): Table {
    const id = `table-${this.nextTableId++}`;
    const newTable: Table = { ...table, id };
    this.tables.set(id, newTable);
    this.addTableToIndex(newTable);
    this.scheduleSave();
    return newTable;
  }

  getTable(id: string): Table | undefined {
    return this.tables.get(id);
  }

  getAllTables(): Table[] {
    return Array.from(this.tables.values());
  }

  getTablesForEvent(eventId: string): Table[] {
    const ids = this.tablesByEvent.get(eventId);
    if (!ids) return [];
    return Array.from(ids).map(id => this.tables.get(id)!).filter(Boolean);
  }

  updateTable(id: string, updates: Partial<Omit<Table, 'id' | 'eventId'>>): Table | null {
    const table = this.tables.get(id);
    if (!table) return null;
    const updated = { ...table, ...updates };
    this.tables.set(id, updated);
    this.scheduleSave();
    return updated;
  }

  deleteTable(id: string): boolean {
    const table = this.tables.get(id);
    if (!table) return false;
    this.removeTableFromIndex(table);
    const deleted = this.tables.delete(id);
    if (deleted) {
      this.scheduleSave();
    }
    return deleted;
  }

  /**
   * Assign guests to a table, removing them from other tables in the same event.
   */
  assignGuestsToTable(tableId: string, guestIds: string[]): Table | null {
    const table = this.tables.get(tableId);
    if (!table) return null;

    // Remove these guests from any other tables in the same event
    const eventTables = this.getTablesForEvent(table.eventId);
    for (const otherTable of eventTables) {
      if (otherTable.id === tableId) continue;
      const hadGuests = otherTable.seats.length;
      otherTable.seats = otherTable.seats.filter(id => !guestIds.includes(id));
      if (otherTable.seats.length !== hadGuests) {
        this.tables.set(otherTable.id, otherTable);
      }
    }

    // Set the new seats for this table
    table.seats = guestIds;
    this.tables.set(tableId, table);
    this.scheduleSave();
    return table;
  }

  // ============================================================
  // Category operations (global - not event-scoped)
  // ============================================================

  getAllCategories(): CategoryInfo[] {
    return Array.from(this.categories.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }

  getCategory(name: string): CategoryInfo | undefined {
    return this.categories.get(name.toLowerCase());
  }

  addCategory(category: CategoryInfo): CategoryInfo {
    this.categories.set(category.name.toLowerCase(), category);
    this.scheduleSave();
    return category;
  }

  deleteCategory(name: string): boolean {
    const deleted = this.categories.delete(name.toLowerCase());
    if (deleted) {
      this.scheduleSave();
    }
    return deleted;
  }

  renameCategory(oldName: string, newName: string): CategoryInfo | null {
    const category = this.categories.get(oldName.toLowerCase());
    if (!category) {
      return null;
    }

    // Use the actual stored category name for comparisons
    const actualOldName = category.name;

    // Check if new name already exists (case insensitive)
    if (actualOldName.toLowerCase() !== newName.toLowerCase() &&
        this.categories.has(newName.toLowerCase())) {
      return null;
    }

    // Update the category
    this.categories.delete(actualOldName.toLowerCase());
    const updatedCategory: CategoryInfo = {
      ...category,
      name: newName,
    };
    this.categories.set(newName.toLowerCase(), updatedCategory);

    // Update all guests that have this tag
    this.guests.forEach((guest, guestId) => {
      if (guest.tags.includes(actualOldName)) {
        const updatedTags = guest.tags.map(tag =>
          tag === actualOldName ? newName : tag
        );
        this.guests.set(guestId, { ...guest, tags: updatedTags });
      }
    });

    this.scheduleSave();
    return updatedCategory;
  }

  // ============================================================
  // Backup settings operations
  // ============================================================

  getBackupSettings(): BackupSettings {
    return { ...this.backupSettings };
  }

  updateBackupSettings(updates: Partial<BackupSettings>): BackupSettings {
    this.backupSettings = { ...this.backupSettings, ...updates };
    this.scheduleSave();
    return { ...this.backupSettings };
  }

  // ============================================================
  // Utility operations
  // ============================================================

  async clear(): Promise<void> {
    this.guests.clear();
    this.families.clear();
    this.categories.clear();
    this.users.clear();
    this.events.clear();
    this.permissions.clear();
    this.tables.clear();
    this.guestsByEvent.clear();
    this.familiesByEvent.clear();
    this.guestsByName.clear();
    this.tablesByEvent.clear();
    this.nextGuestId = 1;
    this.nextFamilyId = 1;
    this.nextUserId = 1;
    this.nextEventId = 1;
    this.nextTableId = 1;
    this.initializeDefaultCategories();

    try {
      await fs.unlink(this.dataFilePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Import data with existing IDs (for data import feature).
   */
  importData(data: StoredData): void {
    this.guests.clear();
    this.families.clear();
    this.categories.clear();
    this.users.clear();
    this.events.clear();
    this.permissions.clear();
    this.tables.clear();

    // Import categories
    data.categories.forEach((category) => {
      this.categories.set(category.name.toLowerCase(), category);
    });

    // Import guests
    let maxGuestId = 0;
    data.guests.forEach((guest) => {
      this.guests.set(guest.id, guest);
      const idNum = parseInt(guest.id.replace('guest-', ''));
      if (idNum >= maxGuestId) {
        maxGuestId = idNum + 1;
      }
    });
    this.nextGuestId = maxGuestId;

    // Import families
    let maxFamilyId = 0;
    data.families.forEach((family) => {
      this.families.set(family.id, family);
      const idNum = parseInt(family.id.replace('family-', ''));
      if (idNum >= maxFamilyId) {
        maxFamilyId = idNum + 1;
      }
    });
    this.nextFamilyId = maxFamilyId;

    // Import users
    if (data.users) {
      let maxUserId = 0;
      data.users.forEach((user) => {
        this.users.set(user.id, user);
        const idNum = parseInt(user.id.replace('user-', ''));
        if (idNum >= maxUserId) {
          maxUserId = idNum + 1;
        }
      });
      this.nextUserId = maxUserId;
    }

    // Import events
    if (data.events) {
      let maxEventId = 0;
      data.events.forEach((event) => {
        this.events.set(event.id, event);
        const idNum = parseInt(event.id.replace('event-', ''));
        if (idNum >= maxEventId) {
          maxEventId = idNum + 1;
        }
      });
      this.nextEventId = maxEventId;
    }

    // Import permissions
    if (data.permissions) {
      data.permissions.forEach((perm) => {
        const key = `${perm.userId}-${perm.eventId}`;
        this.permissions.set(key, perm);
      });
    }

    // Import tables
    if (data.tables) {
      let maxTableId = 0;
      data.tables.forEach((table) => {
        this.tables.set(table.id, table);
        const idNum = parseInt(table.id.replace('table-', ''));
        if (idNum >= maxTableId) {
          maxTableId = idNum + 1;
        }
      });
      this.nextTableId = maxTableId;
    }

    // Rebuild all secondary indexes
    this.rebuildIndexes();

    this.scheduleSave();
  }

  /**
   * Get export data (for backup/export feature).
   */
  getExportData(): StoredData {
    return {
      guests: this.getAllGuests(),
      families: this.getAllFamilies(),
      categories: this.getAllCategories(),
      users: this.getAllUsers(),
      events: this.getAllEvents(),
      permissions: Array.from(this.permissions.values()),
      tables: this.getAllTables(),
    };
  }
}

// Singleton instance
export const store = new DataStore();
