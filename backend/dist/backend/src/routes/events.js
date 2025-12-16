"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const store_1 = require("../store");
// Simple in-memory event store (can be extended to use main store)
const events = new Map();
let nextEventId = 1;
const router = (0, express_1.Router)();
// GET /api/events - Get all events
router.get('/', (req, res) => {
    res.json(Array.from(events.values()));
});
// GET /api/events/:id - Get a specific event
router.get('/:id', (req, res) => {
    const event = events.get(req.params.id);
    if (!event) {
        return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
});
// POST /api/events - Create a new event
router.post('/', (req, res) => {
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
    const event = {
        id: `event-${nextEventId++}`,
        name,
        type: type,
        date,
        location,
    };
    events.set(event.id, event);
    res.status(201).json(event);
});
// PUT /api/events/:id - Update an event
router.put('/:id', (req, res) => {
    const event = events.get(req.params.id);
    if (!event) {
        return res.status(404).json({ error: 'Event not found' });
    }
    const { name, date, location } = req.body;
    const updated = {
        ...event,
        ...(name && { name }),
        ...(date !== undefined && { date }),
        ...(location !== undefined && { location }),
    };
    events.set(event.id, updated);
    res.json(updated);
});
// POST /api/events/:id/guests/:guestId - Add guest to event
router.post('/:id/guests/:guestId', (req, res) => {
    const guest = store_1.store.getGuest(req.params.guestId);
    if (!guest) {
        return res.status(404).json({ error: 'Guest not found' });
    }
    const event = events.get(req.params.id);
    if (!event) {
        return res.status(404).json({ error: 'Event not found' });
    }
    const currentEvents = guest.events || [];
    if (!currentEvents.includes(event.type)) {
        store_1.store.updateGuest(guest.id, {
            events: [...currentEvents, event.type],
        });
    }
    const updatedGuest = store_1.store.getGuest(guest.id);
    res.json(updatedGuest);
});
// DELETE /api/events/:id/guests/:guestId - Remove guest from event
router.delete('/:id/guests/:guestId', (req, res) => {
    const guest = store_1.store.getGuest(req.params.guestId);
    if (!guest) {
        return res.status(404).json({ error: 'Guest not found' });
    }
    const event = events.get(req.params.id);
    if (!event) {
        return res.status(404).json({ error: 'Event not found' });
    }
    const currentEvents = guest.events || [];
    store_1.store.updateGuest(guest.id, {
        events: currentEvents.filter(e => e !== event.type),
    });
    const updatedGuest = store_1.store.getGuest(guest.id);
    res.json(updatedGuest);
});
// DELETE /api/events/:id - Delete an event
router.delete('/:id', (req, res) => {
    const deleted = events.delete(req.params.id);
    if (!deleted) {
        return res.status(404).json({ error: 'Event not found' });
    }
    res.status(204).send();
});
exports.default = router;
