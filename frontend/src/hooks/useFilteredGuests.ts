import { useMemo } from 'react';
import { Guest } from '../types';

interface FilterOptions {
  guests: Guest[];
  selectedCategories: string[];
  searchTerm: string;
}

/**
 * Filters guests by categories and search term.
 * Extracted to avoid duplicate logic between components.
 */
export function filterGuests({ guests, selectedCategories, searchTerm }: FilterOptions): Guest[] {
  let filtered = guests;

  // Filter by categories
  if (selectedCategories.length > 0) {
    filtered = filtered.filter(guest =>
      selectedCategories.some(cat => guest.tags.includes(cat))
    );
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
  const { guests, selectedCategories, searchTerm } = options;

  return useMemo(
    () => filterGuests({ guests, selectedCategories, searchTerm }),
    [guests, selectedCategories, searchTerm]
  );
}
