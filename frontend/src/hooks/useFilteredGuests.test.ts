import { describe, test, expect } from 'vitest';
import { filterGuests } from './useFilteredGuests';
import { Guest, Family } from '../types';

function makeGuest(overrides: Partial<Guest> = {}): Guest {
  return {
    id: `guest-${Math.random().toString(36).slice(2)}`,
    eventId: 'event-1',
    firstName: 'John',
    lastName: 'Doe',
    familyId: null,
    tags: [],
    ...overrides,
  };
}

function makeFamily(overrides: Partial<Family> = {}): Family {
  return {
    id: `family-${Math.random().toString(36).slice(2)}`,
    eventId: 'event-1',
    name: 'Test Family',
    members: [],
    ...overrides,
  };
}

describe('filterGuests', () => {
  // ============================================================
  // No filters
  // ============================================================

  test('should return all guests when no filters applied', () => {
    const guests = [makeGuest({ firstName: 'John' }), makeGuest({ firstName: 'Jane' })];

    const result = filterGuests({
      guests,
      selectedCategories: [],
      searchTerm: '',
    });

    expect(result).toHaveLength(2);
  });

  test('should return empty array for empty input', () => {
    const result = filterGuests({
      guests: [],
      selectedCategories: [],
      searchTerm: '',
    });

    expect(result).toHaveLength(0);
  });

  // ============================================================
  // Category filters
  // ============================================================

  describe('category filters', () => {
    test('should filter by single category', () => {
      const guests = [
        makeGuest({ firstName: 'John', tags: ['Bride Family'] }),
        makeGuest({ firstName: 'Jane', tags: ['Groom Family'] }),
        makeGuest({ firstName: 'Bob', tags: [] }),
      ];

      const result = filterGuests({
        guests,
        selectedCategories: ['Bride Family'],
        searchTerm: '',
      });

      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe('John');
    });

    test('should filter by multiple categories (OR logic)', () => {
      const guests = [
        makeGuest({ firstName: 'John', tags: ['Bride Family'] }),
        makeGuest({ firstName: 'Jane', tags: ['Groom Family'] }),
        makeGuest({ firstName: 'Bob', tags: ['Church Friends'] }),
      ];

      const result = filterGuests({
        guests,
        selectedCategories: ['Bride Family', 'Groom Family'],
        searchTerm: '',
      });

      expect(result).toHaveLength(2);
    });

    test('should include guest with at least one matching category', () => {
      const guests = [
        makeGuest({ tags: ['Bride Family', 'Church Friends'] }),
      ];

      const result = filterGuests({
        guests,
        selectedCategories: ['Church Friends'],
        searchTerm: '',
      });

      expect(result).toHaveLength(1);
    });

    test('should exclude guest with no matching categories', () => {
      const guests = [
        makeGuest({ tags: ['Bride Family'] }),
      ];

      const result = filterGuests({
        guests,
        selectedCategories: ['Groom Family'],
        searchTerm: '',
      });

      expect(result).toHaveLength(0);
    });
  });

  // ============================================================
  // Search term
  // ============================================================

  describe('search term', () => {
    test('should filter by first name', () => {
      const guests = [
        makeGuest({ firstName: 'John', lastName: 'Doe' }),
        makeGuest({ firstName: 'Jane', lastName: 'Smith' }),
      ];

      const result = filterGuests({
        guests,
        selectedCategories: [],
        searchTerm: 'John',
      });

      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe('John');
    });

    test('should filter by last name', () => {
      const guests = [
        makeGuest({ firstName: 'John', lastName: 'Doe' }),
        makeGuest({ firstName: 'Jane', lastName: 'Smith' }),
      ];

      const result = filterGuests({
        guests,
        selectedCategories: [],
        searchTerm: 'Smith',
      });

      expect(result).toHaveLength(1);
      expect(result[0].lastName).toBe('Smith');
    });

    test('should be case-insensitive', () => {
      const guests = [
        makeGuest({ firstName: 'John', lastName: 'Doe' }),
      ];

      const result = filterGuests({
        guests,
        selectedCategories: [],
        searchTerm: 'john',
      });

      expect(result).toHaveLength(1);
    });

    test('should match full name', () => {
      const guests = [
        makeGuest({ firstName: 'John', lastName: 'Doe' }),
        makeGuest({ firstName: 'Jane', lastName: 'Doe' }),
      ];

      const result = filterGuests({
        guests,
        selectedCategories: [],
        searchTerm: 'John Doe',
      });

      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe('John');
    });

    test('should match partial name', () => {
      const guests = [
        makeGuest({ firstName: 'Jonathan', lastName: 'Doe' }),
      ];

      const result = filterGuests({
        guests,
        selectedCategories: [],
        searchTerm: 'Jon',
      });

      expect(result).toHaveLength(1);
    });

    test('should trim search term', () => {
      const guests = [
        makeGuest({ firstName: 'John', lastName: 'Doe' }),
      ];

      const result = filterGuests({
        guests,
        selectedCategories: [],
        searchTerm: '  John  ',
      });

      expect(result).toHaveLength(1);
    });

    test('should ignore empty/whitespace search term', () => {
      const guests = [
        makeGuest({ firstName: 'John' }),
        makeGuest({ firstName: 'Jane' }),
      ];

      const result = filterGuests({
        guests,
        selectedCategories: [],
        searchTerm: '   ',
      });

      expect(result).toHaveLength(2);
    });

    test('should match family name and include all family members', () => {
      const familyId = 'family-1';
      const guests = [
        makeGuest({ firstName: 'John', lastName: 'Doe', familyId }),
        makeGuest({ firstName: 'Jane', lastName: 'Doe', familyId }),
        makeGuest({ firstName: 'Bob', lastName: 'Smith', familyId: null }),
      ];
      const families: Family[] = [
        makeFamily({ id: familyId, name: 'Doe Family', members: [guests[0].id, guests[1].id] }),
      ];

      const result = filterGuests({
        guests,
        selectedCategories: [],
        searchTerm: 'Doe Family',
        families,
      });

      expect(result).toHaveLength(2);
      expect(result.every((g) => g.familyId === familyId)).toBe(true);
    });

    test('should match family name case-insensitively', () => {
      const familyId = 'family-1';
      const guests = [
        makeGuest({ firstName: 'John', lastName: 'Doe', familyId }),
      ];
      const families: Family[] = [
        makeFamily({ id: familyId, name: 'Doe Family' }),
      ];

      const result = filterGuests({
        guests,
        selectedCategories: [],
        searchTerm: 'doe family',
        families,
      });

      expect(result).toHaveLength(1);
    });

    test('should return guest matching either name or family name', () => {
      const familyId = 'family-1';
      const guests = [
        makeGuest({ firstName: 'John', lastName: 'Doe', familyId }),
        makeGuest({ firstName: 'Alice', lastName: 'Smith', familyId: null }),
      ];
      const families: Family[] = [
        makeFamily({ id: familyId, name: 'Different Family' }),
      ];

      // Search for "Doe" should match John by name
      const result = filterGuests({
        guests,
        selectedCategories: [],
        searchTerm: 'Doe',
        families,
      });

      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe('John');
    });
  });

  // ============================================================
  // RSVP status filter
  // ============================================================

  describe('RSVP status filter', () => {
    test('should filter by single RSVP status', () => {
      const guests = [
        makeGuest({ firstName: 'John', rsvp: 'accepted' }),
        makeGuest({ firstName: 'Jane', rsvp: 'declined' }),
        makeGuest({ firstName: 'Bob', rsvp: 'pending' }),
      ];

      const result = filterGuests({
        guests,
        selectedCategories: [],
        searchTerm: '',
        selectedRsvpStatuses: ['accepted'],
      });

      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe('John');
    });

    test('should filter by multiple RSVP statuses', () => {
      const guests = [
        makeGuest({ firstName: 'John', rsvp: 'accepted' }),
        makeGuest({ firstName: 'Jane', rsvp: 'declined' }),
        makeGuest({ firstName: 'Bob', rsvp: 'pending' }),
      ];

      const result = filterGuests({
        guests,
        selectedCategories: [],
        searchTerm: '',
        selectedRsvpStatuses: ['accepted', 'pending'],
      });

      expect(result).toHaveLength(2);
    });

    test('should treat undefined RSVP as pending', () => {
      const guests = [
        makeGuest({ firstName: 'John', rsvp: undefined }),
      ];

      const result = filterGuests({
        guests,
        selectedCategories: [],
        searchTerm: '',
        selectedRsvpStatuses: ['pending'],
      });

      expect(result).toHaveLength(1);
    });

    test('should not filter when selectedRsvpStatuses is empty', () => {
      const guests = [
        makeGuest({ firstName: 'John', rsvp: 'accepted' }),
        makeGuest({ firstName: 'Jane', rsvp: 'declined' }),
      ];

      const result = filterGuests({
        guests,
        selectedCategories: [],
        searchTerm: '',
        selectedRsvpStatuses: [],
      });

      expect(result).toHaveLength(2);
    });
  });

  // ============================================================
  // Age group filter
  // ============================================================

  describe('age group filter', () => {
    test('should filter by age group', () => {
      const guests = [
        makeGuest({ firstName: 'John', ageGroup: 'adult' }),
        makeGuest({ firstName: 'Junior', ageGroup: 'child' }),
        makeGuest({ firstName: 'Jane', ageGroup: 'adult' }),
      ];

      const result = filterGuests({
        guests,
        selectedCategories: [],
        searchTerm: '',
        selectedAgeGroups: ['child'],
      });

      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe('Junior');
    });

    test('should treat undefined ageGroup as adult', () => {
      const guests = [
        makeGuest({ firstName: 'John', ageGroup: undefined }),
      ];

      const result = filterGuests({
        guests,
        selectedCategories: [],
        searchTerm: '',
        selectedAgeGroups: ['adult'],
      });

      expect(result).toHaveLength(1);
    });

    test('should filter by multiple age groups', () => {
      const guests = [
        makeGuest({ firstName: 'John', ageGroup: 'adult' }),
        makeGuest({ firstName: 'Junior', ageGroup: 'child' }),
      ];

      const result = filterGuests({
        guests,
        selectedCategories: [],
        searchTerm: '',
        selectedAgeGroups: ['adult', 'child'],
      });

      expect(result).toHaveLength(2);
    });

    test('should not filter when selectedAgeGroups is empty', () => {
      const guests = [
        makeGuest({ firstName: 'John', ageGroup: 'adult' }),
        makeGuest({ firstName: 'Junior', ageGroup: 'child' }),
      ];

      const result = filterGuests({
        guests,
        selectedCategories: [],
        searchTerm: '',
        selectedAgeGroups: [],
      });

      expect(result).toHaveLength(2);
    });
  });

  // ============================================================
  // Combined filters
  // ============================================================

  describe('combined filters', () => {
    test('should combine category and search filters', () => {
      const guests = [
        makeGuest({ firstName: 'John', lastName: 'Doe', tags: ['Bride Family'] }),
        makeGuest({ firstName: 'Jane', lastName: 'Doe', tags: ['Groom Family'] }),
        makeGuest({ firstName: 'John', lastName: 'Smith', tags: ['Bride Family'] }),
      ];

      const result = filterGuests({
        guests,
        selectedCategories: ['Bride Family'],
        searchTerm: 'Doe',
      });

      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe('John');
      expect(result[0].lastName).toBe('Doe');
    });

    test('should combine category, RSVP, and search filters', () => {
      const guests = [
        makeGuest({ firstName: 'John', tags: ['Bride Family'], rsvp: 'accepted' }),
        makeGuest({ firstName: 'Jane', tags: ['Bride Family'], rsvp: 'declined' }),
        makeGuest({ firstName: 'Bob', tags: ['Groom Family'], rsvp: 'accepted' }),
      ];

      const result = filterGuests({
        guests,
        selectedCategories: ['Bride Family'],
        searchTerm: '',
        selectedRsvpStatuses: ['accepted'],
      });

      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe('John');
    });

    test('should combine all four filters', () => {
      const guests = [
        makeGuest({ firstName: 'John', tags: ['Bride Family'], rsvp: 'accepted', ageGroup: 'adult' }),
        makeGuest({ firstName: 'Junior', tags: ['Bride Family'], rsvp: 'accepted', ageGroup: 'child' }),
        makeGuest({ firstName: 'Jane', tags: ['Bride Family'], rsvp: 'declined', ageGroup: 'adult' }),
      ];

      const result = filterGuests({
        guests,
        selectedCategories: ['Bride Family'],
        searchTerm: '',
        selectedRsvpStatuses: ['accepted'],
        selectedAgeGroups: ['adult'],
      });

      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe('John');
    });
  });
});
