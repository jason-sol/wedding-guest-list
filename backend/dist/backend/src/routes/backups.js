"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const store_1 = require("../store");
const backupService_1 = require("../backupService");
const validation_1 = require("../validation");
const apiResponse_1 = require("../apiResponse");
const router = (0, express_1.Router)();
// GET /api/backups - List all backups
router.get('/', async (req, res) => {
    try {
        const backupService = (0, backupService_1.getBackupService)();
        const backups = await backupService.listBackups();
        (0, apiResponse_1.sendSuccess)(res, backups);
    }
    catch (error) {
        console.error('Error listing backups:', error);
        (0, apiResponse_1.sendServerError)(res, 'Failed to list backups');
    }
});
// POST /api/backups - Create a manual backup
router.post('/', async (req, res) => {
    try {
        const backupService = (0, backupService_1.getBackupService)();
        const backup = await backupService.createBackup();
        (0, apiResponse_1.sendSuccess)(res, backup, 201);
    }
    catch (error) {
        console.error('Error creating backup:', error);
        (0, apiResponse_1.sendServerError)(res, 'Failed to create backup');
    }
});
// POST /api/backups/restore - Restore from a backup
router.post('/restore', async (req, res) => {
    try {
        const validation = (0, validation_1.validate)(validation_1.RestoreBackupSchema, req.body);
        if (!validation.success) {
            return (0, apiResponse_1.sendValidationError)(res, validation.error, validation.details);
        }
        const backupService = (0, backupService_1.getBackupService)();
        await backupService.restoreFromBackup(validation.data.filename);
        (0, apiResponse_1.sendSuccess)(res, { message: 'Data restored successfully. A safety backup was created before restoring.' });
    }
    catch (error) {
        console.error('Error restoring backup:', error);
        const message = error instanceof Error ? error.message : 'Failed to restore backup';
        (0, apiResponse_1.sendError)(res, message, 400);
    }
});
// DELETE /api/backups/:filename - Delete a backup
router.delete('/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        if (!validation_1.BACKUP_FILENAME_REGEX.test(filename)) {
            return (0, apiResponse_1.sendValidationError)(res, 'Invalid backup filename');
        }
        const backupService = (0, backupService_1.getBackupService)();
        await backupService.deleteBackup(filename);
        (0, apiResponse_1.sendSuccess)(res, { message: 'Backup deleted' });
    }
    catch (error) {
        console.error('Error deleting backup:', error);
        if (error.code === 'ENOENT') {
            return (0, apiResponse_1.sendError)(res, 'Backup not found', 404);
        }
        (0, apiResponse_1.sendServerError)(res, 'Failed to delete backup');
    }
});
// GET /api/backups/settings - Get backup settings
router.get('/settings', (req, res) => {
    try {
        const settings = store_1.store.getBackupSettings();
        (0, apiResponse_1.sendSuccess)(res, settings);
    }
    catch (error) {
        console.error('Error getting backup settings:', error);
        (0, apiResponse_1.sendServerError)(res, 'Failed to get backup settings');
    }
});
// PUT /api/backups/settings - Update backup settings
router.put('/settings', (req, res) => {
    try {
        const validation = (0, validation_1.validate)(validation_1.UpdateBackupSettingsSchema, req.body);
        if (!validation.success) {
            return (0, apiResponse_1.sendValidationError)(res, validation.error, validation.details);
        }
        const settings = store_1.store.updateBackupSettings(validation.data);
        // Reschedule based on new settings
        const backupService = (0, backupService_1.getBackupService)();
        backupService.scheduleNextBackup();
        (0, apiResponse_1.sendSuccess)(res, settings);
    }
    catch (error) {
        console.error('Error updating backup settings:', error);
        (0, apiResponse_1.sendServerError)(res, 'Failed to update backup settings');
    }
});
exports.default = router;
