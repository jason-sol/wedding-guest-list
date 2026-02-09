import { Guest, Family, CategoryInfo, Event, UserEventPermission, PermissionLevel, RSVPStatus, BackupSettings } from './types';

/**
 * Base URL for all API calls.
 *
 * Uses relative path '/api' which works in both environments:
 * - Development: Vite dev server proxies /api/* to http://localhost:5000
 *   (configured in vite.config.ts)
 * - Production: nginx reverse proxy routes /api/* to backend container
 *   (configured in nginx.conf)
 *
 * This keeps frontend code environment-agnostic - no URL changes needed
 * between development and production builds.
 */
const API_BASE = '/api';

// Helper to add auth token to requests
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('authToken');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Helper to handle 401 errors (redirect to login)
function handleAuthError(response: Response): void {
  if (response.status === 401) {
    localStorage.removeItem('authToken');
    window.location.reload();
  }
}

/**
 * Extracts error message from API response.
 * Backend returns: { success: false, error: string, details?: unknown }
 */
async function extractErrorMessage(response: Response, fallbackMessage: string): Promise<string> {
  try {
    const result = await response.json();
    return result.error || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

/**
 * Handles non-OK responses by extracting server error message and throwing.
 * Use after handleAuthError() for consistent error handling across all API calls.
 */
async function handleErrorResponse(response: Response, fallbackMessage: string): Promise<never> {
  const message = await extractErrorMessage(response, fallbackMessage);
  throw new Error(message);
}

// Helper to extract data from standardized API response format
async function extractData<T>(response: Response): Promise<T> {
  const result = await response.json();
  return result.data !== undefined ? result.data : result;
}

// ============================================================
// Event-scoped Guest operations
// ============================================================

export async function fetchGuests(eventId: string): Promise<Guest[]> {
  const response = await fetch(`${API_BASE}/events/${eventId}/guests`, {
    headers: getAuthHeaders(),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to fetch guests');
  return extractData<Guest[]>(response);
}

export async function addGuest(eventId: string, guest: Omit<Guest, 'id' | 'eventId'>): Promise<Guest> {
  const response = await fetch(`${API_BASE}/events/${eventId}/guests`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(guest),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to add guest');
  return extractData<Guest>(response);
}

export async function updateGuest(eventId: string, guestId: string, updates: Partial<Guest>): Promise<Guest> {
  const response = await fetch(`${API_BASE}/events/${eventId}/guests/${guestId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to update guest');
  return extractData<Guest>(response);
}

export async function deleteGuest(eventId: string, guestId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/events/${eventId}/guests/${guestId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to delete guest');
}

export async function copyGuest(eventId: string, guestId: string, targetEventId: string): Promise<Guest> {
  const response = await fetch(`${API_BASE}/events/${eventId}/guests/${guestId}/copy`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ targetEventId }),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to copy guest');
  return extractData<Guest>(response);
}

export interface GuestPresenceInfo {
  id: string;      // Event ID
  name: string;    // Event name
  guestId: string; // Guest ID in that event
}

export type GuestPresenceMap = Record<string, GuestPresenceInfo[]>;

export async function fetchGuestPresence(eventId: string): Promise<GuestPresenceMap> {
  const response = await fetch(`${API_BASE}/events/${eventId}/guests/presence`, {
    headers: getAuthHeaders(),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to fetch guest presence');
  return extractData<GuestPresenceMap>(response);
}

// ============================================================
// Event-scoped Family operations
// ============================================================

export async function fetchFamilies(eventId: string): Promise<Family[]> {
  const response = await fetch(`${API_BASE}/events/${eventId}/families`, {
    headers: getAuthHeaders(),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to fetch families');
  return extractData<Family[]>(response);
}

export async function addFamily(eventId: string, data: {
  name: string;
  members: Array<{ firstName?: string; lastName?: string; tags?: string[] } | string>;
}): Promise<Family> {
  const response = await fetch(`${API_BASE}/events/${eventId}/families`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to add family');
  return extractData<Family>(response);
}

export async function addGuestToFamily(eventId: string, familyId: string, guestId: string): Promise<Family> {
  const response = await fetch(`${API_BASE}/events/${eventId}/families/${familyId}/members`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ guestId }),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to add guest to family');
  return extractData<Family>(response);
}

export async function removeGuestFromFamily(eventId: string, familyId: string, guestId: string): Promise<Family> {
  const response = await fetch(`${API_BASE}/events/${eventId}/families/${familyId}/members/${guestId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to remove guest from family');
  return extractData<Family>(response);
}

export async function updateFamily(eventId: string, familyId: string, updates: Partial<Family>): Promise<Family> {
  const response = await fetch(`${API_BASE}/events/${eventId}/families/${familyId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to update family');
  return extractData<Family>(response);
}

export async function reorderFamilyMembers(eventId: string, familyId: string, memberIds: string[]): Promise<Family> {
  const response = await fetch(`${API_BASE}/events/${eventId}/families/${familyId}/members/reorder`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ memberIds }),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to reorder family members');
  return extractData<Family>(response);
}

export async function deleteFamily(eventId: string, familyId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/events/${eventId}/families/${familyId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to delete family');
}

export async function copyFamily(eventId: string, familyId: string, targetEventId: string): Promise<{ family: Family; guests: Guest[] }> {
  const response = await fetch(`${API_BASE}/events/${eventId}/families/${familyId}/copy`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ targetEventId }),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to copy family');
  return extractData<{ family: Family; guests: Guest[] }>(response);
}

// ============================================================
// Category operations (global - not event-scoped)
// ============================================================

export async function fetchCategories(): Promise<CategoryInfo[]> {
  const response = await fetch(`${API_BASE}/categories`, {
    headers: getAuthHeaders(),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to fetch categories');
  return extractData<CategoryInfo[]>(response);
}

export async function addCategory(name: string): Promise<CategoryInfo> {
  const response = await fetch(`${API_BASE}/categories`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name }),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to add category');
  return extractData<CategoryInfo>(response);
}

export async function deleteCategory(name: string): Promise<void> {
  const response = await fetch(`${API_BASE}/categories/${encodeURIComponent(name)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to delete category');
}

export async function renameCategory(oldName: string, newName: string): Promise<CategoryInfo> {
  const response = await fetch(`${API_BASE}/categories/${encodeURIComponent(oldName)}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name: newName }),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to rename category');
  return extractData<CategoryInfo>(response);
}

// ============================================================
// Event operations
// ============================================================

export interface EventWithPermission extends Event {
  permission: PermissionLevel;
}

export async function fetchEvents(): Promise<EventWithPermission[]> {
  const response = await fetch(`${API_BASE}/events`, {
    headers: getAuthHeaders(),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to fetch events');
  return extractData<EventWithPermission[]>(response);
}

export async function createEvent(data: { name: string; date?: string; location?: string }): Promise<Event> {
  const response = await fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to create event');
  return extractData<Event>(response);
}

export async function updateEvent(eventId: string, updates: Partial<Event>): Promise<Event> {
  const response = await fetch(`${API_BASE}/events/${eventId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to update event');
  return extractData<Event>(response);
}

export async function deleteEvent(eventId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/events/${eventId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to delete event');
}

export async function reorderEvents(eventIds: string[]): Promise<Event[]> {
  const response = await fetch(`${API_BASE}/events/reorder`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ eventIds }),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to reorder events');
  return extractData<Event[]>(response);
}

export interface ReconstructFamiliesResult {
  message: string;
  familiesCreated: number;
  guestsUpdated: number;
}

export async function reconstructFamilies(targetEventId: string, sourceEventId: string): Promise<ReconstructFamiliesResult> {
  const response = await fetch(`${API_BASE}/events/${targetEventId}/reconstruct-families`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ sourceEventId }),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to reconstruct families');
  return extractData<ReconstructFamiliesResult>(response);
}

// ============================================================
// Event Permission operations (owner only)
// ============================================================

export interface EventPermission {
  userId: string;
  username: string;
  eventId: string;
  permission: PermissionLevel;
}

export async function fetchEventPermissions(eventId: string): Promise<EventPermission[]> {
  const response = await fetch(`${API_BASE}/events/${eventId}/permissions`, {
    headers: getAuthHeaders(),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to fetch event permissions');
  return extractData<EventPermission[]>(response);
}

export async function setEventPermission(eventId: string, userId: string, permission: PermissionLevel): Promise<UserEventPermission> {
  const response = await fetch(`${API_BASE}/events/${eventId}/permissions/${userId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ permission }),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to set event permission');
  return extractData<UserEventPermission>(response);
}

// ============================================================
// User operations (owner only)
// ============================================================

export interface SafeUser {
  id: string;
  username: string;
  isOwner: boolean;
  createdAt: number;
  createdBy: string;
}

export async function fetchUsers(): Promise<SafeUser[]> {
  const response = await fetch(`${API_BASE}/users`, {
    headers: getAuthHeaders(),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to fetch users');
  return extractData<SafeUser[]>(response);
}

export async function createUser(username: string, password: string): Promise<SafeUser> {
  const response = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ username, password }),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to create user');
  return extractData<SafeUser>(response);
}

export async function updateUser(userId: string, password: string): Promise<SafeUser> {
  const response = await fetch(`${API_BASE}/users/${userId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ password }),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to update user');
  return extractData<SafeUser>(response);
}

export async function deleteUser(userId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/users/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to delete user');
}

export async function fetchUserPermissions(userId: string): Promise<UserEventPermission[]> {
  const response = await fetch(`${API_BASE}/users/${userId}/permissions`, {
    headers: getAuthHeaders(),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to fetch user permissions');
  return extractData<UserEventPermission[]>(response);
}

// ============================================================
// Authentication functions (kept for backwards compatibility)
// ============================================================

export async function login(username: string, password: string): Promise<{ token: string; userId: string; username: string; isOwner: boolean }> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Invalid username or password' }));
    throw new Error(error.error || 'Invalid username or password');
  }
  const result = await response.json();
  const data = result.data || result;
  if (data.token) {
    localStorage.setItem('authToken', data.token);
  }
  return data;
}

export async function logout(): Promise<void> {
  const token = localStorage.getItem('authToken');
  if (token) {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
  localStorage.removeItem('authToken');
}

export async function checkAuth(): Promise<boolean> {
  const token = localStorage.getItem('authToken');
  if (!token) return false;

  try {
    const response = await fetch(`${API_BASE}/auth/check`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) {
      localStorage.removeItem('authToken');
      return false;
    }
    return true;
  } catch (error) {
    localStorage.removeItem('authToken');
    return false;
  }
}

export function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

// ============================================================
// Data Import/Export (owner only)
// ============================================================

export async function exportData(): Promise<Blob> {
  const response = await fetch(`${API_BASE}/data/export`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to export data');
  return response.blob();
}

export async function importData(file: File): Promise<{
  message: string;
  imported: {
    guests: number;
    families: number;
    categories: number;
    users: number;
    events: number;
    permissions: number;
  };
}> {
  const fileContent = await file.text();
  const data = JSON.parse(fileContent);

  const response = await fetch(`${API_BASE}/data/import`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to import data');
  return extractData<{
    message: string;
    imported: {
      guests: number;
      families: number;
      categories: number;
      users: number;
      events: number;
      permissions: number;
    };
  }>(response);
}

// ============================================================
// RSVP Bulk Operations
// ============================================================

export interface BulkRsvpResult {
  updated: number;
  guests: Guest[];
  errors?: string[];
}

export async function bulkUpdateRsvp(
  eventId: string,
  guestIds: string[],
  rsvp: RSVPStatus
): Promise<BulkRsvpResult> {
  const response = await fetch(`${API_BASE}/events/${eventId}/guests/bulk-rsvp`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ guestIds, rsvp }),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to update RSVP');
  return extractData<BulkRsvpResult>(response);
}

// ============================================================
// JOY CSV Import
// ============================================================

export interface JoyImportMatch {
  guestId: string;
  name: string;
  rsvp: RSVPStatus;
  dietaryRequirements?: string;
  previousRsvp?: RSVPStatus;
}

export interface JoyPotentialMatch {
  guestId: string;
  firstName: string;
  lastName: string;
  similarity: number;
}

export interface JoyImportUnmatched {
  rowIndex: number;
  firstName: string;
  lastName: string;
  rsvp: RSVPStatus;
  dietaryRequirements?: string;
  potentialMatches: JoyPotentialMatch[];
}

export interface JoyImportResult {
  dryRun: boolean;
  eventId: string;
  eventName: string;
  matched: JoyImportMatch[];
  unmatched: JoyImportUnmatched[];
  errors: string[];
  summary: {
    total: number;
    matched: number;
    unmatched: number;
    errors: number;
  };
}

export async function importJoyCsv(
  eventId: string,
  csvContent: string,
  dryRun: boolean = false
): Promise<JoyImportResult> {
  const response = await fetch(`${API_BASE}/events/${eventId}/guests/import-joy`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ csvContent, dryRun }),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to import CSV');
  return extractData<JoyImportResult>(response);
}

// ============================================================
// Backup operations
// ============================================================

export interface BackupInfo {
  filename: string;
  timestamp: string;
  size: number;
}

export async function fetchBackups(): Promise<BackupInfo[]> {
  const response = await fetch(`${API_BASE}/backups`, {
    headers: getAuthHeaders(),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to fetch backups');
  return extractData<BackupInfo[]>(response);
}

export async function createBackup(): Promise<BackupInfo> {
  const response = await fetch(`${API_BASE}/backups`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to create backup');
  return extractData<BackupInfo>(response);
}

export async function restoreBackup(filename: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE}/backups/restore`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ filename }),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to restore backup');
  return extractData<{ message: string }>(response);
}

export async function deleteBackupFile(filename: string): Promise<void> {
  const response = await fetch(`${API_BASE}/backups/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to delete backup');
}

export async function fetchBackupSettings(): Promise<BackupSettings> {
  const response = await fetch(`${API_BASE}/backups/settings`, {
    headers: getAuthHeaders(),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to fetch backup settings');
  return extractData<BackupSettings>(response);
}

export async function updateBackupSettings(settings: Partial<BackupSettings>): Promise<BackupSettings> {
  const response = await fetch(`${API_BASE}/backups/settings`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(settings),
  });
  handleAuthError(response);
  if (!response.ok) await handleErrorResponse(response, 'Failed to update backup settings');
  return extractData<BackupSettings>(response);
}
