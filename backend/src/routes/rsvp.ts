import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { store } from '../store';
import { RSVPStatus } from '../../../shared/types/index';
import { validate, RSVPStatusSchema } from '../validation';
import { sendSuccess, sendNotFound, sendValidationError } from '../apiResponse';

const router = Router();

// Schema for RSVP update
const UpdateRSVPSchema = z.object({
  status: RSVPStatusSchema,
});

// PUT /api/guests/:id/rsvp - Update guest RSVP status
router.put('/guests/:id/rsvp', (req: Request, res: Response) => {
  const validation = validate(UpdateRSVPSchema, req.body);

  if (!validation.success) {
    return sendValidationError(res, validation.error, validation.details);
  }

  const { status } = validation.data;

  const updated = store.updateGuest(req.params.id, { rsvp: status as RSVPStatus });

  if (!updated) {
    return sendNotFound(res, 'Guest');
  }

  sendSuccess(res, updated);
});

// GET /api/rsvp/stats - Get RSVP statistics
router.get('/stats', (req: Request, res: Response) => {
  const guests = store.getAllGuests();
  const stats = {
    total: guests.length,
    pending: guests.filter(g => !g.rsvp || g.rsvp === 'pending').length,
    accepted: guests.filter(g => g.rsvp === 'accepted').length,
    declined: guests.filter(g => g.rsvp === 'declined').length,
  };
  sendSuccess(res, stats);
});

export default router;
