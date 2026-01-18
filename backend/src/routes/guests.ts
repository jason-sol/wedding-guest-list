/**
 * Event-scoped guest routes.
 * All routes are prefixed with /api/events/:eventId/guests
 * Read operations require viewer+ permission.
 * Write operations require admin+ permission.
 */

import { Router, Request, Response } from 'express';
import { store } from '../store';
import { Guest, Event } from '../../../shared/types/index';
import { capitalizeWords } from '../../../shared/utils/capitalize';
import { validate, CreateGuestSchema, UpdateGuestSchema, CopyGuestSchema } from '../validation';
import { sendSuccess, sendCreated, sendNoContent, sendNotFound, sendValidationError, sendError } from '../apiResponse';
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

  const { firstName, lastName, familyId, tags, rsvp } = validation.data;

  // If familyId provided, verify it belongs to this event
  if (familyId) {
    const family = store.getFamily(familyId);
    if (!family || family.eventId !== eventId) {
      return sendError(res, 'Family not found or does not belong to this event', 400);
    }
  }

  // Capitalize names
  const guest = store.addGuest({
    eventId,
    firstName: capitalizeWords(firstName || ''),
    lastName: capitalizeWords(lastName || ''),
    familyId: familyId || null,
    tags: tags || [],
    rsvp,
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

  const { firstName, lastName, familyId, tags, rsvp } = validation.data;

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

export default router;
