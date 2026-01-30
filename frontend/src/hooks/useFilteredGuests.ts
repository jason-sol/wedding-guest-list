import { useMemo } from 'react';
import { Guest, RSVPStatus } from '../types';

interface FilterOptions {
  guests: Guest[];
  selectedCategories: string[];
  searchTerm: string;
  selectedRsvpStatuses?: RSVPStatus[];
}

/**
 * Filters guests by categories, RSVP status, and search term.
 * Extracted to avoid duplicate logic between components.
 */
export function filterGuests({
  guests,
  selectedCategories,
  searchTerm,
  selectedRsvpStatuses = [],
}: FilterOptions): Guest[] {
  let filtered = guests;

  // Filter by categories (OR logic - guest must have at least one selected category)
  if (selectedCategories.length > 0) {
    filtered = filtered.filter(guest =>
      selectedCategories.some(cat => guest.tags.includes(cat))
    );
  }

  // Filter by RSVP status (OR logic - guest must have one of the selected statuses)
  if (selectedRsvpStatuses.length > 0) {
    filtered = filtered.filter(guest => {
      // Treat missing/undefined RSVP as 'pending'
      const guestRsvp = guest.rsvp || 'pending';
      return selectedRsvpStatuses.includes(guestRsvp);
    });
  }

  // Filter by search term
  if (searchTerm.trim()) {
    const searchLower = searchTerm.toLowerCase().trim();
    filtered = filtered.filter(guest => {
      const fullName = `${guest.firstName} ${guest.lastName}`.toLowerCase();
      return fullName.includes(searchLower);
    });
  }

  return filtered;
}

/**
 * React hook for filtering guests.
 * Memoizes the result to avoid recalculation on every render.
 */
export function useFilteredGuests(options: FilterOptions): Guest[] {
  const { guests, selectedCategories, searchTerm, selectedRsvpStatuses = [] } = options;

  return useMemo(
    () => filterGuests({ guests, selectedCategories, searchTerm, selectedRsvpStatuses }),
    [guests, selectedCategories, searchTerm, selectedRsvpStatuses]
  );
}
