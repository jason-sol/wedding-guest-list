import { Router, Request, Response } from 'express';
import { store } from '../store';
import { RSVPStatus } from '../../../shared/types/index';

const router = Router();

// PUT /api/guests/:id/rsvp - Update guest RSVP status
router.put('/guests/:id/rsvp', (req: Request, res: Response) => {
  const { status } = req.body;
  
  if (!status || !['pending', 'accepted', 'declined'].includes(status)) {
    return res.status(400).json({ 
      error: 'Valid RSVP status (pending, accepted, declined) is required' 
    });
  }

  const updated = store.updateGuest(req.params.id, { rsvp: status as RSVPStatus });
  
  if (!updated) {
    return res.status(404).json({ error: 'Guest not found' });
  }

  res.json(updated);
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
  res.json(stats);
});

export default router;

