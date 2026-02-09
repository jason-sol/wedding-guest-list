"use strict";
/**
 * Data store with async file persistence.
 * Uses in-memory Maps for fast access with async JSON file backup.
 * Supports multi-user permissions and event-scoped guest lists.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.store = void 0;
const colors_1 = require("../../shared/utils/colors");
const fs = __importStar(require("fs/promises"));
const config_1 = require("./config");
// Default categories
const DEFAULT_CATEGORIES = [
    { name: 'Bridal Party', color: (0, colors_1.getCategoryColor)('Bridal Party') },
    { name: 'Bride Family', color: (0, colors_1.getCategoryColor)('Bride Family') },
    { name: 'Groom Family', color: (0, colors_1.getCategoryColor)('Groom Family') },
    { name: 'Church Friends', color: (0, colors_1.getCategoryColor)('Church Friends') },
    { name: 'Church Families', color: (0, colors_1.getCategoryColor)('Church Families') },
    { name: 'Sophie UTS', color: (0, colors_1.getCategoryColor)('Sophie UTS') },
    { name: 'Sophie High School', color: (0, colors_1.getCategoryColor)('Sophie High School') },
    { name: 'Sophie Other', color: (0, colors_1.getCategoryColor)('Sophie Other') },
    { name: 'Jason High School', color: (0, colors_1.getCategoryColor)('Jason High School') },
    { name: 'Jason UNSW', color: (0, colors_1.getCategoryColor)('Jason UNSW') },
    { name: 'Jason Other', color: (0, colors_1.getCategoryColor)('Jason Other') },
];
/**
 * In-memory data store with async JSON file persistence.
 * Data is kept in memory for fast access and persisted to disk asynchronously.
 */
class DataStore {
    constructor() {
        // Core data
        this.guests = new Map();
        this.families = new Map();
        this.categories = new Map();
        // Multi-user data
        this.users = new Map();
        this.events = new Map();
        this.permissions = new Map(); // key: `${userId}-${eventId}`
        // Backup settings
        this.backupSettings = {
            enabled: true,
            maxBackups: 5,
            backupTime: '02:00',
        };
        // ID counters
        this.nextGuestId = 1;
        this.nextFamilyId = 1;
        this.nextUserId = 1;
        this.nextEventId = 1;
        this.saveTimeout = null;
        this.initialized = false;
        this.initPromise = null;
        const config = (0, config_1.getConfig)();
        this.dataFilePath = config.data.filePath;
        this.initializeDefaultCategories();
        // Start initialization immediately
        this.initPromise = this.loadFromFile();
    }
    /**
     * Ensure the store is initialized before use.
     * Safe to call multiple times - will return cached promise.
     */
    async ensureInitialized() {
        if (this.initialized)
            return;
        if (this.initPromise) {
            await this.initPromise;
        }
    }
    initializeDefaultCategories() {
        DEFAULT_CATEGORIES.forEach(cat => {
            this.categories.set(cat.name.toLowerCase(), cat);
        });
    }
    /**
     * Migrate legacy data format to event-scoped format.
     * Called automatically on first load if events array is missing.
     */
    migrateToEventScoped(data) {
        // Check if already migrated (has events)
        if (data.events && data.events.length > 0) {
            return data;
        }
        console.log('Migrating to event-scoped format...');
        const now = Date.now();
        // Create default events
        const ceremonyEvent = {
            id: 'event-1',
            name: 'Ceremony',
            order: 0,
            createdAt: now,
            createdBy: 'system',
        };
        const receptionEvent = {
            id: 'event-2',
            name: 'Reception',
            order: 1,
            createdAt: now,
            createdBy: 'system',
        };
        // Cast guests to legacy format to access reception field
        const legacyGuests = data.guests;
        const legacyFamilies = data.families;
        // Maps to track old ID -> new IDs for each event
        const ceremonyGuestIdMap = new Map();
        const receptionGuestIdMap = new Map();
        const ceremonyFamilyIdMap = new Map();
        const receptionFamilyIdMap = new Map();
        const migratedGuests = [];
        const migratedFamilies = [];
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
                rsvp: oldGuest.rsvp,
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
                    rsvp: oldGuest.rsvp,
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
                .filter((id) => id !== undefined);
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
                .filter((id) => id !== undefined);
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
    async loadFromFile() {
        try {
            const config = (0, config_1.getConfig)();
            // Ensure data directory exists
            await fs.mkdir(config.data.directory, { recursive: true });
            const rawData = await fs.readFile(this.dataFilePath, 'utf-8');
            let parsed = JSON.parse(rawData);
            // Migrate if needed
            parsed = this.migrateToEventScoped(parsed);
            // Load guests
            if (parsed.guests && Array.isArray(parsed.guests)) {
                parsed.guests.forEach((guest) => {
                    this.guests.set(guest.id, guest);
                    const idNum = parseInt(guest.id.replace('guest-', ''));
                    if (idNum >= this.nextGuestId) {
                        this.nextGuestId = idNum + 1;
                    }
                });
            }
            // Load families
            if (parsed.families && Array.isArray(parsed.families)) {
                parsed.families.forEach((family) => {
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
                parsed.categories.forEach((category) => {
                    this.categories.set(category.name.toLowerCase(), category);
                });
            }
            // Load users
            if (parsed.users && Array.isArray(parsed.users)) {
                parsed.users.forEach((user) => {
                    this.users.set(user.id, user);
                    const idNum = parseInt(user.id.replace('user-', ''));
                    if (idNum >= this.nextUserId) {
                        this.nextUserId = idNum + 1;
                    }
                });
            }
            // Load events
            if (parsed.events && Array.isArray(parsed.events)) {
                parsed.events.forEach((event) => {
                    this.events.set(event.id, event);
                    const idNum = parseInt(event.id.replace('event-', ''));
                    if (idNum >= this.nextEventId) {
                        this.nextEventId = idNum + 1;
                    }
                });
            }
            // Load permissions
            if (parsed.permissions && Array.isArray(parsed.permissions)) {
                parsed.permissions.forEach((perm) => {
                    const key = `${perm.userId}-${perm.eventId}`;
                    this.permissions.set(key, perm);
                });
            }
            // Load backup settings
            if (parsed.backupSettings) {
                this.backupSettings = { ...this.backupSettings, ...parsed.backupSettings };
            }
            console.log(`Loaded: ${this.guests.size} guests, ${this.families.size} families, ${this.categories.size} categories, ${this.users.size} users, ${this.events.size} events`);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                console.log('No existing data file, starting fresh');
                // Create default ceremony event
                const now = Date.now();
                const defaultEvent = {
                    id: `event-${this.nextEventId++}`,
                    name: 'Ceremony',
                    order: 0,
                    createdAt: now,
                    createdBy: 'system',
                };
                this.events.set(defaultEvent.id, defaultEvent);
            }
            else {
                console.error('Error loading data from file:', error);
            }
        }
        finally {
            this.initialized = true;
        }
    }
    /**
     * Schedule an async save operation.
     * Debounces multiple rapid changes into a single write.
     */
    scheduleSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        this.saveTimeout = setTimeout(() => {
            this.saveToFile().catch(err => {
                console.error('Error saving data to file:', err);
            });
        }, 500);
    }
    async saveToFile() {
        try {
            const config = (0, config_1.getConfig)();
            await fs.mkdir(config.data.directory, { recursive: true });
            const data = {
                guests: Array.from(this.guests.values()),
                families: Array.from(this.families.values()),
                categories: Array.from(this.categories.values()),
                users: Array.from(this.users.values()),
                events: Array.from(this.events.values()),
                permissions: Array.from(this.permissions.values()),
                backupSettings: this.backupSettings,
            };
            const tempPath = `${this.dataFilePath}.tmp`;
            await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
            await fs.rename(tempPath, this.dataFilePath);
        }
        catch (error) {
            console.error('Error saving data to file:', error);
            throw error;
        }
    }
    /**
     * Force immediate save (useful for testing or shutdown).
     */
    async flush() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        await this.saveToFile();
    }
    // ============================================================
    // User operations
    // ============================================================
    addUser(user) {
        const id = `user-${this.nextUserId++}`;
        const newUser = { ...user, id };
        this.users.set(id, newUser);
        this.scheduleSave();
        return newUser;
    }
    getUser(id) {
        return this.users.get(id);
    }
    getUserByUsername(username) {
        for (const user of this.users.values()) {
            if (user.username.toLowerCase() === username.toLowerCase()) {
                return user;
            }
        }
        return undefined;
    }
    getAllUsers() {
        return Array.from(this.users.values());
    }
    updateUser(id, updates) {
        const user = this.users.get(id);
        if (!user)
            return null;
        const updated = { ...user, ...updates };
        this.users.set(id, updated);
        this.scheduleSave();
        return updated;
    }
    deleteUser(id) {
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
    addEvent(event) {
        const id = `event-${this.nextEventId++}`;
        const newEvent = { ...event, id };
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
    getEvent(id) {
        return this.events.get(id);
    }
    getAllEvents() {
        return Array.from(this.events.values()).sort((a, b) => a.order - b.order);
    }
    updateEvent(id, updates) {
        const event = this.events.get(id);
        if (!event)
            return null;
        const updated = { ...event, ...updates };
        this.events.set(id, updated);
        this.scheduleSave();
        return updated;
    }
    deleteEvent(id) {
        const deleted = this.events.delete(id);
        if (deleted) {
            // Delete all guests in this event
            for (const [guestId, guest] of this.guests.entries()) {
                if (guest.eventId === id) {
                    this.guests.delete(guestId);
                }
            }
            // Delete all families in this event
            for (const [familyId, family] of this.families.entries()) {
                if (family.eventId === id) {
                    this.families.delete(familyId);
                }
            }
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
    reorderEvents(eventIds) {
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
    setPermission(userId, eventId, permission) {
        const key = `${userId}-${eventId}`;
        if (permission === 'none') {
            // Could either store 'none' or delete - we'll store it for explicit tracking
        }
        this.permissions.set(key, { userId, eventId, permission });
        this.scheduleSave();
    }
    getPermission(userId, eventId) {
        const key = `${userId}-${eventId}`;
        const perm = this.permissions.get(key);
        // Default to viewer if no explicit permission
        return perm?.permission ?? 'viewer';
    }
    getUserPermissions(userId) {
        const result = [];
        for (const perm of this.permissions.values()) {
            if (perm.userId === userId) {
                result.push(perm);
            }
        }
        return result;
    }
    getEventPermissions(eventId) {
        const result = [];
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
    assignDefaultPermissions(userId) {
        for (const event of this.events.values()) {
            this.setPermission(userId, event.id, 'viewer');
        }
    }
    // ============================================================
    // Guest operations (event-scoped)
    // ============================================================
    addGuest(guest) {
        const id = `guest-${this.nextGuestId++}`;
        const newGuest = { ...guest, id };
        this.guests.set(id, newGuest);
        this.scheduleSave();
        return newGuest;
    }
    getGuest(id) {
        return this.guests.get(id);
    }
    getAllGuests() {
        return Array.from(this.guests.values());
    }
    getGuestsForEvent(eventId) {
        return Array.from(this.guests.values()).filter(g => g.eventId === eventId);
    }
    updateGuest(id, updates) {
        const guest = this.guests.get(id);
        if (!guest)
            return null;
        const updated = { ...guest, ...updates };
        this.guests.set(id, updated);
        this.scheduleSave();
        return updated;
    }
    deleteGuest(id) {
        const guest = this.guests.get(id);
        if (!guest)
            return false;
        // Remove from any family
        if (guest.familyId) {
            const family = this.families.get(guest.familyId);
            if (family) {
                family.members = family.members.filter(m => m !== id);
                this.families.set(family.id, family);
            }
        }
        const deleted = this.guests.delete(id);
        if (deleted) {
            this.scheduleSave();
        }
        return deleted;
    }
    /**
     * Copy a guest to another event, preserving family relationships.
     */
    copyGuestToEvent(guestId, targetEventId) {
        const sourceGuest = this.guests.get(guestId);
        if (!sourceGuest)
            return null;
        // Check if a guest with the same name already exists in the target event
        const targetEventGuests = this.getGuestsForEvent(targetEventId);
        const existingGuest = targetEventGuests.find(g => g.firstName.toLowerCase() === sourceGuest.firstName.toLowerCase() &&
            g.lastName.toLowerCase() === sourceGuest.lastName.toLowerCase());
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
    ensureFamilyForGuestInEvent(guest, sourceFamilyId, targetEventId) {
        const sourceFamily = this.families.get(sourceFamilyId);
        if (!sourceFamily)
            return;
        const targetEventFamilies = this.getFamiliesForEvent(targetEventId);
        const targetEventGuests = this.getGuestsForEvent(targetEventId);
        // Get source family members
        const sourceFamilyMembers = sourceFamily.members
            .map(id => this.guests.get(id))
            .filter((g) => g !== undefined);
        // Find target guests that match source family members (by name)
        const matchingTargetGuests = targetEventGuests.filter(targetGuest => {
            return sourceFamilyMembers.some(sourceMember => sourceMember.firstName.toLowerCase() === targetGuest.firstName.toLowerCase() &&
                sourceMember.lastName.toLowerCase() === targetGuest.lastName.toLowerCase());
        });
        // Look for an existing family in target where ALL its members belong to THIS source family
        // This prevents accidentally merging different families that have the same name
        let targetFamily;
        for (const family of targetEventFamilies) {
            const familyMembers = family.members
                .map(id => this.guests.get(id))
                .filter((g) => g !== undefined);
            if (familyMembers.length === 0)
                continue;
            // Check if ALL members of this target family match members from our source family
            const allMembersFromSourceFamily = familyMembers.every(member => sourceFamilyMembers.some(sourceMember => sourceMember.firstName.toLowerCase() === member.firstName.toLowerCase() &&
                sourceMember.lastName.toLowerCase() === member.lastName.toLowerCase()));
            // Also check if at least one member matches (to confirm it's the right family)
            const hasMatchingMember = familyMembers.some(member => sourceFamilyMembers.some(sourceMember => sourceMember.firstName.toLowerCase() === member.firstName.toLowerCase() &&
                sourceMember.lastName.toLowerCase() === member.lastName.toLowerCase()));
            if (allMembersFromSourceFamily && hasMatchingMember) {
                targetFamily = family;
                break;
            }
        }
        // If no suitable family found, create a new one
        if (!targetFamily && matchingTargetGuests.length >= 1) {
            // Create a new family in the target event
            targetFamily = this.addFamily({
                eventId: targetEventId,
                name: sourceFamily.name,
                members: [],
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
                            this.families.delete(oldFamily.id);
                        }
                        else {
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
    reconstructFamiliesFromSource(sourceEventId, targetEventId) {
        const sourceFamilies = this.getFamiliesForEvent(sourceEventId);
        const targetGuests = this.getGuestsForEvent(targetEventId);
        let familiesCreated = 0;
        let guestsUpdated = 0;
        // Map from source family ID to target family ID to prevent re-using families
        const sourceFamilyToTargetFamily = new Map();
        // For each family in source event
        for (const sourceFamily of sourceFamilies) {
            // Get the source family members
            const sourceFamilyMembers = sourceFamily.members
                .map(id => this.guests.get(id))
                .filter((g) => g !== undefined);
            if (sourceFamilyMembers.length === 0)
                continue;
            // Find matching guests in target event (by name) that match THIS source family's members
            const matchingTargetGuests = targetGuests.filter(targetGuest => {
                return sourceFamilyMembers.some(sourceMember => sourceMember.firstName.toLowerCase() === targetGuest.firstName.toLowerCase() &&
                    sourceMember.lastName.toLowerCase() === targetGuest.lastName.toLowerCase());
            });
            // If we have at least 2 matching guests, create/update a family
            if (matchingTargetGuests.length >= 2) {
                let targetFamily;
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
                        if (claimedFamilyIds.has(family.id))
                            continue;
                        // Check if this family's members are all from our source family
                        const familyMembers = family.members
                            .map(id => this.guests.get(id))
                            .filter((g) => g !== undefined);
                        const allMembersMatch = familyMembers.length > 0 && familyMembers.every(member => sourceFamilyMembers.some(sourceMember => sourceMember.firstName.toLowerCase() === member.firstName.toLowerCase() &&
                            sourceMember.lastName.toLowerCase() === member.lastName.toLowerCase()));
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
                this.families.delete(family.id);
            }
        }
        this.scheduleSave();
        return { familiesCreated, guestsUpdated };
    }
    // ============================================================
    // Family operations (event-scoped)
    // ============================================================
    addFamily(family) {
        const id = `family-${this.nextFamilyId++}`;
        const newFamily = { ...family, id };
        this.families.set(id, newFamily);
        this.scheduleSave();
        return newFamily;
    }
    getFamily(id) {
        return this.families.get(id);
    }
    getAllFamilies() {
        return Array.from(this.families.values());
    }
    getFamiliesForEvent(eventId) {
        return Array.from(this.families.values()).filter(f => f.eventId === eventId);
    }
    updateFamily(id, updates) {
        const family = this.families.get(id);
        if (!family)
            return null;
        const updated = { ...family, ...updates };
        this.families.set(id, updated);
        this.scheduleSave();
        return updated;
    }
    deleteFamily(id) {
        const family = this.families.get(id);
        if (!family)
            return false;
        // Remove familyId from all members
        for (const memberId of family.members) {
            const guest = this.guests.get(memberId);
            if (guest) {
                guest.familyId = null;
                this.guests.set(memberId, guest);
            }
        }
        const deleted = this.families.delete(id);
        if (deleted) {
            this.scheduleSave();
        }
        return deleted;
    }
    /**
     * Copy a family and its members to another event.
     */
    copyFamilyToEvent(familyId, targetEventId) {
        const sourceFamily = this.families.get(familyId);
        if (!sourceFamily)
            return null;
        const targetEventGuests = this.getGuestsForEvent(targetEventId);
        const targetEventFamilies = this.getFamiliesForEvent(targetEventId);
        // Check if family with same name already exists
        const existingFamily = targetEventFamilies.find(f => f.name.toLowerCase() === sourceFamily.name.toLowerCase());
        // Copy all member guests (or use existing ones)
        const copiedGuests = [];
        const memberIdMap = new Map(); // old ID -> new ID
        for (const memberId of sourceFamily.members) {
            const sourceGuest = this.guests.get(memberId);
            if (sourceGuest) {
                // Check if guest with same name already exists in target event
                const existingGuest = targetEventGuests.find(g => g.firstName.toLowerCase() === sourceGuest.firstName.toLowerCase() &&
                    g.lastName.toLowerCase() === sourceGuest.lastName.toLowerCase());
                if (existingGuest) {
                    // Use existing guest
                    copiedGuests.push(existingGuest);
                    memberIdMap.set(memberId, existingGuest.id);
                }
                else {
                    // Create new guest
                    const newGuest = this.addGuest({
                        eventId: targetEventId,
                        firstName: sourceGuest.firstName,
                        lastName: sourceGuest.lastName,
                        familyId: null, // Will be set below
                        tags: [...sourceGuest.tags],
                        rsvp: undefined,
                    });
                    copiedGuests.push(newGuest);
                    memberIdMap.set(memberId, newGuest.id);
                }
            }
        }
        let family;
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
        }
        else {
            // Create the family with new member IDs
            family = this.addFamily({
                eventId: targetEventId,
                name: sourceFamily.name,
                members: copiedGuests.map(g => g.id),
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
    // ============================================================
    // Category operations (global - not event-scoped)
    // ============================================================
    getAllCategories() {
        return Array.from(this.categories.values()).sort((a, b) => a.name.localeCompare(b.name));
    }
    getCategory(name) {
        return this.categories.get(name.toLowerCase());
    }
    addCategory(category) {
        this.categories.set(category.name.toLowerCase(), category);
        this.scheduleSave();
        return category;
    }
    deleteCategory(name) {
        const deleted = this.categories.delete(name.toLowerCase());
        if (deleted) {
            this.scheduleSave();
        }
        return deleted;
    }
    renameCategory(oldName, newName) {
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
        const updatedCategory = {
            ...category,
            name: newName,
        };
        this.categories.set(newName.toLowerCase(), updatedCategory);
        // Update all guests that have this tag
        this.guests.forEach((guest, guestId) => {
            if (guest.tags.includes(actualOldName)) {
                const updatedTags = guest.tags.map(tag => tag === actualOldName ? newName : tag);
                this.guests.set(guestId, { ...guest, tags: updatedTags });
            }
        });
        this.scheduleSave();
        return updatedCategory;
    }
    // ============================================================
    // Backup settings operations
    // ============================================================
    getBackupSettings() {
        return { ...this.backupSettings };
    }
    updateBackupSettings(updates) {
        this.backupSettings = { ...this.backupSettings, ...updates };
        this.scheduleSave();
        return { ...this.backupSettings };
    }
    // ============================================================
    // Utility operations
    // ============================================================
    async clear() {
        this.guests.clear();
        this.families.clear();
        this.categories.clear();
        this.users.clear();
        this.events.clear();
        this.permissions.clear();
        this.nextGuestId = 1;
        this.nextFamilyId = 1;
        this.nextUserId = 1;
        this.nextEventId = 1;
        this.initializeDefaultCategories();
        try {
            await fs.unlink(this.dataFilePath);
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
    }
    /**
     * Import data with existing IDs (for data import feature).
     */
    importData(data) {
        this.guests.clear();
        this.families.clear();
        this.categories.clear();
        this.users.clear();
        this.events.clear();
        this.permissions.clear();
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
        this.scheduleSave();
    }
    /**
     * Get export data (for backup/export feature).
     */
    getExportData() {
        return {
            guests: this.getAllGuests(),
            families: this.getAllFamilies(),
            categories: this.getAllCategories(),
            users: this.getAllUsers(),
            events: this.getAllEvents(),
            permissions: Array.from(this.permissions.values()),
        };
    }
}
// Singleton instance
exports.store = new DataStore();
