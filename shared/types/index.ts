// Category is now a dynamic string type
export type Category = string;

// Category with color information
export interface CategoryInfo {
  name: string;
  color: string;
}

// RSVP status
export type RSVPStatus = "pending" | "accepted" | "declined";

// Event types
export type EventType = "ceremony" | "reception" | "thanksgiving";

// Guest data structure
export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  familyId: string | null;
  tags: Category[];
  rsvp?: RSVPStatus;
  events?: EventType[];
}

// Family data structure
export interface Family {
  id: string;
  name: string;
  members: string[]; // Array of guest IDs
}

// Event data structure
export interface Event {
  id: string;
  name: string;
  type: EventType;
  date?: string;
  location?: string;
}

// Sort options - removed, always sort by last name
