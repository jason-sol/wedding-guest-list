"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const store_1 = require("../store");
const validation_1 = require("../validation");
const apiResponse_1 = require("../apiResponse");
const router = (0, express_1.Router)();
// Schema for RSVP update
const UpdateRSVPSchema = zod_1.z.object({
    status: validation_1.RSVPStatusSchema,
});
// PUT /api/guests/:id/rsvp - Update guest RSVP status
router.put('/guests/:id/rsvp', (req, res) => {
    const validation = (0, validation_1.validate)(UpdateRSVPSchema, req.body);
    if (!validation.success) {
        return (0, apiResponse_1.sendValidationError)(res, validation.error, validation.details);
    }
    const { status } = validation.data;
    const updated = store_1.store.updateGuest(req.params.id, { rsvp: status });
    if (!updated) {
        return (0, apiResponse_1.sendNotFound)(res, 'Guest');
    }
    (0, apiResponse_1.sendSuccess)(res, updated);
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
    (0, apiResponse_1.sendSuccess)(res, stats);
});
exports.default = router;
