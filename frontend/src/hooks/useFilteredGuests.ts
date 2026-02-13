import { useMemo } from 'react';
import { Guest, Family, RSVPStatus, AgeGroup } from '../types';

interface FilterOptions {
  guests: Guest[];
  selectedCategories: string[];
  searchTerm: string;
  selectedRsvpStatuses?: RSVPStatus[];
  families?: Family[];
  selectedAgeGroups?: AgeGroup[];
}

/**
 * Filters guests by categories, RSVP status, age group, and search term.
 * Search also matches family names, including all members of matching families.
 */
export function filterGuests({
  guests,
  selectedCategories,
  searchTerm,
  selectedRsvpStatuses = [],
  families = [],
  selectedAgeGroups = [],
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

  // Filter by age group
  if (selectedAgeGroups.length > 0) {
    filtered = filtered.filter(guest => {
      const guestAgeGroup = guest.ageGroup || 'adult';
      return selectedAgeGroups.includes(guestAgeGroup);
    });
  }

  // Filter by search term (also matches family names)
  if (searchTerm.trim()) {
    const searchLower = searchTerm.toLowerCase().trim();

    // Build set of family IDs whose name matches the search
    const matchingFamilyIds = new Set<string>();
    for (const family of families) {
      if (family.name.toLowerCase().includes(searchLower)) {
        matchingFamilyIds.add(family.id);
      }
    }

    filtered = filtered.filter(guest => {
      const fullName = `${guest.firstName} ${guest.lastName}`.toLowerCase();
      if (fullName.includes(searchLower)) return true;
      // Include if guest belongs to a family whose name matches
      if (guest.familyId && matchingFamilyIds.has(guest.familyId)) return true;
      return false;
    });
  }

  return filtered;
}

/**
 * React hook for filtering guests.
 * Memoizes the result to avoid recalculation on every render.
 */
export function useFilteredGuests(options: FilterOptions): Guest[] {
  const {
    guests,
    selectedCategories,
    searchTerm,
    selectedRsvpStatuses = [],
    families = [],
    selectedAgeGroups = [],
  } = options;

  return useMemo(
    () => filterGuests({ guests, selectedCategories, searchTerm, selectedRsvpStatuses, families, selectedAgeGroups }),
    [guests, selectedCategories, searchTerm, selectedRsvpStatuses, families, selectedAgeGroups]
  );
}
