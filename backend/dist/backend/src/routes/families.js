"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const store_1 = require("../store");
const capitalize_1 = require("../../../shared/utils/capitalize");
const router = (0, express_1.Router)();
// GET /api/families - Get all families
router.get('/', (req, res) => {
    const families = store_1.store.getAllFamilies();
    res.json(families);
});
// GET /api/families/:id - Get a specific family
router.get('/:id', (req, res) => {
    const family = store_1.store.getFamily(req.params.id);
    if (!family) {
        return res.status(404).json({ error: 'Family not found' });
    }
    res.json(family);
});
// POST /api/families - Create a new family with members
router.post('/', (req, res) => {
    const { name, members } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Family name is required' });
    }
    // If members are provided as guest data, create guests first
    const memberIds = [];
    if (Array.isArray(members)) {
        for (const member of members) {
            if (typeof member === 'object' && member.firstName && member.lastName) {
                // Create guest and add to family (capitalize names)
                const guest = store_1.store.addGuest({
                    firstName: (0, capitalize_1.capitalizeWords)(member.firstName.trim()),
                    lastName: (0, capitalize_1.capitalizeWords)(member.lastName.trim()),
                    familyId: null, // Will be set after family is created
                    tags: member.tags || [],
                });
                memberIds.push(guest.id);
            }
            else if (typeof member === 'string') {
                // Assume it's an existing guest ID
                memberIds.push(member);
            }
        }
    }
    const family = store_1.store.addFamily({
        name: (0, capitalize_1.capitalizeWords)(name.trim()),
        members: memberIds,
    });
    // Update guests to reference this family
    memberIds.forEach(guestId => {
        store_1.store.updateGuest(guestId, { familyId: family.id });
    });
    res.status(201).json(family);
});
// PUT /api/families/:id - Update a family
router.put('/:id', (req, res) => {
    const { name, members } = req.body;
    const updates = {};
    if (name !== undefined)
        updates.name = (0, capitalize_1.capitalizeWords)(name.trim());
    if (members !== undefined)
        updates.members = members;
    const updated = store_1.store.updateFamily(req.params.id, updates);
    if (!updated) {
        return res.status(404).json({ error: 'Family not found' });
    }
    res.json(updated);
});
// PUT /api/families/:id/members/reorder - Reorder family members
router.put('/:id/members/reorder', (req, res) => {
    const { memberIds } = req.body;
    if (!Array.isArray(memberIds)) {
        return res.status(400).json({ error: 'memberIds must be an array' });
    }
    const family = store_1.store.getFamily(req.params.id);
    if (!family) {
        return res.status(404).json({ error: 'Family not found' });
    }
    // Validate all member IDs exist in the family
    const invalidIds = memberIds.filter(id => !family.members.includes(id));
    if (invalidIds.length > 0) {
        return res.status(400).json({ error: `Invalid member IDs: ${invalidIds.join(', ')}` });
    }
    // Update family with new member order
    const updated = store_1.store.updateFamily(req.params.id, { members: memberIds });
    if (!updated) {
        return res.status(404).json({ error: 'Family not found' });
    }
    res.json(updated);
});
// POST /api/families/:id/members - Add a guest to a family
router.post('/:id/members', (req, res) => {
    const { guestId } = req.body;
    if (!guestId) {
        return res.status(400).json({ error: 'guestId is required' });
    }
    const family = store_1.store.getFamily(req.params.id);
    if (!family) {
        return res.status(404).json({ error: 'Family not found' });
    }
    const guest = store_1.store.getGuest(guestId);
    if (!guest) {
        return res.status(404).json({ error: 'Guest not found' });
    }
    // Add guest to family members if not already present
    if (!family.members.includes(guestId)) {
        store_1.store.updateFamily(family.id, {
            members: [...family.members, guestId],
        });
    }
    // Update guest to reference family
    store_1.store.updateGuest(guestId, { familyId: family.id });
    const updatedFamily = store_1.store.getFamily(family.id);
    res.json(updatedFamily);
});
// DELETE /api/families/:id/members/:guestId - Remove a guest from a family
router.delete('/:id/members/:guestId', (req, res) => {
    const family = store_1.store.getFamily(req.params.id);
    if (!family) {
        return res.status(404).json({ error: 'Family not found' });
    }
    const guestId = req.params.guestId;
    const updatedMembers = family.members.filter(id => id !== guestId);
    store_1.store.updateFamily(family.id, { members: updatedMembers });
    store_1.store.updateGuest(guestId, { familyId: null });
    const updatedFamily = store_1.store.getFamily(family.id);
    res.json(updatedFamily);
});
// DELETE /api/families/:id - Delete a family
router.delete('/:id', (req, res) => {
    const family = store_1.store.getFamily(req.params.id);
    if (!family) {
        return res.status(404).json({ error: 'Family not found' });
    }
    // Remove family reference from all members
    family.members.forEach(guestId => {
        store_1.store.updateGuest(guestId, { familyId: null });
    });
    const deleted = store_1.store.deleteFamily(req.params.id);
    if (!deleted) {
        return res.status(404).json({ error: 'Family not found' });
    }
    res.status(204).send();
});
exports.default = router;
