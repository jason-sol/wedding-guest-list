"use strict";
/**
 * Event routes.
 * Events are now persisted to the data store.
 * Creating/modifying events requires owner access.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const store_1 = require("../store");
const validation_1 = require("../validation");
const apiResponse_1 = require("../apiResponse");
const permissions_1 = require("../middleware/permissions");
const router = (0, express_1.Router)();
// GET /api/events - Get all events (filtered by user access)
router.get('/', (req, res) => {
    const events = store_1.store.getAllEvents();
    // Include permission level for each event
    const eventsWithPermissions = events.map(event => {
        // Owners have admin on all events
        const permission = req.user?.isOwner
            ? 'admin'
            : req.user
                ? store_1.store.getPermission(req.user.userId, event.id)
                : 'none';
        return {
            ...event,
            permission,
        };
    });
    (0, apiResponse_1.sendSuccess)(res, eventsWithPermissions);
});
// GET /api/events/:eventId - Get a specific event
router.get('/:eventId', (req, res) => {
    const event = store_1.store.getEvent(req.params.eventId);
    if (!event) {
        return (0, apiResponse_1.sendNotFound)(res, 'Event');
    }
    // Include permission level
    const permission = req.user?.isOwner
        ? 'admin'
        : req.user
            ? store_1.store.getPermission(req.user.userId, event.id)
            : 'none';
    (0, apiResponse_1.sendSuccess)(res, {
        ...event,
        permission,
    });
});
// POST /api/events - Create a new event (owner only)
router.post('/', permissions_1.requireOwner, (req, res) => {
    const validation = (0, validation_1.validate)(validation_1.CreateEventSchema, req.body);
    if (!validation.success) {
        return (0, apiResponse_1.sendValidationError)(res, validation.error, validation.details);
    }
    const { name, date, location } = validation.data;
    // Get current max order
    const events = store_1.store.getAllEvents();
    const maxOrder = events.length > 0 ? Math.max(...events.map(e => e.order)) : -1;
    const event = store_1.store.addEvent({
        name,
        date,
        location,
        order: maxOrder + 1,
        createdAt: Date.now(),
        createdBy: req.user?.username || 'system',
    });
    (0, apiResponse_1.sendCreated)(res, event);
});
// PUT /api/events/reorder - Reorder events (owner only) - must be before /:eventId
router.put('/reorder', permissions_1.requireOwner, (req, res) => {
    const validation = (0, validation_1.validate)(validation_1.ReorderEventsSchema, req.body);
    if (!validation.success) {
        return (0, apiResponse_1.sendValidationError)(res, validation.error, validation.details);
    }
    const { eventIds } = validation.data;
    // Validate all event IDs exist
    for (const id of eventIds) {
        if (!store_1.store.getEvent(id)) {
            return (0, apiResponse_1.sendError)(res, `Event ${id} not found`, 400);
        }
    }
    store_1.store.reorderEvents(eventIds);
    (0, apiResponse_1.sendSuccess)(res, store_1.store.getAllEvents());
});
// PUT /api/events/:eventId - Update an event (owner only)
router.put('/:eventId', permissions_1.requireOwner, (req, res) => {
    const event = store_1.store.getEvent(req.params.eventId);
    if (!event) {
        return (0, apiResponse_1.sendNotFound)(res, 'Event');
    }
    const validation = (0, validation_1.validate)(validation_1.UpdateEventSchema, req.body);
    if (!validation.success) {
        return (0, apiResponse_1.sendValidationError)(res, validation.error, validation.details);
    }
    const updated = store_1.store.updateEvent(req.params.eventId, validation.data);
    if (!updated) {
        return (0, apiResponse_1.sendNotFound)(res, 'Event');
    }
    (0, apiResponse_1.sendSuccess)(res, updated);
});
// DELETE /api/events/:eventId - Delete an event (owner only)
router.delete('/:eventId', permissions_1.requireOwner, (req, res) => {
    const event = store_1.store.getEvent(req.params.eventId);
    if (!event) {
        return (0, apiResponse_1.sendNotFound)(res, 'Event');
    }
    // Don't allow deleting the last event
    const allEvents = store_1.store.getAllEvents();
    if (allEvents.length <= 1) {
        return (0, apiResponse_1.sendError)(res, 'Cannot delete the last event. At least one event must exist.', 400);
    }
    const deleted = store_1.store.deleteEvent(req.params.eventId);
    if (!deleted) {
        return (0, apiResponse_1.sendNotFound)(res, 'Event');
    }
    (0, apiResponse_1.sendNoContent)(res);
});
// GET /api/events/:eventId/permissions - Get all permissions for an event (owner only)
router.get('/:eventId/permissions', permissions_1.requireOwner, (req, res) => {
    const event = store_1.store.getEvent(req.params.eventId);
    if (!event) {
        return (0, apiResponse_1.sendNotFound)(res, 'Event');
    }
    const permissions = store_1.store.getEventPermissions(req.params.eventId);
    // Include all users with their permissions (defaulting to viewer if not set)
    const users = store_1.store.getAllUsers();
    const result = users
        .filter(u => !u.isOwner) // Owner always has full access, don't include
        .map(user => {
        const existing = permissions.find(p => p.userId === user.id);
        return {
            userId: user.id,
            username: user.username,
            eventId: req.params.eventId,
            permission: existing?.permission ?? 'viewer',
        };
    });
    (0, apiResponse_1.sendSuccess)(res, result);
});
// PUT /api/events/:eventId/permissions/:userId - Set permission for a user on an event (owner only)
router.put('/:eventId/permissions/:userId', permissions_1.requireOwner, (req, res) => {
    const event = store_1.store.getEvent(req.params.eventId);
    if (!event) {
        return (0, apiResponse_1.sendNotFound)(res, 'Event');
    }
    const user = store_1.store.getUser(req.params.userId);
    if (!user) {
        return (0, apiResponse_1.sendNotFound)(res, 'User');
    }
    if (user.isOwner) {
        return (0, apiResponse_1.sendError)(res, 'Cannot modify owner permissions', 400);
    }
    const validation = (0, validation_1.validate)(validation_1.SetPermissionSchema, {
        ...req.body,
        userId: req.params.userId,
        eventId: req.params.eventId,
    });
    if (!validation.success) {
        return (0, apiResponse_1.sendValidationError)(res, validation.error, validation.details);
    }
    store_1.store.setPermission(req.params.userId, req.params.eventId, validation.data.permission);
    (0, apiResponse_1.sendSuccess)(res, {
        userId: req.params.userId,
        eventId: req.params.eventId,
        permission: validation.data.permission,
    });
});
// POST /api/events/:eventId/reconstruct-families - Reconstruct families from a source event (owner only)
router.post('/:eventId/reconstruct-families', permissions_1.requireOwner, (req, res) => {
    const targetEvent = store_1.store.getEvent(req.params.eventId);
    if (!targetEvent) {
        return (0, apiResponse_1.sendNotFound)(res, 'Target event');
    }
    const validation = (0, validation_1.validate)(validation_1.ReconstructFamiliesSchema, req.body);
    if (!validation.success) {
        return (0, apiResponse_1.sendValidationError)(res, validation.error, validation.details);
    }
    const { sourceEventId } = validation.data;
    const sourceEvent = store_1.store.getEvent(sourceEventId);
    if (!sourceEvent) {
        return (0, apiResponse_1.sendError)(res, 'Source event not found', 400);
    }
    if (sourceEventId === req.params.eventId) {
        return (0, apiResponse_1.sendError)(res, 'Source and target events must be different', 400);
    }
    const result = store_1.store.reconstructFamiliesFromSource(sourceEventId, req.params.eventId);
    (0, apiResponse_1.sendSuccess)(res, {
        message: `Reconstructed families from "${sourceEvent.name}" to "${targetEvent.name}"`,
        familiesCreated: result.familiesCreated,
        guestsUpdated: result.guestsUpdated,
    });
});
exports.default = router;
