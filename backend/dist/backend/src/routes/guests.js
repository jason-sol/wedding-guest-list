"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const store_1 = require("../store");
const router = (0, express_1.Router)();
// Helper function to sort guests
function sortGuests(guests, sortBy) {
    const sorted = [...guests];
    switch (sortBy) {
        case 'firstName':
            return sorted.sort((a, b) => a.firstName.localeCompare(b.firstName));
        case 'lastName':
            return sorted.sort((a, b) => a.lastName.localeCompare(b.lastName));
        case 'category':
            return sorted.sort((a, b) => {
                // Sort by first category tag, then by last name
                const aFirstTag = a.tags[0] || '';
                const bFirstTag = b.tags[0] || '';
                const tagCompare = aFirstTag.localeCompare(bFirstTag);
                if (tagCompare !== 0)
                    return tagCompare;
                return a.lastName.localeCompare(b.lastName);
            });
        default:
            return sorted;
    }
}
// GET /api/guests - Get all guests with optional sorting
router.get('/', (req, res) => {
    const sortBy = req.query.sortBy || 'lastName';
    const guests = store_1.store.getAllGuests();
    const sortedGuests = sortGuests(guests, sortBy);
    res.json(sortedGuests);
});
// GET /api/guests/:id - Get a specific guest
router.get('/:id', (req, res) => {
    const guest = store_1.store.getGuest(req.params.id);
    if (!guest) {
        return res.status(404).json({ error: 'Guest not found' });
    }
    res.json(guest);
});
// POST /api/guests - Add a new guest
router.post('/', (req, res) => {
    const { firstName, lastName, familyId, tags } = req.body;
    if (!firstName || !lastName) {
        return res.status(400).json({
            error: 'First name and last name are required'
        });
    }
    const guest = store_1.store.addGuest({
        firstName,
        lastName,
        familyId: familyId || null,
        tags: tags || [],
    });
    res.status(201).json(guest);
});
// PUT /api/guests/:id - Update a guest
router.put('/:id', (req, res) => {
    const { firstName, lastName, familyId, tags } = req.body;
    const updates = {};
    if (firstName !== undefined)
        updates.firstName = firstName;
    if (lastName !== undefined)
        updates.lastName = lastName;
    if (familyId !== undefined)
        updates.familyId = familyId;
    if (tags !== undefined)
        updates.tags = tags;
    const updated = store_1.store.updateGuest(req.params.id, updates);
    if (!updated) {
        return res.status(404).json({ error: 'Guest not found' });
    }
    res.json(updated);
});
// DELETE /api/guests/:id - Delete a guest
router.delete('/:id', (req, res) => {
    const deleted = store_1.store.deleteGuest(req.params.id);
    if (!deleted) {
        return res.status(404).json({ error: 'Guest not found' });
    }
    res.status(204).send();
});
exports.default = router;
