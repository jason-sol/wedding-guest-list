"use strict";
/**
 * Event-scoped family routes.
 * All routes are prefixed with /api/events/:eventId/families
 * Read operations require viewer+ permission.
 * Write operations require admin+ permission.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const store_1 = require("../store");
const capitalize_1 = require("../../../shared/utils/capitalize");
const validation_1 = require("../validation");
const apiResponse_1 = require("../apiResponse");
const permissions_1 = require("../middleware/permissions");
// Router with mergeParams to access :eventId from parent
const router = (0, express_1.Router)({ mergeParams: true });
// GET /api/events/:eventId/families - Get all families for an event (viewer+)
router.get('/', permissions_1.requireEventViewer, (req, res) => {
    const eventId = req.params.eventId;
    const families = store_1.store.getFamiliesForEvent(eventId);
    (0, apiResponse_1.sendSuccess)(res, families);
});
// GET /api/events/:eventId/families/:id - Get a specific family (viewer+)
router.get('/:id', permissions_1.requireEventViewer, (req, res) => {
    const family = store_1.store.getFamily(req.params.id);
    if (!family) {
        return (0, apiResponse_1.sendNotFound)(res, 'Family');
    }
    // Verify family belongs to this event
    if (family.eventId !== req.params.eventId) {
        return (0, apiResponse_1.sendNotFound)(res, 'Family');
    }
    (0, apiResponse_1.sendSuccess)(res, family);
});
// POST /api/events/:eventId/families - Create a new family with members (admin+)
router.post('/', permissions_1.requireEventAdmin, (req, res) => {
    const eventId = req.params.eventId;
    // Verify event exists
    const event = store_1.store.getEvent(eventId);
    if (!event) {
        return (0, apiResponse_1.sendNotFound)(res, 'Event');
    }
    const validation = (0, validation_1.validate)(validation_1.CreateFamilySchema, req.body);
    if (!validation.success) {
        return (0, apiResponse_1.sendValidationError)(res, validation.error, validation.details);
    }
    const { name, members } = validation.data;
    // If members are provided as guest data, create guests first
    const memberIds = [];
    const allGuests = store_1.store.getAllGuests();
    if (Array.isArray(members)) {
        for (const member of members) {
            if (typeof member === 'object' && ('firstName' in member || 'lastName' in member)) {
                const normalizedFirstName = (0, capitalize_1.capitalizeWords)((member.firstName || '').trim());
                const normalizedLastName = (0, capitalize_1.capitalizeWords)((member.lastName || '').trim());
                // Check if a guest with the same name exists in other events to inherit tags
                // Tags represent relationship/location which should be consistent across events
                let inheritedTags = member.tags || [];
                if (!member.tags || member.tags.length === 0) {
                    const existingGuest = allGuests.find(g => g.firstName.toLowerCase() === normalizedFirstName.toLowerCase() &&
                        g.lastName.toLowerCase() === normalizedLastName.toLowerCase());
                    if (existingGuest && existingGuest.tags.length > 0) {
                        inheritedTags = existingGuest.tags;
                    }
                }
                // Create guest and add to family
                const guest = store_1.store.addGuest({
                    eventId,
                    firstName: normalizedFirstName,
                    lastName: normalizedLastName,
                    familyId: null, // Will be set after family is created
                    tags: inheritedTags,
                    rsvp: undefined,
                });
                memberIds.push(guest.id);
            }
            else if (typeof member === 'string') {
                // Assume it's an existing guest ID - verify it belongs to this event
                const existingGuest = store_1.store.getGuest(member);
                if (existingGuest && existingGuest.eventId === eventId) {
                    memberIds.push(member);
                }
            }
        }
    }
    const family = store_1.store.addFamily({
        eventId,
        name: (0, capitalize_1.capitalizeWords)(name),
        members: memberIds,
    });
    // Update guests to reference this family
    memberIds.forEach(guestId => {
        store_1.store.updateGuest(guestId, { familyId: family.id });
    });
    (0, apiResponse_1.sendCreated)(res, family);
});
// PUT /api/events/:eventId/families/:id - Update a family (admin+)
router.put('/:id', permissions_1.requireEventAdmin, (req, res) => {
    const eventId = req.params.eventId;
    const family = store_1.store.getFamily(req.params.id);
    if (!family) {
        return (0, apiResponse_1.sendNotFound)(res, 'Family');
    }
    // Verify family belongs to this event
    if (family.eventId !== eventId) {
        return (0, apiResponse_1.sendNotFound)(res, 'Family');
    }
    const validation = (0, validation_1.validate)(validation_1.UpdateFamilySchema, req.body);
    if (!validation.success) {
        return (0, apiResponse_1.sendValidationError)(res, validation.error, validation.details);
    }
    const { name, members } = validation.data;
    const updates = {};
    if (name !== undefined)
        updates.name = (0, capitalize_1.capitalizeWords)(name);
    if (members !== undefined) {
        // Verify all member IDs belong to this event
        for (const memberId of members) {
            const guest = store_1.store.getGuest(memberId);
            if (!guest || guest.eventId !== eventId) {
                return (0, apiResponse_1.sendError)(res, `Guest ${memberId} not found or does not belong to this event`, 400);
            }
        }
        updates.members = members;
    }
    const updated = store_1.store.updateFamily(req.params.id, updates);
    if (!updated) {
        return (0, apiResponse_1.sendNotFound)(res, 'Family');
    }
    // Family name syncing across groupId is handled by the frontend with a confirmation dialog
    (0, apiResponse_1.sendSuccess)(res, updated);
});
// PUT /api/events/:eventId/families/:id/members/reorder - Reorder family members (admin+)
router.put('/:id/members/reorder', permissions_1.requireEventAdmin, (req, res) => {
    const eventId = req.params.eventId;
    const family = store_1.store.getFamily(req.params.id);
    if (!family) {
        return (0, apiResponse_1.sendNotFound)(res, 'Family');
    }
    // Verify family belongs to this event
    if (family.eventId !== eventId) {
        return (0, apiResponse_1.sendNotFound)(res, 'Family');
    }
    const validation = (0, validation_1.validate)(validation_1.ReorderMembersSchema, req.body);
    if (!validation.success) {
        return (0, apiResponse_1.sendValidationError)(res, validation.error, validation.details);
    }
    const { memberIds } = validation.data;
    // Validate all member IDs exist in the family
    const invalidIds = memberIds.filter(id => !family.members.includes(id));
    if (invalidIds.length > 0) {
        return (0, apiResponse_1.sendValidationError)(res, `Invalid member IDs: ${invalidIds.join(', ')}`);
    }
    // Validate all original members are included (prevent accidental member loss)
    const missingIds = family.members.filter(id => !memberIds.includes(id));
    if (missingIds.length > 0) {
        return (0, apiResponse_1.sendValidationError)(res, `Missing family members: ${missingIds.join(', ')}. All members must be included when reordering.`);
    }
    // Validate no duplicates
    const uniqueIds = new Set(memberIds);
    if (uniqueIds.size !== memberIds.length) {
        return (0, apiResponse_1.sendValidationError)(res, 'Duplicate member IDs are not allowed');
    }
    // Update family with new member order
    const updated = store_1.store.updateFamily(req.params.id, { members: memberIds });
    if (!updated) {
        return (0, apiResponse_1.sendNotFound)(res, 'Family');
    }
    (0, apiResponse_1.sendSuccess)(res, updated);
});
// POST /api/events/:eventId/families/:id/members - Add a guest to a family (admin+)
router.post('/:id/members', permissions_1.requireEventAdmin, (req, res) => {
    const eventId = req.params.eventId;
    const family = store_1.store.getFamily(req.params.id);
    if (!family) {
        return (0, apiResponse_1.sendNotFound)(res, 'Family');
    }
    // Verify family belongs to this event
    if (family.eventId !== eventId) {
        return (0, apiResponse_1.sendNotFound)(res, 'Family');
    }
    const validation = (0, validation_1.validate)(validation_1.AddGuestToFamilySchema, req.body);
    if (!validation.success) {
        return (0, apiResponse_1.sendValidationError)(res, validation.error, validation.details);
    }
    const { guestId } = validation.data;
    const guest = store_1.store.getGuest(guestId);
    if (!guest) {
        return (0, apiResponse_1.sendNotFound)(res, 'Guest');
    }
    // Verify guest belongs to this event
    if (guest.eventId !== eventId) {
        return (0, apiResponse_1.sendError)(res, 'Guest does not belong to this event', 400);
    }
    // Add guest to family members if not already present
    if (!family.members.includes(guestId)) {
        store_1.store.updateFamily(family.id, {
            members: [...family.members, guestId],
        });
    }
    // Update guest to reference family
    store_1.store.updateGuest(guestId, { familyId: family.id });
    // Sync member across all families in the same group
    const syncedCount = store_1.store.addMemberAcrossGroup(family.id, guest);
    const updatedFamily = store_1.store.getFamily(family.id);
    (0, apiResponse_1.sendSuccess)(res, { ...updatedFamily, syncedToFamilies: syncedCount });
});
// DELETE /api/events/:eventId/families/:id/members/:guestId - Remove a guest from a family (admin+)
router.delete('/:id/members/:guestId', permissions_1.requireEventAdmin, (req, res) => {
    const eventId = req.params.eventId;
    const family = store_1.store.getFamily(req.params.id);
    if (!family) {
        return (0, apiResponse_1.sendNotFound)(res, 'Family');
    }
    // Verify family belongs to this event
    if (family.eventId !== eventId) {
        return (0, apiResponse_1.sendNotFound)(res, 'Family');
    }
    const guestId = req.params.guestId;
    const guest = store_1.store.getGuest(guestId);
    // Verify guest belongs to this event
    if (guest && guest.eventId !== eventId) {
        return (0, apiResponse_1.sendError)(res, 'Guest does not belong to this event', 400);
    }
    const updatedMembers = family.members.filter(id => id !== guestId);
    store_1.store.updateFamily(family.id, { members: updatedMembers });
    if (guest) {
        store_1.store.updateGuest(guestId, { familyId: null });
    }
    const updatedFamily = store_1.store.getFamily(family.id);
    (0, apiResponse_1.sendSuccess)(res, updatedFamily);
});
// POST /api/events/:eventId/families/:id/copy - Copy a family to another event (admin+ on target)
router.post('/:id/copy', permissions_1.requireEventViewer, (req, res) => {
    const sourceEventId = req.params.eventId;
    const familyId = req.params.id;
    const validation = (0, validation_1.validate)(validation_1.CopyFamilySchema, req.body);
    if (!validation.success) {
        return (0, apiResponse_1.sendValidationError)(res, validation.error, validation.details);
    }
    const { targetEventId } = validation.data;
    // Verify source family exists and belongs to source event
    const sourceFamily = store_1.store.getFamily(familyId);
    if (!sourceFamily || sourceFamily.eventId !== sourceEventId) {
        return (0, apiResponse_1.sendNotFound)(res, 'Family');
    }
    // Verify target event exists
    const targetEvent = store_1.store.getEvent(targetEventId);
    if (!targetEvent) {
        return (0, apiResponse_1.sendError)(res, 'Target event not found', 400);
    }
    // Check permission on target event (need admin to add families there)
    if (!req.user?.isOwner) {
        const targetPermission = store_1.store.getPermission(req.user.userId, targetEventId);
        if (targetPermission !== 'admin') {
            return (0, apiResponse_1.sendError)(res, 'You need admin permission on the target event to copy families there', 403);
        }
    }
    const result = store_1.store.copyFamilyToEvent(familyId, targetEventId);
    if (!result) {
        return (0, apiResponse_1.sendError)(res, 'Failed to copy family', 500);
    }
    (0, apiResponse_1.sendCreated)(res, result);
});
// DELETE /api/events/:eventId/families/:id - Delete a family (admin+)
router.delete('/:id', permissions_1.requireEventAdmin, (req, res) => {
    const eventId = req.params.eventId;
    const family = store_1.store.getFamily(req.params.id);
    if (!family) {
        return (0, apiResponse_1.sendNotFound)(res, 'Family');
    }
    // Verify family belongs to this event
    if (family.eventId !== eventId) {
        return (0, apiResponse_1.sendNotFound)(res, 'Family');
    }
    // Remove family reference from all members
    family.members.forEach(guestId => {
        const guest = store_1.store.getGuest(guestId);
        if (guest && guest.eventId === eventId) {
            store_1.store.updateGuest(guestId, { familyId: null });
        }
    });
    const deleted = store_1.store.deleteFamily(req.params.id);
    if (!deleted) {
        return (0, apiResponse_1.sendNotFound)(res, 'Family');
    }
    (0, apiResponse_1.sendNoContent)(res);
});
exports.default = router;
