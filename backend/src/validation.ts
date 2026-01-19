/**
 * Validation schemas using Zod.
 * Provides type-safe validation for all API inputs and data imports.
 */

import { z } from 'zod';
import { getConfig } from './config';

// Lazy config access to avoid circular dependencies
const getValidationLimits = () => getConfig().validation;

// ============================================================
// Basic schemas
// ============================================================

/**
 * Sanitizes a string by trimming whitespace and removing potential XSS.
 */
const sanitizedString = (maxLength: number) =>
  z.string()
    .trim()
    .min(1, 'Cannot be empty')
    .max(maxLength, `Cannot exceed ${maxLength} characters`)
    .transform(s => s.replace(/[<>]/g, ''));

/**
 * RSVP status enum.
 */
export const RSVPStatusSchema = z.enum(['pending', 'accepted', 'declined']);

/**
 * Permission level enum.
 */
export const PermissionLevelSchema = z.enum(['admin', 'viewer', 'none']);

// ============================================================
// Guest schemas (now event-scoped, no reception field)
// ============================================================

/**
 * Schema for creating a new guest.
 * First and last names are optional to allow adding guests incrementally.
 */
export const CreateGuestSchema = z.object({
  firstName: z.string()
    .trim()
    .max(100, 'First name cannot exceed 100 characters')
    .transform(s => s.replace(/[<>]/g, ''))
    .optional()
    .default(''),
  lastName: z.string()
    .trim()
    .max(100, 'Last name cannot exceed 100 characters')
    .transform(s => s.replace(/[<>]/g, ''))
    .optional()
    .default(''),
  familyId: z.string().nullable().optional(),
  tags: z.array(z.string().trim().max(50)).max(20).optional().default([]),
  rsvp: RSVPStatusSchema.optional(),
});

/**
 * Schema for updating a guest (all fields optional).
 * Empty strings are allowed for first/last names.
 */
export const UpdateGuestSchema = z.object({
  firstName: z.string()
    .trim()
    .max(100, 'First name cannot exceed 100 characters')
    .transform(s => s.replace(/[<>]/g, ''))
    .optional(),
  lastName: z.string()
    .trim()
    .max(100, 'Last name cannot exceed 100 characters')
    .transform(s => s.replace(/[<>]/g, ''))
    .optional(),
  familyId: z.string().nullable().optional(),
  tags: z.array(z.string().trim().max(50)).max(20).optional(),
  rsvp: RSVPStatusSchema.optional(),
});

/**
 * Full guest schema (for import validation).
 * First and last names can be empty strings.
 */
export const GuestSchema = z.object({
  id: z.string().regex(/^guest-\d+$/, 'Invalid guest ID format'),
  eventId: z.string().regex(/^event-\d+$/, 'Invalid event ID format'),
  firstName: z.string().trim().max(100),
  lastName: z.string().trim().max(100),
  familyId: z.string().nullable(),
  tags: z.array(z.string()),
  rsvp: RSVPStatusSchema.optional(),
});

/**
 * Schema for copying a guest to another event.
 */
export const CopyGuestSchema = z.object({
  targetEventId: z.string().min(1, 'Target event ID is required'),
});

// ============================================================
// Family schemas (now event-scoped)
// ============================================================

/**
 * Schema for a family member when creating a family.
 * First and last names are optional for new members.
 */
export const FamilyMemberInputSchema = z.union([
  // New member data
  z.object({
    firstName: z.string().trim().max(100).optional().default(''),
    lastName: z.string().trim().max(100).optional().default(''),
    tags: z.array(z.string().trim().max(50)).optional(),
  }),
  // Existing guest ID
  z.string(),
]);

/**
 * Schema for creating a new family.
 */
export const CreateFamilySchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Family name is required')
    .max(100, 'Family name cannot exceed 100 characters')
    .transform(s => s.replace(/[<>]/g, '')),
  members: z.array(FamilyMemberInputSchema).optional().default([]),
});

/**
 * Schema for updating a family.
 */
export const UpdateFamilySchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Family name cannot be empty')
    .max(100, 'Family name cannot exceed 100 characters')
    .transform(s => s.replace(/[<>]/g, ''))
    .optional(),
  members: z.array(z.string()).optional(),
});

/**
 * Schema for reordering family members.
 */
export const ReorderMembersSchema = z.object({
  memberIds: z.array(z.string()),
});

/**
 * Schema for adding a guest to a family.
 */
export const AddGuestToFamilySchema = z.object({
  guestId: z.string().min(1, 'Guest ID is required'),
});

/**
 * Schema for copying a family to another event.
 */
export const CopyFamilySchema = z.object({
  targetEventId: z.string().min(1, 'Target event ID is required'),
});

/**
 * Schema for reconstructing families from a source event.
 */
export const ReconstructFamiliesSchema = z.object({
  sourceEventId: z.string().min(1, 'Source event ID is required'),
});

/**
 * Full family schema (for import validation).
 */
export const FamilySchema = z.object({
  id: z.string().regex(/^family-\d+$/, 'Invalid family ID format'),
  eventId: z.string().regex(/^event-\d+$/, 'Invalid event ID format'),
  name: z.string().trim().min(1).max(100),
  members: z.array(z.string()),
});

// ============================================================
// Category schemas
// ============================================================

/**
 * Schema for creating a new category.
 */
export const CreateCategorySchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Category name is required')
    .max(50, 'Category name cannot exceed 50 characters')
    .transform(s => s.replace(/[<>]/g, '')),
});

/**
 * Full category schema (for import validation).
 */
export const CategoryInfoSchema = z.object({
  name: z.string().trim().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
});

// ============================================================
// Event schemas
// ============================================================

/**
 * Schema for creating an event.
 */
export const CreateEventSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Event name is required')
    .max(100, 'Event name cannot exceed 100 characters')
    .transform(s => s.replace(/[<>]/g, '')),
  date: z.string().max(50).optional(),
  location: z.string().max(200).optional(),
});

/**
 * Schema for updating an event.
 */
export const UpdateEventSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Event name cannot be empty')
    .max(100, 'Event name cannot exceed 100 characters')
    .transform(s => s.replace(/[<>]/g, ''))
    .optional(),
  date: z.string().max(50).optional(),
  location: z.string().max(200).optional(),
});

/**
 * Schema for reordering events.
 */
export const ReorderEventsSchema = z.object({
  eventIds: z.array(z.string()).min(1, 'At least one event ID is required'),
});

/**
 * Full event schema (for import validation).
 */
export const EventSchema = z.object({
  id: z.string().regex(/^event-\d+$/, 'Invalid event ID format'),
  name: z.string().trim().min(1).max(100),
  order: z.number().int().min(0),
  date: z.string().optional(),
  location: z.string().optional(),
  createdAt: z.number(),
  createdBy: z.string(),
});

// ============================================================
// User schemas
// ============================================================

/**
 * Schema for creating a new user.
 */
export const CreateUserSchema = z.object({
  username: z.string()
    .trim()
    .min(1, 'Username is required')
    .max(50, 'Username cannot exceed 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
    .transform(s => s.toLowerCase()),
  password: z.string()
    .min(1, 'Password is required')
    .max(100, 'Password cannot exceed 100 characters'),
});

/**
 * Schema for updating a user (password change).
 */
export const UpdateUserSchema = z.object({
  password: z.string()
    .min(1, 'Password is required')
    .max(100, 'Password cannot exceed 100 characters')
    .optional(),
});

/**
 * Full user schema (for import validation).
 */
export const UserSchema = z.object({
  id: z.string().regex(/^user-\d+$/, 'Invalid user ID format'),
  username: z.string().trim().min(1).max(50),
  passwordHash: z.string(),
  isOwner: z.boolean(),
  createdAt: z.number(),
  createdBy: z.string(),
});

// ============================================================
// Permission schemas
// ============================================================

/**
 * Schema for setting a user's permission on an event.
 */
export const SetPermissionSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  eventId: z.string().min(1, 'Event ID is required'),
  permission: PermissionLevelSchema,
});

/**
 * Full permission schema (for import validation).
 */
export const PermissionSchema = z.object({
  userId: z.string(),
  eventId: z.string(),
  permission: PermissionLevelSchema,
});

// ============================================================
// Import/Export schemas
// ============================================================

/**
 * Schema for validating imported data.
 * Ensures data integrity before replacing store contents.
 */
export const ImportDataSchema = z.object({
  guests: z.array(GuestSchema).default([]),
  families: z.array(FamilySchema).default([]),
  categories: z.array(CategoryInfoSchema).default([]),
  users: z.array(UserSchema).optional().default([]),
  events: z.array(EventSchema).optional().default([]),
  permissions: z.array(PermissionSchema).optional().default([]),
}).refine(
  (data) => {
    // Validate referential integrity: all familyIds in guests should exist
    const familyIds = new Set(data.families.map(f => f.id));
    for (const guest of data.guests) {
      if (guest.familyId && !familyIds.has(guest.familyId)) {
        return false;
      }
    }
    return true;
  },
  { message: 'Invalid data: some guests reference non-existent families' }
).refine(
  (data) => {
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
  },
  { message: 'Invalid data: some families reference non-existent guests' }
).refine(
  (data) => {
    // Validate all guests reference valid events
    const eventIds = new Set(data.events.map(e => e.id));
    for (const guest of data.guests) {
      if (!eventIds.has(guest.eventId)) {
        return false;
      }
    }
    return true;
  },
  { message: 'Invalid data: some guests reference non-existent events' }
).refine(
  (data) => {
    // Validate all families reference valid events
    const eventIds = new Set(data.events.map(e => e.id));
    for (const family of data.families) {
      if (!eventIds.has(family.eventId)) {
        return false;
      }
    }
    return true;
  },
  { message: 'Invalid data: some families reference non-existent events' }
);

// ============================================================
// Auth schemas
// ============================================================

/**
 * Schema for login credentials.
 */
export const LoginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

// ============================================================
// Helper functions
// ============================================================

/**
 * Validates data and returns result with typed data or error.
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  details?: z.ZodIssue[];
} {
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

// Export types derived from schemas
export type CreateGuestInput = z.infer<typeof CreateGuestSchema>;
export type UpdateGuestInput = z.infer<typeof UpdateGuestSchema>;
export type CreateFamilyInput = z.infer<typeof CreateFamilySchema>;
export type UpdateFamilyInput = z.infer<typeof UpdateFamilySchema>;
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type CreateEventInput = z.infer<typeof CreateEventSchema>;
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type SetPermissionInput = z.infer<typeof SetPermissionSchema>;
export type ImportDataInput = z.infer<typeof ImportDataSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
