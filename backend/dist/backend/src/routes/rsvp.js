"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const store_1 = require("../store");
const router = (0, express_1.Router)();
// PUT /api/guests/:id/rsvp - Update guest RSVP status
router.put('/guests/:id/rsvp', (req, res) => {
    const { status } = req.body;
    if (!status || !['pending', 'accepted', 'declined'].includes(status)) {
        return res.status(400).json({
            error: 'Valid RSVP status (pending, accepted, declined) is required'
        });
    }
    const updated = store_1.store.updateGuest(req.params.id, { rsvp: status });
    if (!updated) {
        return res.status(404).json({ error: 'Guest not found' });
    }
    res.json(updated);
});
// GET /api/rsvp/stats - Get RSVP statistics
router.get('/stats', (req, res) => {
    const guests = store_1.store.getAllGuests();
    const stats = {
        total: guests.length,
        pending: guests.filter(g => !g.rsvp || g.rsvp === 'pending').length,
        accepted: guests.filter(g => g.rsvp === 'accepted').length,
        declined: guests.filter(g => g.rsvp === 'declined').length,
    };
    res.json(stats);
});
exports.default = router;
