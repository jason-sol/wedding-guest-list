// Category types for organizing guests
export type Category =
  | "Bridal Party"
  | "Bride Family"
  | "Groom Family"
  | "Church Friends"
  | "Church Families"
  | "Sophie UTS"
  | "Sophie High School"
  | "Sophie Other"
  | "Jason High School"
  | "Jason UNSW"
  | "Jason Other";

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

// Sort options
export type SortOption = "firstName" | "lastName" | "category";

// View mode
export type ViewMode = "family" | "individual";
