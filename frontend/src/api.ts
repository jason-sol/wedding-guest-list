import { Guest, Family, CategoryInfo } from './types';

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

export async function fetchGuests(): Promise<Guest[]> {
  const response = await fetch(`${API_BASE}/guests`, {
    headers: getAuthHeaders(),
  });
  handleAuthError(response);
  if (!response.ok) throw new Error('Failed to fetch guests');
  return response.json();
}

export async function addGuest(guest: Omit<Guest, 'id'>): Promise<Guest> {
  const response = await fetch(`${API_BASE}/guests`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(guest),
  });
  handleAuthError(response);
  if (!response.ok) throw new Error('Failed to add guest');
  return response.json();
}

export async function updateGuest(id: string, updates: Partial<Guest>): Promise<Guest> {
  const response = await fetch(`${API_BASE}/guests/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });
  handleAuthError(response);
  if (!response.ok) throw new Error('Failed to update guest');
  return response.json();
}

export async function deleteGuest(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/guests/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  handleAuthError(response);
  if (!response.ok) throw new Error('Failed to delete guest');
}

export async function fetchFamilies(): Promise<Family[]> {
  const response = await fetch(`${API_BASE}/families`, {
    headers: getAuthHeaders(),
  });
  handleAuthError(response);
  if (!response.ok) throw new Error('Failed to fetch families');
  return response.json();
}

export async function addFamily(data: {
  name: string;
  members: Array<{ firstName: string; lastName: string; tags?: string[] }>;
}): Promise<Family> {
  const response = await fetch(`${API_BASE}/families`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  handleAuthError(response);
  if (!response.ok) throw new Error('Failed to add family');
  return response.json();
}

export async function addGuestToFamily(familyId: string, guestId: string): Promise<Family> {
  const response = await fetch(`${API_BASE}/families/${familyId}/members`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ guestId }),
  });
  handleAuthError(response);
  if (!response.ok) throw new Error('Failed to add guest to family');
  return response.json();
}

export async function removeGuestFromFamily(familyId: string, guestId: string): Promise<Family> {
  const response = await fetch(`${API_BASE}/families/${familyId}/members/${guestId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  handleAuthError(response);
  if (!response.ok) throw new Error('Failed to remove guest from family');
  return response.json();
}

export async function updateFamily(id: string, updates: Partial<Family>): Promise<Family> {
  const response = await fetch(`${API_BASE}/families/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });
  handleAuthError(response);
  if (!response.ok) throw new Error('Failed to update family');
  return response.json();
}

export async function reorderFamilyMembers(familyId: string, memberIds: string[]): Promise<Family> {
  const response = await fetch(`${API_BASE}/families/${familyId}/members/reorder`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ memberIds }),
  });
  handleAuthError(response);
  if (!response.ok) throw new Error('Failed to reorder family members');
  return response.json();
}

export async function deleteFamily(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/families/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  handleAuthError(response);
  if (!response.ok) throw new Error('Failed to delete family');
}

export async function fetchCategories(): Promise<CategoryInfo[]> {
  const response = await fetch(`${API_BASE}/categories`, {
    headers: getAuthHeaders(),
  });
  handleAuthError(response);
  if (!response.ok) throw new Error('Failed to fetch categories');
  return response.json();
}

export async function addCategory(name: string): Promise<CategoryInfo> {
  const response = await fetch(`${API_BASE}/categories`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name }),
  });
  handleAuthError(response);
  if (!response.ok) throw new Error('Failed to add category');
  return response.json();
}

export async function deleteCategory(name: string): Promise<void> {
  const response = await fetch(`${API_BASE}/categories/${encodeURIComponent(name)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  handleAuthError(response);
  if (!response.ok) throw new Error('Failed to delete category');
}

// Authentication functions
export async function login(username: string, password: string): Promise<{ token: string }> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Invalid username or password' }));
    throw new Error(error.error || 'Invalid username or password');
  }
  const data = await response.json();
  // Store token in localStorage
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
          'Authorization': `Bearer ${token}`
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

// Export data
export async function exportData(): Promise<Blob> {
  const response = await fetch(`${API_BASE}/data/export`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  handleAuthError(response);
  if (!response.ok) throw new Error('Failed to export data');
  return response.blob();
}

// Import data
export async function importData(file: File): Promise<{ message: string; imported: { guests: number; families: number; categories: number } }> {
  const fileContent = await file.text();
  const data = JSON.parse(fileContent);
  
  const response = await fetch(`${API_BASE}/data/import`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  handleAuthError(response);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to import data');
  }
  return response.json();
}
