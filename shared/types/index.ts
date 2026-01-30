// Category is now a dynamic string type
export type Category = string;

// Category with color information
export interface CategoryInfo {
  name: string;
  color: string;
}

// RSVP status
export type RSVPStatus = "pending" | "accepted" | "declined";

// Permission levels for events
export type PermissionLevel = "admin" | "viewer" | "none";

// User data structure (stored in data.json)
export interface User {
  id: string;
  username: string;
  passwordHash: string; // bcrypt hash (empty string for owner who uses env vars)
  isOwner: boolean;
  createdAt: number;
  createdBy: string; // username of creator
}

// Per-user event permission
export interface UserEventPermission {
  userId: string;
  eventId: string;
  permission: PermissionLevel;
}

// Event data structure (now persisted, each has own guest list)
export interface Event {
  id: string;
  name: string;
  date?: string;
  location?: string;
  order: number; // Tab ordering
  createdAt: number;
  createdBy: string;
}

// Guest data structure (now has eventId for event-scoped lists)
export interface Guest {
  id: string;
  eventId: string; // Which event this guest belongs to
  firstName: string;
  lastName: string;
  familyId: string | null;
  tags: Category[];
  rsvp?: RSVPStatus;
  dietaryRequirements?: string; // Dietary restrictions, allergies, etc.
}

// Family data structure (now has eventId)
export interface Family {
  id: string;
  eventId: string; // Which event this family belongs to
  name: string;
  members: string[]; // Array of guest IDs within this event
}

// Auth user info returned from login/check
export interface AuthUser {
  username: string;
  userId: string;
  isOwner: boolean;
}
