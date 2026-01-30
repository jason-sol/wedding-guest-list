/**
 * Event-scoped family routes.
 * All routes are prefixed with /api/events/:eventId/families
 * Read operations require viewer+ permission.
 * Write operations require admin+ permission.
 */

import { Router, Request, Response } from 'express';
import { store } from '../store';
import { Family } from '../../../shared/types/index';
import { capitalizeWords } from '../../../shared/utils/capitalize';
import {
  validate,
  CreateFamilySchema,
  UpdateFamilySchema,
  ReorderMembersSchema,
  AddGuestToFamilySchema,
  CopyFamilySchema,
} from '../validation';
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendNotFound,
  sendValidationError,
  sendError,
} from '../apiResponse';
import { requireEventViewer, requireEventAdmin } from '../middleware/permissions';

// Router with mergeParams to access :eventId from parent
const router = Router({ mergeParams: true });

// GET /api/events/:eventId/families - Get all families for an event (viewer+)
router.get('/', requireEventViewer, (req: Request, res: Response) => {
  const eventId = req.params.eventId;
  const families = store.getFamiliesForEvent(eventId);
  sendSuccess(res, families);
});

// GET /api/events/:eventId/families/:id - Get a specific family (viewer+)
router.get('/:id', requireEventViewer, (req: Request, res: Response) => {
  const family = store.getFamily(req.params.id);

  if (!family) {
    return sendNotFound(res, 'Family');
  }

  // Verify family belongs to this event
  if (family.eventId !== req.params.eventId) {
    return sendNotFound(res, 'Family');
  }

  sendSuccess(res, family);
});

// POST /api/events/:eventId/families - Create a new family with members (admin+)
router.post('/', requireEventAdmin, (req: Request, res: Response) => {
  const eventId = req.params.eventId;

  // Verify event exists
  const event = store.getEvent(eventId);
  if (!event) {
    return sendNotFound(res, 'Event');
  }

  const validation = validate(CreateFamilySchema, req.body);

  if (!validation.success) {
    return sendValidationError(res, validation.error, validation.details);
  }

  const { name, members } = validation.data;

  // If members are provided as guest data, create guests first
  const memberIds: string[] = [];
  const allGuests = store.getAllGuests();

  if (Array.isArray(members)) {
    for (const member of members) {
      if (typeof member === 'object' && ('firstName' in member || 'lastName' in member)) {
        const normalizedFirstName = capitalizeWords((member.firstName || '').trim());
        const normalizedLastName = capitalizeWords((member.lastName || '').trim());

        // Check if a guest with the same name exists in other events to inherit tags
        // Tags represent relationship/location which should be consistent across events
        let inheritedTags = member.tags || [];
        if (!member.tags || member.tags.length === 0) {
          const existingGuest = allGuests.find(
            g =>
              g.firstName.toLowerCase() === normalizedFirstName.toLowerCase() &&
              g.lastName.toLowerCase() === normalizedLastName.toLowerCase()
          );
          if (existingGuest && existingGuest.tags.length > 0) {
            inheritedTags = existingGuest.tags;
          }
        }

        // Create guest and add to family
        const guest = store.addGuest({
          eventId,
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          familyId: null, // Will be set after family is created
          tags: inheritedTags,
          rsvp: undefined,
        });
        memberIds.push(guest.id);
      } else if (typeof member === 'string') {
        // Assume it's an existing guest ID - verify it belongs to this event
        const existingGuest = store.getGuest(member);
        if (existingGuest && existingGuest.eventId === eventId) {
          memberIds.push(member);
        }
      }
    }
  }

  const family = store.addFamily({
    eventId,
    name: capitalizeWords(name),
    members: memberIds,
  });

  // Update guests to reference this family
  memberIds.forEach(guestId => {
    store.updateGuest(guestId, { familyId: family.id });
  });

  sendCreated(res, family);
});

// PUT /api/events/:eventId/families/:id - Update a family (admin+)
router.put('/:id', requireEventAdmin, (req: Request, res: Response) => {
  const eventId = req.params.eventId;
  const family = store.getFamily(req.params.id);

  if (!family) {
    return sendNotFound(res, 'Family');
  }

  // Verify family belongs to this event
  if (family.eventId !== eventId) {
    return sendNotFound(res, 'Family');
  }

  const validation = validate(UpdateFamilySchema, req.body);

  if (!validation.success) {
    return sendValidationError(res, validation.error, validation.details);
  }

  const { name, members } = validation.data;

  const updates: Partial<Family> = {};
  if (name !== undefined) updates.name = capitalizeWords(name);
  if (members !== undefined) {
    // Verify all member IDs belong to this event
    for (const memberId of members) {
      const guest = store.getGuest(memberId);
      if (!guest || guest.eventId !== eventId) {
        return sendError(res, `Guest ${memberId} not found or does not belong to this event`, 400);
      }
    }
    updates.members = members;
  }

  const updated = store.updateFamily(req.params.id, updates);

  if (!updated) {
    return sendNotFound(res, 'Family');
  }

  sendSuccess(res, updated);
});

// PUT /api/events/:eventId/families/:id/members/reorder - Reorder family members (admin+)
router.put('/:id/members/reorder', requireEventAdmin, (req: Request, res: Response) => {
  const eventId = req.params.eventId;
  const family = store.getFamily(req.params.id);

  if (!family) {
    return sendNotFound(res, 'Family');
  }

  // Verify family belongs to this event
  if (family.eventId !== eventId) {
    return sendNotFound(res, 'Family');
  }

  const validation = validate(ReorderMembersSchema, req.body);

  if (!validation.success) {
    return sendValidationError(res, validation.error, validation.details);
  }

  const { memberIds } = validation.data;

  // Validate all member IDs exist in the family
  const invalidIds = memberIds.filter(id => !family.members.includes(id));
  if (invalidIds.length > 0) {
    return sendValidationError(res, `Invalid member IDs: ${invalidIds.join(', ')}`);
  }

  // Validate all original members are included (prevent accidental member loss)
  const missingIds = family.members.filter(id => !memberIds.includes(id));
  if (missingIds.length > 0) {
    return sendValidationError(res, `Missing family members: ${missingIds.join(', ')}. All members must be included when reordering.`);
  }

  // Validate no duplicates
  const uniqueIds = new Set(memberIds);
  if (uniqueIds.size !== memberIds.length) {
    return sendValidationError(res, 'Duplicate member IDs are not allowed');
  }

  // Update family with new member order
  const updated = store.updateFamily(req.params.id, { members: memberIds });

  if (!updated) {
    return sendNotFound(res, 'Family');
  }

  sendSuccess(res, updated);
});

// POST /api/events/:eventId/families/:id/members - Add a guest to a family (admin+)
router.post('/:id/members', requireEventAdmin, (req: Request, res: Response) => {
  const eventId = req.params.eventId;
  const family = store.getFamily(req.params.id);

  if (!family) {
    return sendNotFound(res, 'Family');
  }

  // Verify family belongs to this event
  if (family.eventId !== eventId) {
    return sendNotFound(res, 'Family');
  }

  const validation = validate(AddGuestToFamilySchema, req.body);

  if (!validation.success) {
    return sendValidationError(res, validation.error, validation.details);
  }

  const { guestId } = validation.data;

  const guest = store.getGuest(guestId);
  if (!guest) {
    return sendNotFound(res, 'Guest');
  }

  // Verify guest belongs to this event
  if (guest.eventId !== eventId) {
    return sendError(res, 'Guest does not belong to this event', 400);
  }

  // Add guest to family members if not already present
  if (!family.members.includes(guestId)) {
    store.updateFamily(family.id, {
      members: [...family.members, guestId],
    });
  }

  // Update guest to reference family
  store.updateGuest(guestId, { familyId: family.id });

  const updatedFamily = store.getFamily(family.id);
  sendSuccess(res, updatedFamily);
});

// DELETE /api/events/:eventId/families/:id/members/:guestId - Remove a guest from a family (admin+)
router.delete('/:id/members/:guestId', requireEventAdmin, (req: Request, res: Response) => {
  const eventId = req.params.eventId;
  const family = store.getFamily(req.params.id);

  if (!family) {
    return sendNotFound(res, 'Family');
  }

  // Verify family belongs to this event
  if (family.eventId !== eventId) {
    return sendNotFound(res, 'Family');
  }

  const guestId = req.params.guestId;
  const guest = store.getGuest(guestId);

  // Verify guest belongs to this event
  if (guest && guest.eventId !== eventId) {
    return sendError(res, 'Guest does not belong to this event', 400);
  }

  const updatedMembers = family.members.filter(id => id !== guestId);

  store.updateFamily(family.id, { members: updatedMembers });
  if (guest) {
    store.updateGuest(guestId, { familyId: null });
  }

  const updatedFamily = store.getFamily(family.id);
  sendSuccess(res, updatedFamily);
});

// POST /api/events/:eventId/families/:id/copy - Copy a family to another event (admin+ on target)
router.post('/:id/copy', requireEventViewer, (req: Request, res: Response) => {
  const sourceEventId = req.params.eventId;
  const familyId = req.params.id;

  const validation = validate(CopyFamilySchema, req.body);

  if (!validation.success) {
    return sendValidationError(res, validation.error, validation.details);
  }

  const { targetEventId } = validation.data;

  // Verify source family exists and belongs to source event
  const sourceFamily = store.getFamily(familyId);
  if (!sourceFamily || sourceFamily.eventId !== sourceEventId) {
    return sendNotFound(res, 'Family');
  }

  // Verify target event exists
  const targetEvent = store.getEvent(targetEventId);
  if (!targetEvent) {
    return sendError(res, 'Target event not found', 400);
  }

  // Check permission on target event (need admin to add families there)
  if (!req.user?.isOwner) {
    const targetPermission = store.getPermission(req.user!.userId, targetEventId);
    if (targetPermission !== 'admin') {
      return sendError(res, 'You need admin permission on the target event to copy families there', 403);
    }
  }

  const result = store.copyFamilyToEvent(familyId, targetEventId);

  if (!result) {
    return sendError(res, 'Failed to copy family', 500);
  }

  sendCreated(res, result);
});

// DELETE /api/events/:eventId/families/:id - Delete a family (admin+)
router.delete('/:id', requireEventAdmin, (req: Request, res: Response) => {
  const eventId = req.params.eventId;
  const family = store.getFamily(req.params.id);

  if (!family) {
    return sendNotFound(res, 'Family');
  }

  // Verify family belongs to this event
  if (family.eventId !== eventId) {
    return sendNotFound(res, 'Family');
  }

  // Remove family reference from all members
  family.members.forEach(guestId => {
    const guest = store.getGuest(guestId);
    if (guest && guest.eventId === eventId) {
      store.updateGuest(guestId, { familyId: null });
    }
  });

  const deleted = store.deleteFamily(req.params.id);
  if (!deleted) {
    return sendNotFound(res, 'Family');
  }

  sendNoContent(res);
});

export default router;
