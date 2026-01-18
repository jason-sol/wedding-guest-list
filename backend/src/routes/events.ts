/**
 * Event routes.
 * Events are now persisted to the data store.
 * Creating/modifying events requires owner access.
 */

import { Router, Request, Response } from 'express';
import { store } from '../store';
import { validate, CreateEventSchema, UpdateEventSchema, ReorderEventsSchema, SetPermissionSchema, ReconstructFamiliesSchema } from '../validation';
import { sendSuccess, sendCreated, sendNoContent, sendNotFound, sendValidationError, sendError } from '../apiResponse';
import { requireOwner } from '../middleware/permissions';

const router = Router();

// GET /api/events - Get all events (filtered by user access)
router.get('/', (req: Request, res: Response) => {
  const events = store.getAllEvents();

  // Include permission level for each event
  const eventsWithPermissions = events.map(event => {
    // Owners have admin on all events
    const permission = req.user?.isOwner
      ? 'admin'
      : req.user
      ? store.getPermission(req.user.userId, event.id)
      : 'none';
    return {
      ...event,
      permission,
    };
  });

  sendSuccess(res, eventsWithPermissions);
});

// GET /api/events/:eventId - Get a specific event
router.get('/:eventId', (req: Request, res: Response) => {
  const event = store.getEvent(req.params.eventId);

  if (!event) {
    return sendNotFound(res, 'Event');
  }

  // Include permission level
  const permission = req.user?.isOwner
    ? 'admin'
    : req.user
    ? store.getPermission(req.user.userId, event.id)
    : 'none';

  sendSuccess(res, {
    ...event,
    permission,
  });
});

// POST /api/events - Create a new event (owner only)
router.post('/', requireOwner, (req: Request, res: Response) => {
  const validation = validate(CreateEventSchema, req.body);

  if (!validation.success) {
    return sendValidationError(res, validation.error, validation.details);
  }

  const { name, date, location } = validation.data;

  // Get current max order
  const events = store.getAllEvents();
  const maxOrder = events.length > 0 ? Math.max(...events.map(e => e.order)) : -1;

  const event = store.addEvent({
    name,
    date,
    location,
    order: maxOrder + 1,
    createdAt: Date.now(),
    createdBy: req.user?.username || 'system',
  });

  sendCreated(res, event);
});

// PUT /api/events/reorder - Reorder events (owner only) - must be before /:eventId
router.put('/reorder', requireOwner, (req: Request, res: Response) => {
  const validation = validate(ReorderEventsSchema, req.body);

  if (!validation.success) {
    return sendValidationError(res, validation.error, validation.details);
  }

  const { eventIds } = validation.data;

  // Validate all event IDs exist
  for (const id of eventIds) {
    if (!store.getEvent(id)) {
      return sendError(res, `Event ${id} not found`, 400);
    }
  }

  store.reorderEvents(eventIds);
  sendSuccess(res, store.getAllEvents());
});

// PUT /api/events/:eventId - Update an event (owner only)
router.put('/:eventId', requireOwner, (req: Request, res: Response) => {
  const event = store.getEvent(req.params.eventId);

  if (!event) {
    return sendNotFound(res, 'Event');
  }

  const validation = validate(UpdateEventSchema, req.body);

  if (!validation.success) {
    return sendValidationError(res, validation.error, validation.details);
  }

  const updated = store.updateEvent(req.params.eventId, validation.data);

  if (!updated) {
    return sendNotFound(res, 'Event');
  }

  sendSuccess(res, updated);
});

// DELETE /api/events/:eventId - Delete an event (owner only)
router.delete('/:eventId', requireOwner, (req: Request, res: Response) => {
  const event = store.getEvent(req.params.eventId);

  if (!event) {
    return sendNotFound(res, 'Event');
  }

  // Don't allow deleting the last event
  const allEvents = store.getAllEvents();
  if (allEvents.length <= 1) {
    return sendError(res, 'Cannot delete the last event. At least one event must exist.', 400);
  }

  const deleted = store.deleteEvent(req.params.eventId);

  if (!deleted) {
    return sendNotFound(res, 'Event');
  }

  sendNoContent(res);
});

// GET /api/events/:eventId/permissions - Get all permissions for an event (owner only)
router.get('/:eventId/permissions', requireOwner, (req: Request, res: Response) => {
  const event = store.getEvent(req.params.eventId);

  if (!event) {
    return sendNotFound(res, 'Event');
  }

  const permissions = store.getEventPermissions(req.params.eventId);

  // Include all users with their permissions (defaulting to viewer if not set)
  const users = store.getAllUsers();
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

  sendSuccess(res, result);
});

// PUT /api/events/:eventId/permissions/:userId - Set permission for a user on an event (owner only)
router.put('/:eventId/permissions/:userId', requireOwner, (req: Request, res: Response) => {
  const event = store.getEvent(req.params.eventId);

  if (!event) {
    return sendNotFound(res, 'Event');
  }

  const user = store.getUser(req.params.userId);

  if (!user) {
    return sendNotFound(res, 'User');
  }

  if (user.isOwner) {
    return sendError(res, 'Cannot modify owner permissions', 400);
  }

  const validation = validate(SetPermissionSchema, {
    ...req.body,
    userId: req.params.userId,
    eventId: req.params.eventId,
  });

  if (!validation.success) {
    return sendValidationError(res, validation.error, validation.details);
  }

  store.setPermission(req.params.userId, req.params.eventId, validation.data.permission);

  sendSuccess(res, {
    userId: req.params.userId,
    eventId: req.params.eventId,
    permission: validation.data.permission,
  });
});

// POST /api/events/:eventId/reconstruct-families - Reconstruct families from a source event (owner only)
router.post('/:eventId/reconstruct-families', requireOwner, (req: Request, res: Response) => {
  const targetEvent = store.getEvent(req.params.eventId);

  if (!targetEvent) {
    return sendNotFound(res, 'Target event');
  }

  const validation = validate(ReconstructFamiliesSchema, req.body);

  if (!validation.success) {
    return sendValidationError(res, validation.error, validation.details);
  }

  const { sourceEventId } = validation.data;

  const sourceEvent = store.getEvent(sourceEventId);
  if (!sourceEvent) {
    return sendError(res, 'Source event not found', 400);
  }

  if (sourceEventId === req.params.eventId) {
    return sendError(res, 'Source and target events must be different', 400);
  }

  const result = store.reconstructFamiliesFromSource(sourceEventId, req.params.eventId);

  sendSuccess(res, {
    message: `Reconstructed families from "${sourceEvent.name}" to "${targetEvent.name}"`,
    familiesCreated: result.familiesCreated,
    guestsUpdated: result.guestsUpdated,
  });
});

export default router;
