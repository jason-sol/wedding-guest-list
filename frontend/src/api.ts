import { Guest, Family, SortOption } from './types';

const API_BASE = '/api';

export async function fetchGuests(sortBy: SortOption = 'lastName'): Promise<Guest[]> {
  const response = await fetch(`${API_BASE}/guests?sortBy=${sortBy}`);
  if (!response.ok) throw new Error('Failed to fetch guests');
  return response.json();
}

export async function addGuest(guest: Omit<Guest, 'id'>): Promise<Guest> {
  const response = await fetch(`${API_BASE}/guests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(guest),
  });
  if (!response.ok) throw new Error('Failed to add guest');
  return response.json();
}

export async function updateGuest(id: string, updates: Partial<Guest>): Promise<Guest> {
  const response = await fetch(`${API_BASE}/guests/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update guest');
  return response.json();
}

export async function deleteGuest(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/guests/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete guest');
}

export async function fetchFamilies(): Promise<Family[]> {
  const response = await fetch(`${API_BASE}/families`);
  if (!response.ok) throw new Error('Failed to fetch families');
  return response.json();
}

export async function addFamily(data: {
  name: string;
  members: Array<{ firstName: string; lastName: string; tags?: string[] }>;
}): Promise<Family> {
  const response = await fetch(`${API_BASE}/families`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to add family');
  return response.json();
}

export async function addGuestToFamily(familyId: string, guestId: string): Promise<Family> {
  const response = await fetch(`${API_BASE}/families/${familyId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guestId }),
  });
  if (!response.ok) throw new Error('Failed to add guest to family');
  return response.json();
}

export async function removeGuestFromFamily(familyId: string, guestId: string): Promise<Family> {
  const response = await fetch(`${API_BASE}/families/${familyId}/members/${guestId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to remove guest from family');
  return response.json();
}
