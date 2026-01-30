/**
 * Event-scoped guest routes.
 * All routes are prefixed with /api/events/:eventId/guests
 * Read operations require viewer+ permission.
 * Write operations require admin+ permission.
 */

import { Router, Request, Response } from 'express';
import { parse } from 'csv-parse/sync';
import { store } from '../store';
import { Guest, Event, RSVPStatus } from '../../../shared/types/index';
import { capitalizeWords } from '../../../shared/utils/capitalize';
import { validate, CreateGuestSchema, UpdateGuestSchema, CopyGuestSchema, BulkRsvpUpdateSchema, JoyImportSchema } from '../validation';
import { sendSuccess, sendCreated, sendNoContent, sendNotFound, sendValidationError, sendError, sendServerError } from '../apiResponse';
import { requireEventViewer, requireEventAdmin } from '../middleware/permissions';

// Router with mergeParams to access :eventId from parent
const router = Router({ mergeParams: true });

// Helper function to sort guests by last name
function sortGuests(guests: Guest[]): Guest[] {
  return [...guests].sort((a, b) => {
    // Handle guests without last names (put them at the end)
    const aLastName = a.lastName || '';
    const bLastName = b.lastName || '';
    return aLastName.localeCompare(bLastName);
  });
}

// GET /api/events/:eventId/guests - Get all guests for an event (viewer+)
router.get('/', requireEventViewer, (req: Request, res: Response) => {
  const eventId = req.params.eventId;
  const guests = store.getGuestsForEvent(eventId);
  const sortedGuests = sortGuests(guests);
  sendSuccess(res, sortedGuests);
});

// GET /api/events/:eventId/guests/presence - Get presence info for all guests in this event (viewer+)
router.get('/presence', requireEventViewer, (req: Request, res: Response) => {
  const eventId = req.params.eventId;

  const eventGuests = store.getGuestsForEvent(eventId);
  const allGuests = store.getAllGuests();
  const allEvents = store.getAllEvents();

  // Build a map of guest name -> array of guests in other events
  const guestNameToGuestsInOtherEvents = new Map<string, Guest[]>();

  // First, group all guests by normalized name
  for (const guest of allGuests) {
    const key = `${guest.firstName.toLowerCase()} ${guest.lastName.toLowerCase()}`.trim();
    if (!key) continue;

    if (!guestNameToGuestsInOtherEvents.has(key)) {
      guestNameToGuestsInOtherEvents.set(key, []);
    }
    guestNameToGuestsInOtherEvents.get(key)!.push(guest);
  }

  // Convert to response format: guestId -> [{id: eventId, name: eventName, guestId: guestIdInThatEvent}]
  const result: Record<string, { id: string; name: string; guestId: string }[]> = {};

  // For each guest in the current event, find other events they're in (that user can view)
  for (const guest of eventGuests) {
    const key = `${guest.firstName.toLowerCase()} ${guest.lastName.toLowerCase()}`.trim();
    if (!key) continue;

    const guestsWithSameName = guestNameToGuestsInOtherEvents.get(key);
    if (!guestsWithSameName) continue;

    // Use a Map to deduplicate by event ID (keep only one guest per event)
    const otherEventEntriesMap = new Map<string, { id: string; name: string; guestId: string }>();

    for (const otherGuest of guestsWithSameName) {
      if (otherGuest.eventId === eventId) continue; // Skip current event
      if (otherEventEntriesMap.has(otherGuest.eventId)) continue; // Skip if we already have this event

      // Check if user has at least viewer permission on this event
      let hasAccess = false;
      if (req.user?.isOwner) {
        hasAccess = true;
      } else {
        const perm = store.getPermission(req.user!.userId, otherGuest.eventId);
        if (perm !== 'none') {
          hasAccess = true;
        }
      }

      if (hasAccess) {
        const event = allEvents.find(e => e.id === otherGuest.eventId);
        if (event) {
          otherEventEntriesMap.set(otherGuest.eventId, {
            id: event.id,
            name: event.name,
            guestId: otherGuest.id,
          });
        }
      }
    }

    if (otherEventEntriesMap.size > 0) {
      result[guest.id] = Array.from(otherEventEntriesMap.values());
    }
  }

  sendSuccess(res, result);
});

// GET /api/events/:eventId/guests/:id - Get a specific guest (viewer+)
router.get('/:id', requireEventViewer, (req: Request, res: Response) => {
  const guest = store.getGuest(req.params.id);

  if (!guest) {
    return sendNotFound(res, 'Guest');
  }

  // Verify guest belongs to this event
  if (guest.eventId !== req.params.eventId) {
    return sendNotFound(res, 'Guest');
  }

  sendSuccess(res, guest);
});

// POST /api/events/:eventId/guests - Add a new guest (admin+)
router.post('/', requireEventAdmin, (req: Request, res: Response) => {
  const eventId = req.params.eventId;

  // Verify event exists
  const event = store.getEvent(eventId);
  if (!event) {
    return sendNotFound(res, 'Event');
  }

  const validation = validate(CreateGuestSchema, req.body);

  if (!validation.success) {
    return sendValidationError(res, validation.error, validation.details);
  }

  const { firstName, lastName, familyId, tags, rsvp, dietaryRequirements } = validation.data;

  // If familyId provided, verify it belongs to this event
  if (familyId) {
    const family = store.getFamily(familyId);
    if (!family || family.eventId !== eventId) {
      return sendError(res, 'Family not found or does not belong to this event', 400);
    }
  }

  // Check if a guest with the same name exists in other events to inherit tags
  // Tags represent relationship/location which should be consistent across events
  const normalizedFirstName = capitalizeWords(firstName || '').toLowerCase();
  const normalizedLastName = capitalizeWords(lastName || '').toLowerCase();
  let inheritedTags = tags || [];

  if (!tags || tags.length === 0) {
    const allGuests = store.getAllGuests();
    const existingGuest = allGuests.find(
      g =>
        g.firstName.toLowerCase() === normalizedFirstName &&
        g.lastName.toLowerCase() === normalizedLastName
    );
    if (existingGuest && existingGuest.tags.length > 0) {
      inheritedTags = existingGuest.tags;
    }
  }

  // Capitalize names
  const guest = store.addGuest({
    eventId,
    firstName: capitalizeWords(firstName || ''),
    lastName: capitalizeWords(lastName || ''),
    familyId: familyId || null,
    tags: inheritedTags,
    rsvp,
    dietaryRequirements,
  });

  // If added to a family, update the family's member list
  if (familyId) {
    const family = store.getFamily(familyId);
    if (family && !family.members.includes(guest.id)) {
      store.updateFamily(familyId, {
        members: [...family.members, guest.id],
      });
    }
  }

  sendCreated(res, guest);
});

// PUT /api/events/:eventId/guests/:id - Update a guest (admin+)
router.put('/:id', requireEventAdmin, (req: Request, res: Response) => {
  const eventId = req.params.eventId;
  const guest = store.getGuest(req.params.id);

  if (!guest) {
    return sendNotFound(res, 'Guest');
  }

  // Verify guest belongs to this event
  if (guest.eventId !== eventId) {
    return sendNotFound(res, 'Guest');
  }

  const validation = validate(UpdateGuestSchema, req.body);

  if (!validation.success) {
    return sendValidationError(res, validation.error, validation.details);
  }

  const { firstName, lastName, familyId, tags, rsvp, dietaryRequirements } = validation.data;

  // If familyId provided, verify it belongs to this event
  if (familyId !== undefined && familyId !== null) {
    const family = store.getFamily(familyId);
    if (!family || family.eventId !== eventId) {
      return sendError(res, 'Family not found or does not belong to this event', 400);
    }
  }

  const updates: Partial<Guest> = {};
  if (firstName !== undefined) updates.firstName = capitalizeWords(firstName);
  if (lastName !== undefined) updates.lastName = capitalizeWords(lastName);
  if (familyId !== undefined) updates.familyId = familyId;
  if (tags !== undefined) updates.tags = tags;
  if (rsvp !== undefined) updates.rsvp = rsvp;
  if (dietaryRequirements !== undefined) updates.dietaryRequirements = dietaryRequirements;

  // Handle family membership changes
  const oldFamilyId = guest.familyId;
  const newFamilyId = updates.familyId !== undefined ? updates.familyId : oldFamilyId;

  if (oldFamilyId !== newFamilyId) {
    // Remove from old family
    if (oldFamilyId) {
      const oldFamily = store.getFamily(oldFamilyId);
      if (oldFamily) {
        store.updateFamily(oldFamilyId, {
          members: oldFamily.members.filter(id => id !== guest.id),
        });
      }
    }

    // Add to new family
    if (newFamilyId) {
      const newFamily = store.getFamily(newFamilyId);
      if (newFamily && !newFamily.members.includes(guest.id)) {
        store.updateFamily(newFamilyId, {
          members: [...newFamily.members, guest.id],
        });
      }
    }
  }

  const updated = store.updateGuest(req.params.id, updates);

  if (!updated) {
    return sendNotFound(res, 'Guest');
  }

  // Sync tags across all events for guests with the same name
  // Tags represent relationship/location which should be consistent across events
  if (tags !== undefined) {
    const guestFirstName = updated.firstName.toLowerCase();
    const guestLastName = updated.lastName.toLowerCase();
    const allGuests = store.getAllGuests();

    for (const otherGuest of allGuests) {
      // Skip the guest we just updated and guests in the same event
      if (otherGuest.id === updated.id) continue;

      // Match by name (case-insensitive)
      if (
        otherGuest.firstName.toLowerCase() === guestFirstName &&
        otherGuest.lastName.toLowerCase() === guestLastName
      ) {
        store.updateGuest(otherGuest.id, { tags });
      }
    }
  }

  sendSuccess(res, updated);
});

// PUT /api/events/:eventId/guests/:id/rsvp - Update guest RSVP (admin+)
router.put('/:id/rsvp', requireEventAdmin, (req: Request, res: Response) => {
  const eventId = req.params.eventId;
  const guest = store.getGuest(req.params.id);

  if (!guest) {
    return sendNotFound(res, 'Guest');
  }

  // Verify guest belongs to this event
  if (guest.eventId !== eventId) {
    return sendNotFound(res, 'Guest');
  }

  const { rsvp } = req.body;

  if (!['pending', 'accepted', 'declined'].includes(rsvp)) {
    return sendValidationError(res, 'RSVP must be pending, accepted, or declined');
  }

  const updated = store.updateGuest(req.params.id, { rsvp });

  if (!updated) {
    return sendNotFound(res, 'Guest');
  }

  sendSuccess(res, updated);
});

// POST /api/events/:eventId/guests/bulk-rsvp - Update RSVP for multiple guests (admin+)
router.post('/bulk-rsvp', requireEventAdmin, (req: Request, res: Response) => {
  const eventId = req.params.eventId;

  const validation = validate(BulkRsvpUpdateSchema, req.body);

  if (!validation.success) {
    return sendValidationError(res, validation.error, validation.details);
  }

  const { guestIds, rsvp } = validation.data;
  const updatedGuests: Guest[] = [];
  const errors: string[] = [];

  for (const guestId of guestIds) {
    const guest = store.getGuest(guestId);
    if (!guest) {
      errors.push(`Guest ${guestId} not found`);
      continue;
    }
    if (guest.eventId !== eventId) {
      errors.push(`Guest ${guestId} does not belong to this event`);
      continue;
    }

    const updated = store.updateGuest(guestId, { rsvp });
    if (updated) {
      updatedGuests.push(updated);
    } else {
      errors.push(`Failed to update guest ${guestId}`);
    }
  }

  sendSuccess(res, {
    updated: updatedGuests.length,
    guests: updatedGuests,
    errors: errors.length > 0 ? errors : undefined,
  });
});

// POST /api/events/:eventId/guests/:id/copy - Copy a guest to another event (admin+ on target)
router.post('/:id/copy', requireEventViewer, (req: Request, res: Response) => {
  const sourceEventId = req.params.eventId;
  const guestId = req.params.id;

  const validation = validate(CopyGuestSchema, req.body);

  if (!validation.success) {
    return sendValidationError(res, validation.error, validation.details);
  }

  const { targetEventId } = validation.data;

  // Verify source guest exists and belongs to source event
  const sourceGuest = store.getGuest(guestId);
  if (!sourceGuest || sourceGuest.eventId !== sourceEventId) {
    return sendNotFound(res, 'Guest');
  }

  // Verify target event exists
  const targetEvent = store.getEvent(targetEventId);
  if (!targetEvent) {
    return sendError(res, 'Target event not found', 400);
  }

  // Check permission on target event (need admin to add guests there)
  if (!req.user?.isOwner) {
    const targetPermission = store.getPermission(req.user!.userId, targetEventId);
    if (targetPermission !== 'admin') {
      return sendError(res, 'You need admin permission on the target event to copy guests there', 403);
    }
  }

  const copiedGuest = store.copyGuestToEvent(guestId, targetEventId);

  if (!copiedGuest) {
    return sendError(res, 'Failed to copy guest', 500);
  }

  sendCreated(res, copiedGuest);
});

// GET /api/events/:eventId/guests/:id/presence - Get which other events this guest appears in (by name)
router.get('/:id/presence', requireEventViewer, (req: Request, res: Response) => {
  const eventId = req.params.eventId;
  const guestId = req.params.id;

  const guest = store.getGuest(guestId);
  if (!guest || guest.eventId !== eventId) {
    return sendNotFound(res, 'Guest');
  }

  // Find other events with a guest of the same name
  const guestKey = `${guest.firstName.toLowerCase()} ${guest.lastName.toLowerCase()}`.trim();
  const allGuests = store.getAllGuests();
  const allEvents = store.getAllEvents();

  const otherEventIds = new Set<string>();

  for (const otherGuest of allGuests) {
    if (otherGuest.eventId === eventId) continue; // Skip current event

    const otherKey = `${otherGuest.firstName.toLowerCase()} ${otherGuest.lastName.toLowerCase()}`.trim();
    if (otherKey === guestKey) {
      // Check if user has at least viewer permission on this event
      if (req.user?.isOwner) {
        otherEventIds.add(otherGuest.eventId);
      } else {
        const perm = store.getPermission(req.user!.userId, otherGuest.eventId);
        if (perm !== 'none') {
          otherEventIds.add(otherGuest.eventId);
        }
      }
    }
  }

  // Map event IDs to names
  const otherEvents = Array.from(otherEventIds)
    .map(id => allEvents.find(e => e.id === id))
    .filter((e): e is Event => e !== undefined)
    .map(e => ({ id: e.id, name: e.name }));

  sendSuccess(res, otherEvents);
});

// DELETE /api/events/:eventId/guests/:id - Delete a guest (admin+)
router.delete('/:id', requireEventAdmin, (req: Request, res: Response) => {
  const eventId = req.params.eventId;
  const guest = store.getGuest(req.params.id);

  if (!guest) {
    return sendNotFound(res, 'Guest');
  }

  // Verify guest belongs to this event
  if (guest.eventId !== eventId) {
    return sendNotFound(res, 'Guest');
  }

  const deleted = store.deleteGuest(req.params.id);

  if (!deleted) {
    return sendNotFound(res, 'Guest');
  }

  sendNoContent(res);
});

// Calculate similarity between two strings using Levenshtein distance
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  // Create matrix
  const matrix: number[][] = [];
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const distance = matrix[s1.length][s2.length];
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - distance / maxLength;
}

// Find potential matches for a name with similarity scores
function findPotentialMatches(
  firstName: string,
  lastName: string,
  guests: Guest[],
  threshold: number = 0.4
): Array<{ guestId: string; firstName: string; lastName: string; similarity: number }> {
  const matches: Array<{ guestId: string; firstName: string; lastName: string; similarity: number }> = [];

  const fullName = `${firstName} ${lastName}`.toLowerCase().trim();

  for (const guest of guests) {
    const guestFullName = `${guest.firstName} ${guest.lastName}`.toLowerCase().trim();

    // Calculate full name similarity
    const fullNameSimilarity = calculateSimilarity(fullName, guestFullName);

    // Calculate first name and last name similarities separately
    const firstNameSimilarity = calculateSimilarity(firstName.toLowerCase(), guest.firstName.toLowerCase());
    const lastNameSimilarity = calculateSimilarity(lastName.toLowerCase(), guest.lastName.toLowerCase());

    // Use the best of: full name match, or weighted first+last match
    const weightedPartsSimilarity = (firstNameSimilarity * 0.4 + lastNameSimilarity * 0.6);
    const similarity = Math.max(fullNameSimilarity, weightedPartsSimilarity);

    // Also check for substring matches (e.g., nickname in full name)
    const firstNameInGuest = guest.firstName.toLowerCase().includes(firstName.toLowerCase()) ||
                              firstName.toLowerCase().includes(guest.firstName.toLowerCase());
    const lastNameInGuest = guest.lastName.toLowerCase().includes(lastName.toLowerCase()) ||
                             lastName.toLowerCase().includes(guest.lastName.toLowerCase());

    // Boost similarity if there's a substring match
    let adjustedSimilarity = similarity;
    if (firstNameInGuest && firstName.length >= 2) adjustedSimilarity = Math.max(adjustedSimilarity, 0.5);
    if (lastNameInGuest && lastName.length >= 2) adjustedSimilarity = Math.max(adjustedSimilarity, 0.6);
    if (firstNameInGuest && lastNameInGuest) adjustedSimilarity = Math.max(adjustedSimilarity, 0.75);

    if (adjustedSimilarity >= threshold) {
      matches.push({
        guestId: guest.id,
        firstName: guest.firstName,
        lastName: guest.lastName,
        similarity: Math.round(adjustedSimilarity * 100) / 100,
      });
    }
  }

  // Sort by similarity descending, limit to top 5
  return matches
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);
}

// Helper to map JOY RSVP status to our status
function mapJoyRsvpStatus(joyRsvp: string): RSVPStatus {
  const normalized = (joyRsvp || '').toLowerCase().trim();

  if (normalized.includes('joyfully accept') ||
      normalized.includes('accept') ||
      normalized.includes('yes') ||
      normalized.includes('attending')) {
    return 'accepted';
  }

  if (normalized.includes('decline') ||
      normalized.includes('regretfully') ||
      normalized.includes('no') ||
      normalized.includes('not attending')) {
    return 'declined';
  }

  return 'pending';
}

// POST /api/events/:eventId/guests/import-joy - Import RSVP data from JOY CSV (admin+)
router.post('/import-joy', requireEventAdmin, (req: Request, res: Response) => {
  const eventId = req.params.eventId;

  // Verify event exists
  const event = store.getEvent(eventId);
  if (!event) {
    return sendNotFound(res, 'Event');
  }

  const validation = validate(JoyImportSchema, req.body);

  if (!validation.success) {
    return sendValidationError(res, validation.error, validation.details);
  }

  const { csvContent, dryRun } = validation.data;

  try {
    // Parse CSV with headers
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as Record<string, string>[];

    const guests = store.getGuestsForEvent(eventId);

    const results = {
      matched: [] as Array<{
        guestId: string;
        name: string;
        rsvp: RSVPStatus;
        dietaryRequirements?: string;
        previousRsvp?: RSVPStatus;
      }>,
      unmatched: [] as Array<{
        rowIndex: number;
        firstName: string;
        lastName: string;
        rsvp: RSVPStatus;
        dietaryRequirements?: string;
        potentialMatches: Array<{
          guestId: string;
          firstName: string;
          lastName: string;
          similarity: number;
        }>;
      }>,
      errors: [] as string[],
    };

    for (let rowIndex = 0; rowIndex < records.length; rowIndex++) {
      const row = records[rowIndex];
      // Handle various column name formats from JOY
      const firstName = (
        row['first name'] ||
        row['First Name'] ||
        row['firstName'] ||
        row['First_Name'] ||
        ''
      ).trim();

      const lastName = (
        row['last name'] ||
        row['Last Name'] ||
        row['lastName'] ||
        row['Last_Name'] ||
        ''
      ).trim();

      if (!firstName && !lastName) {
        // Skip rows without names (could be empty rows)
        continue;
      }

      // Get RSVP status from various possible column names
      const rsvpRaw = (
        row['rsvp'] ||
        row['RSVP'] ||
        row['Rsvp'] ||
        ''
      ).trim();

      // Get dietary requirements from various possible column names
      const dietaryRaw = (
        row['what are your dietary requirements? (allergies, gluten free, etc)'] ||
        row['dietary requirements'] ||
        row['Dietary Requirements'] ||
        row['dietary'] ||
        row['Dietary'] ||
        row['allergies'] ||
        row['Allergies'] ||
        ''
      ).trim();

      const rsvp = mapJoyRsvpStatus(rsvpRaw);

      // Find matching guest by name (case-insensitive)
      const matchingGuest = guests.find(g =>
        g.firstName.toLowerCase() === firstName.toLowerCase() &&
        g.lastName.toLowerCase() === lastName.toLowerCase()
      );

      if (matchingGuest) {
        results.matched.push({
          guestId: matchingGuest.id,
          name: `${firstName} ${lastName}`,
          rsvp,
          dietaryRequirements: dietaryRaw || undefined,
          previousRsvp: matchingGuest.rsvp,
        });

        // Apply updates if not dry run
        if (!dryRun) {
          const updates: Partial<Guest> = { rsvp };
          if (dietaryRaw) {
            updates.dietaryRequirements = dietaryRaw;
          }
          store.updateGuest(matchingGuest.id, updates);
        }
      } else {
        // Find potential matches for manual resolution
        const potentialMatches = findPotentialMatches(firstName, lastName, guests);

        results.unmatched.push({
          rowIndex,
          firstName,
          lastName,
          rsvp,
          dietaryRequirements: dietaryRaw || undefined,
          potentialMatches,
        });
      }
    }

    sendSuccess(res, {
      dryRun,
      eventId,
      eventName: event.name,
      ...results,
      summary: {
        total: records.length,
        matched: results.matched.length,
        unmatched: results.unmatched.length,
        errors: results.errors.length,
      },
    });
  } catch (error) {
    console.error('CSV import error:', error);
    if (error instanceof Error) {
      sendValidationError(res, `Failed to parse CSV: ${error.message}`);
    } else {
      sendServerError(res, 'Failed to parse CSV file');
    }
  }
});

export default router;
