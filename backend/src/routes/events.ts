import { Router, Request, Response } from 'express';
import { store } from '../store';
import { Event, EventType } from '../../../shared/types/index';

// Simple in-memory event store (can be extended to use main store)
const events: Map<string, Event> = new Map();
let nextEventId = 1;

const router = Router();

// GET /api/events - Get all events
router.get('/', (req: Request, res: Response) => {
  res.json(Array.from(events.values()));
});

// GET /api/events/:id - Get a specific event
router.get('/:id', (req: Request, res: Response) => {
  const event = events.get(req.params.id);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  res.json(event);
});

// POST /api/events - Create a new event
router.post('/', (req: Request, res: Response) => {
  const { name, type, date, location } = req.body;

  if (!name || !type) {
    return res.status(400).json({ 
      error: 'Event name and type are required' 
    });
  }

  if (!['ceremony', 'reception', 'thanksgiving'].includes(type)) {
    return res.status(400).json({ 
      error: 'Invalid event type. Must be ceremony, reception, or thanksgiving' 
    });
  }

  const event: Event = {
    id: `event-${nextEventId++}`,
    name,
    type: type as EventType,
    date,
    location,
  };

  events.set(event.id, event);
  res.status(201).json(event);
});

// PUT /api/events/:id - Update an event
router.put('/:id', (req: Request, res: Response) => {
  const event = events.get(req.params.id);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  const { name, date, location } = req.body;
  const updated: Event = {
    ...event,
    ...(name && { name }),
    ...(date !== undefined && { date }),
    ...(location !== undefined && { location }),
  };

  events.set(event.id, updated);
  res.json(updated);
});

// POST /api/events/:id/guests/:guestId - Add guest to event
router.post('/:id/guests/:guestId', (req: Request, res: Response) => {
  const guest = store.getGuest(req.params.guestId);
  if (!guest) {
    return res.status(404).json({ error: 'Guest not found' });
  }

  const event = events.get(req.params.id);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  const currentEvents = guest.events || [];
  if (!currentEvents.includes(event.type)) {
    store.updateGuest(guest.id, {
      events: [...currentEvents, event.type],
    });
  }

  const updatedGuest = store.getGuest(guest.id);
  res.json(updatedGuest);
});

// DELETE /api/events/:id/guests/:guestId - Remove guest from event
router.delete('/:id/guests/:guestId', (req: Request, res: Response) => {
  const guest = store.getGuest(req.params.guestId);
  if (!guest) {
    return res.status(404).json({ error: 'Guest not found' });
  }

  const event = events.get(req.params.id);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  const currentEvents = guest.events || [];
  store.updateGuest(guest.id, {
    events: currentEvents.filter(e => e !== event.type),
  });

  const updatedGuest = store.getGuest(guest.id);
  res.json(updatedGuest);
});

// DELETE /api/events/:id - Delete an event
router.delete('/:id', (req: Request, res: Response) => {
  const deleted = events.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Event not found' });
  }
  res.status(204).send();
});

export default router;

