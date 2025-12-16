"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const store_1 = require("../store");
const capitalize_1 = require("../../../shared/utils/capitalize");
const router = (0, express_1.Router)();
// Helper function to sort guests by last name
function sortGuests(guests) {
    return [...guests].sort((a, b) => a.lastName.localeCompare(b.lastName));
}
// GET /api/guests - Get all guests sorted by last name
router.get('/', (req, res) => {
    const guests = store_1.store.getAllGuests();
    const sortedGuests = sortGuests(guests);
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
    // Capitalize names
    const capitalizedFirstName = (0, capitalize_1.capitalizeWords)(firstName.trim());
    const capitalizedLastName = (0, capitalize_1.capitalizeWords)(lastName.trim());
    const guest = store_1.store.addGuest({
        firstName: capitalizedFirstName,
        lastName: capitalizedLastName,
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
        updates.firstName = (0, capitalize_1.capitalizeWords)(firstName.trim());
    if (lastName !== undefined)
        updates.lastName = (0, capitalize_1.capitalizeWords)(lastName.trim());
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
