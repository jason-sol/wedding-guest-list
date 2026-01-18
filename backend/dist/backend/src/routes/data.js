"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const store_1 = require("../store");
const validation_1 = require("../validation");
const apiResponse_1 = require("../apiResponse");
const permissions_1 = require("../middleware/permissions");
const router = (0, express_1.Router)();
// GET /api/data/export - Export current data as JSON (owner only)
router.get('/export', permissions_1.requireOwner, (req, res) => {
    try {
        const data = store_1.store.getExportData();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="wedding-guest-list-data.json"');
        res.json(data);
    }
    catch (error) {
        console.error('Error exporting data:', error);
        (0, apiResponse_1.sendServerError)(res, 'Failed to export data');
    }
});
// POST /api/data/import - Import data from JSON (owner only)
router.post('/import', permissions_1.requireOwner, (req, res) => {
    try {
        // Validate the import data with Zod schema
        const validation = (0, validation_1.validate)(validation_1.ImportDataSchema, req.body);
        if (!validation.success) {
            return (0, apiResponse_1.sendValidationError)(res, validation.error, validation.details);
        }
        const { guests = [], families = [], categories = [], users = [], events = [], permissions = [], } = validation.data;
        // Import data with preserved IDs
        store_1.store.importData({
            guests,
            families,
            categories,
            users,
            events,
            permissions,
        });
        (0, apiResponse_1.sendSuccess)(res, {
            message: 'Data imported successfully',
            imported: {
                guests: guests.length,
                families: families.length,
                categories: categories.length,
                users: users.length,
                events: events.length,
                permissions: permissions.length,
            },
        });
    }
    catch (error) {
        console.error('Error importing data:', error);
        (0, apiResponse_1.sendServerError)(res, 'Failed to import data');
    }
});
exports.default = router;
