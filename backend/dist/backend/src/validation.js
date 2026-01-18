"use strict";
/**
 * Validation schemas using Zod.
 * Provides type-safe validation for all API inputs and data imports.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginSchema = exports.ImportDataSchema = exports.PermissionSchema = exports.SetPermissionSchema = exports.UserSchema = exports.UpdateUserSchema = exports.CreateUserSchema = exports.EventSchema = exports.ReorderEventsSchema = exports.UpdateEventSchema = exports.CreateEventSchema = exports.CategoryInfoSchema = exports.CreateCategorySchema = exports.FamilySchema = exports.ReconstructFamiliesSchema = exports.CopyFamilySchema = exports.AddGuestToFamilySchema = exports.ReorderMembersSchema = exports.UpdateFamilySchema = exports.CreateFamilySchema = exports.FamilyMemberInputSchema = exports.CopyGuestSchema = exports.GuestSchema = exports.UpdateGuestSchema = exports.CreateGuestSchema = exports.PermissionLevelSchema = exports.RSVPStatusSchema = void 0;
exports.validate = validate;
const zod_1 = require("zod");
const config_1 = require("./config");
// Lazy config access to avoid circular dependencies
const getValidationLimits = () => (0, config_1.getConfig)().validation;
// ============================================================
// Basic schemas
// ============================================================
/**
 * Sanitizes a string by trimming whitespace and removing potential XSS.
 * Note: This is basic sanitization - for production, consider a proper
 * HTML sanitization library like DOMPurify on the frontend.
 */
const sanitizedString = (maxLength) => zod_1.z.string()
    .trim()
    .min(1, 'Cannot be empty')
    .max(maxLength, `Cannot exceed ${maxLength} characters`)
    .transform(s => s.replace(/[<>]/g, '')); // Basic XSS prevention
/**
 * RSVP status enum.
 */
exports.RSVPStatusSchema = zod_1.z.enum(['pending', 'accepted', 'declined']);
/**
 * Permission level enum.
 */
exports.PermissionLevelSchema = zod_1.z.enum(['admin', 'viewer', 'none']);
// ============================================================
// Guest schemas (now event-scoped, no reception field)
// ============================================================
/**
 * Schema for creating a new guest.
 * First and last names are optional to allow adding guests incrementally.
 */
exports.CreateGuestSchema = zod_1.z.object({
    firstName: zod_1.z.string()
        .trim()
        .max(100, 'First name cannot exceed 100 characters')
        .transform(s => s.replace(/[<>]/g, ''))
        .optional()
        .default(''),
    lastName: zod_1.z.string()
        .trim()
        .max(100, 'Last name cannot exceed 100 characters')
        .transform(s => s.replace(/[<>]/g, ''))
        .optional()
        .default(''),
    familyId: zod_1.z.string().nullable().optional(),
    tags: zod_1.z.array(zod_1.z.string().trim().max(50)).max(20).optional().default([]),
    rsvp: exports.RSVPStatusSchema.optional(),
});
/**
 * Schema for updating a guest (all fields optional).
 * Empty strings are allowed for first/last names.
 */
exports.UpdateGuestSchema = zod_1.z.object({
    firstName: zod_1.z.string()
        .trim()
        .max(100, 'First name cannot exceed 100 characters')
        .transform(s => s.replace(/[<>]/g, ''))
        .optional(),
    lastName: zod_1.z.string()
        .trim()
        .max(100, 'Last name cannot exceed 100 characters')
        .transform(s => s.replace(/[<>]/g, ''))
        .optional(),
    familyId: zod_1.z.string().nullable().optional(),
    tags: zod_1.z.array(zod_1.z.string().trim().max(50)).max(20).optional(),
    rsvp: exports.RSVPStatusSchema.optional(),
});
/**
 * Full guest schema (for import validation).
 * First and last names can be empty strings.
 */
exports.GuestSchema = zod_1.z.object({
    id: zod_1.z.string().regex(/^guest-\d+$/, 'Invalid guest ID format'),
    eventId: zod_1.z.string().regex(/^event-\d+$/, 'Invalid event ID format'),
    firstName: zod_1.z.string().trim().max(100),
    lastName: zod_1.z.string().trim().max(100),
    familyId: zod_1.z.string().nullable(),
    tags: zod_1.z.array(zod_1.z.string()),
    rsvp: exports.RSVPStatusSchema.optional(),
});
/**
 * Schema for copying a guest to another event.
 */
exports.CopyGuestSchema = zod_1.z.object({
    targetEventId: zod_1.z.string().min(1, 'Target event ID is required'),
});
// ============================================================
// Family schemas (now event-scoped)
// ============================================================
/**
 * Schema for a family member when creating a family.
 * First and last names are optional for new members.
 */
exports.FamilyMemberInputSchema = zod_1.z.union([
    // New member data
    zod_1.z.object({
        firstName: zod_1.z.string().trim().max(100).optional().default(''),
        lastName: zod_1.z.string().trim().max(100).optional().default(''),
        tags: zod_1.z.array(zod_1.z.string().trim().max(50)).optional(),
    }),
    // Existing guest ID
    zod_1.z.string(),
]);
/**
 * Schema for creating a new family.
 */
exports.CreateFamilySchema = zod_1.z.object({
    name: zod_1.z.string()
        .trim()
        .min(1, 'Family name is required')
        .max(100, 'Family name cannot exceed 100 characters')
        .transform(s => s.replace(/[<>]/g, '')),
    members: zod_1.z.array(exports.FamilyMemberInputSchema).optional().default([]),
});
/**
 * Schema for updating a family.
 */
exports.UpdateFamilySchema = zod_1.z.object({
    name: zod_1.z.string()
        .trim()
        .min(1, 'Family name cannot be empty')
        .max(100, 'Family name cannot exceed 100 characters')
        .transform(s => s.replace(/[<>]/g, ''))
        .optional(),
    members: zod_1.z.array(zod_1.z.string()).optional(),
});
/**
 * Schema for reordering family members.
 */
exports.ReorderMembersSchema = zod_1.z.object({
    memberIds: zod_1.z.array(zod_1.z.string()),
});
/**
 * Schema for adding a guest to a family.
 */
exports.AddGuestToFamilySchema = zod_1.z.object({
    guestId: zod_1.z.string().min(1, 'Guest ID is required'),
});
/**
 * Schema for copying a family to another event.
 */
exports.CopyFamilySchema = zod_1.z.object({
    targetEventId: zod_1.z.string().min(1, 'Target event ID is required'),
});
/**
 * Schema for reconstructing families from a source event.
 */
exports.ReconstructFamiliesSchema = zod_1.z.object({
    sourceEventId: zod_1.z.string().min(1, 'Source event ID is required'),
});
/**
 * Full family schema (for import validation).
 */
exports.FamilySchema = zod_1.z.object({
    id: zod_1.z.string().regex(/^family-\d+$/, 'Invalid family ID format'),
    eventId: zod_1.z.string().regex(/^event-\d+$/, 'Invalid event ID format'),
    name: zod_1.z.string().trim().min(1).max(100),
    members: zod_1.z.array(zod_1.z.string()),
});
// ============================================================
// Category schemas
// ============================================================
/**
 * Schema for creating a new category.
 */
exports.CreateCategorySchema = zod_1.z.object({
    name: zod_1.z.string()
        .trim()
        .min(1, 'Category name is required')
        .max(50, 'Category name cannot exceed 50 characters')
        .transform(s => s.replace(/[<>]/g, '')),
});
/**
 * Full category schema (for import validation).
 */
exports.CategoryInfoSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1).max(50),
    color: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
});
// ============================================================
// Event schemas
// ============================================================
/**
 * Schema for creating an event.
 */
exports.CreateEventSchema = zod_1.z.object({
    name: zod_1.z.string()
        .trim()
        .min(1, 'Event name is required')
        .max(100, 'Event name cannot exceed 100 characters')
        .transform(s => s.replace(/[<>]/g, '')),
    date: zod_1.z.string().max(50).optional(),
    location: zod_1.z.string().max(200).optional(),
});
/**
 * Schema for updating an event.
 */
exports.UpdateEventSchema = zod_1.z.object({
    name: zod_1.z.string()
        .trim()
        .min(1, 'Event name cannot be empty')
        .max(100, 'Event name cannot exceed 100 characters')
        .transform(s => s.replace(/[<>]/g, ''))
        .optional(),
    date: zod_1.z.string().max(50).optional(),
    location: zod_1.z.string().max(200).optional(),
});
/**
 * Schema for reordering events.
 */
exports.ReorderEventsSchema = zod_1.z.object({
    eventIds: zod_1.z.array(zod_1.z.string()).min(1, 'At least one event ID is required'),
});
/**
 * Full event schema (for import validation).
 */
exports.EventSchema = zod_1.z.object({
    id: zod_1.z.string().regex(/^event-\d+$/, 'Invalid event ID format'),
    name: zod_1.z.string().trim().min(1).max(100),
    order: zod_1.z.number().int().min(0),
    date: zod_1.z.string().optional(),
    location: zod_1.z.string().optional(),
    createdAt: zod_1.z.number(),
    createdBy: zod_1.z.string(),
});
// ============================================================
// User schemas
// ============================================================
/**
 * Schema for creating a new user.
 */
exports.CreateUserSchema = zod_1.z.object({
    username: zod_1.z.string()
        .trim()
        .min(1, 'Username is required')
        .max(50, 'Username cannot exceed 50 characters')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
        .transform(s => s.toLowerCase()),
    password: zod_1.z.string()
        .min(1, 'Password is required')
        .max(100, 'Password cannot exceed 100 characters'),
});
/**
 * Schema for updating a user (password change).
 */
exports.UpdateUserSchema = zod_1.z.object({
    password: zod_1.z.string()
        .min(1, 'Password is required')
        .max(100, 'Password cannot exceed 100 characters')
        .optional(),
});
/**
 * Full user schema (for import validation).
 */
exports.UserSchema = zod_1.z.object({
    id: zod_1.z.string().regex(/^user-\d+$/, 'Invalid user ID format'),
    username: zod_1.z.string().trim().min(1).max(50),
    passwordHash: zod_1.z.string(),
    isOwner: zod_1.z.boolean(),
    createdAt: zod_1.z.number(),
    createdBy: zod_1.z.string(),
});
// ============================================================
// Permission schemas
// ============================================================
/**
 * Schema for setting a user's permission on an event.
 */
exports.SetPermissionSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1, 'User ID is required'),
    eventId: zod_1.z.string().min(1, 'Event ID is required'),
    permission: exports.PermissionLevelSchema,
});
/**
 * Full permission schema (for import validation).
 */
exports.PermissionSchema = zod_1.z.object({
    userId: zod_1.z.string(),
    eventId: zod_1.z.string(),
    permission: exports.PermissionLevelSchema,
});
// ============================================================
// Import/Export schemas
// ============================================================
/**
 * Schema for validating imported data.
 * Ensures data integrity before replacing store contents.
 */
exports.ImportDataSchema = zod_1.z.object({
    guests: zod_1.z.array(exports.GuestSchema).default([]),
    families: zod_1.z.array(exports.FamilySchema).default([]),
    categories: zod_1.z.array(exports.CategoryInfoSchema).default([]),
    users: zod_1.z.array(exports.UserSchema).optional().default([]),
    events: zod_1.z.array(exports.EventSchema).optional().default([]),
    permissions: zod_1.z.array(exports.PermissionSchema).optional().default([]),
}).refine((data) => {
    // Validate referential integrity: all familyIds in guests should exist
    const familyIds = new Set(data.families.map(f => f.id));
    for (const guest of data.guests) {
        if (guest.familyId && !familyIds.has(guest.familyId)) {
            return false;
        }
    }
    return true;
}, { message: 'Invalid data: some guests reference non-existent families' }).refine((data) => {
    // Validate referential integrity: all member IDs in families should exist
    const guestIds = new Set(data.guests.map(g => g.id));
    for (const family of data.families) {
        for (const memberId of family.members) {
            if (!guestIds.has(memberId)) {
                return false;
            }
        }
    }
    return true;
}, { message: 'Invalid data: some families reference non-existent guests' }).refine((data) => {
    // Validate all guests reference valid events
    const eventIds = new Set(data.events.map(e => e.id));
    for (const guest of data.guests) {
        if (!eventIds.has(guest.eventId)) {
            return false;
        }
    }
    return true;
}, { message: 'Invalid data: some guests reference non-existent events' }).refine((data) => {
    // Validate all families reference valid events
    const eventIds = new Set(data.events.map(e => e.id));
    for (const family of data.families) {
        if (!eventIds.has(family.eventId)) {
            return false;
        }
    }
    return true;
}, { message: 'Invalid data: some families reference non-existent events' });
// ============================================================
// Auth schemas
// ============================================================
/**
 * Schema for login credentials.
 */
exports.LoginSchema = zod_1.z.object({
    username: zod_1.z.string().trim().min(1, 'Username is required'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
// ============================================================
// Helper functions
// ============================================================
/**
 * Validates data and returns result with typed data or error.
 */
function validate(schema, data) {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    // Format error message from Zod issues
    const messages = result.error.issues.map(issue => {
        const path = issue.path.join('.');
        return path ? `${path}: ${issue.message}` : issue.message;
    });
    return {
        success: false,
        error: messages.join('; '),
        details: result.error.issues,
    };
}
