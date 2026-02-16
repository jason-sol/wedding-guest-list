/**
 * Event-scoped table routes for seating chart.
 * All routes are prefixed with /api/events/:eventId/tables
 * Read operations require viewer+ permission.
 * Write operations require admin+ permission.
 */

import { Router, Request, Response } from 'express';
import { store } from '../store';
import { validate, CreateTableSchema, UpdateTableSchema, AssignSeatsSchema } from '../validation';
import { sendSuccess, sendCreated, sendNoContent, sendNotFound, sendValidationError, sendError } from '../apiResponse';
import { requireEventViewer, requireEventAdmin } from '../middleware/permissions';

const router = Router({ mergeParams: true });

// GET /api/events/:eventId/tables - Get all tables for an event (viewer+)
router.get('/', requireEventViewer, (req: Request, res: Response) => {
  const eventId = req.params.eventId;
  const tables = store.getTablesForEvent(eventId);
  sendSuccess(res, tables);
});

// POST /api/events/:eventId/tables - Create a new table (admin+)
router.post('/', requireEventAdmin, (req: Request, res: Response) => {
  const eventId = req.params.eventId;

  const event = store.getEvent(eventId);
  if (!event) {
    return sendNotFound(res, 'Event');
  }

  const validation = validate(CreateTableSchema, req.body);
  if (!validation.success) {
    return sendValidationError(res, validation.error, validation.details);
  }

  const { name, capacity, shape = 'round', x = 50, y = 50 } = validation.data;

  const table = store.addTable({
    eventId,
    name,
    capacity,
    shape,
    seats: [],
    x,
    y,
  });

  sendCreated(res, table);
});

// PUT /api/events/:eventId/tables/:id - Update a table (admin+)
router.put('/:id', requireEventAdmin, (req: Request, res: Response) => {
  const eventId = req.params.eventId;
  const table = store.getTable(req.params.id);

  if (!table) {
    return sendNotFound(res, 'Table');
  }

  if (table.eventId !== eventId) {
    return sendNotFound(res, 'Table');
  }

  const validation = validate(UpdateTableSchema, req.body);
  if (!validation.success) {
    return sendValidationError(res, validation.error, validation.details);
  }

  const updated = store.updateTable(req.params.id, validation.data);
  if (!updated) {
    return sendNotFound(res, 'Table');
  }

  sendSuccess(res, updated);
});

// PUT /api/events/:eventId/tables/:id/assign - Assign guests to a table (admin+)
router.put('/:id/assign', requireEventAdmin, (req: Request, res: Response) => {
  const eventId = req.params.eventId;
  const table = store.getTable(req.params.id);

  if (!table) {
    return sendNotFound(res, 'Table');
  }

  if (table.eventId !== eventId) {
    return sendNotFound(res, 'Table');
  }

  const validation = validate(AssignSeatsSchema, req.body);
  if (!validation.success) {
    return sendValidationError(res, validation.error, validation.details);
  }

  const { guestIds } = validation.data;

  // Verify all guests belong to this event
  for (const guestId of guestIds) {
    const guest = store.getGuest(guestId);
    if (!guest || guest.eventId !== eventId) {
      return sendError(res, `Guest ${guestId} not found or does not belong to this event`, 400);
    }
  }

  // Check capacity
  if (guestIds.length > table.capacity) {
    return sendError(res, `Cannot assign ${guestIds.length} guests to a table with capacity ${table.capacity}`, 400);
  }

  const updated = store.assignGuestsToTable(req.params.id, guestIds);
  if (!updated) {
    return sendNotFound(res, 'Table');
  }

  sendSuccess(res, updated);
});

// DELETE /api/events/:eventId/tables/:id - Delete a table (admin+)
router.delete('/:id', requireEventAdmin, (req: Request, res: Response) => {
  const eventId = req.params.eventId;
  const table = store.getTable(req.params.id);

  if (!table) {
    return sendNotFound(res, 'Table');
  }

  if (table.eventId !== eventId) {
    return sendNotFound(res, 'Table');
  }

  const deleted = store.deleteTable(req.params.id);
  if (!deleted) {
    return sendNotFound(res, 'Table');
  }

  sendNoContent(res);
});

export default router;
