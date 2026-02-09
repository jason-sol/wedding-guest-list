import { Router, Request, Response } from 'express';
import { store } from '../store';
import { getBackupService } from '../backupService';
import { validate, UpdateBackupSettingsSchema, RestoreBackupSchema, BACKUP_FILENAME_REGEX } from '../validation';
import {
  sendSuccess,
  sendValidationError,
  sendServerError,
  sendError,
} from '../apiResponse';

const router = Router();

// GET /api/backups - List all backups
router.get('/', async (req: Request, res: Response) => {
  try {
    const backupService = getBackupService();
    const backups = await backupService.listBackups();
    sendSuccess(res, backups);
  } catch (error) {
    console.error('Error listing backups:', error);
    sendServerError(res, 'Failed to list backups');
  }
});

// POST /api/backups - Create a manual backup
router.post('/', async (req: Request, res: Response) => {
  try {
    const backupService = getBackupService();
    const backup = await backupService.createBackup();
    sendSuccess(res, backup, 201);
  } catch (error) {
    console.error('Error creating backup:', error);
    sendServerError(res, 'Failed to create backup');
  }
});

// POST /api/backups/restore - Restore from a backup
router.post('/restore', async (req: Request, res: Response) => {
  try {
    const validation = validate(RestoreBackupSchema, req.body);
    if (!validation.success) {
      return sendValidationError(res, validation.error, validation.details);
    }

    const backupService = getBackupService();
    await backupService.restoreFromBackup(validation.data.filename);
    sendSuccess(res, { message: 'Data restored successfully. A safety backup was created before restoring.' });
  } catch (error) {
    console.error('Error restoring backup:', error);
    const message = error instanceof Error ? error.message : 'Failed to restore backup';
    sendError(res, message, 400);
  }
});

// DELETE /api/backups/:filename - Delete a backup
router.delete('/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    if (!BACKUP_FILENAME_REGEX.test(filename)) {
      return sendValidationError(res, 'Invalid backup filename');
    }

    const backupService = getBackupService();
    await backupService.deleteBackup(filename);
    sendSuccess(res, { message: 'Backup deleted' });
  } catch (error) {
    console.error('Error deleting backup:', error);
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return sendError(res, 'Backup not found', 404);
    }
    sendServerError(res, 'Failed to delete backup');
  }
});

// GET /api/backups/settings - Get backup settings
router.get('/settings', (req: Request, res: Response) => {
  try {
    const settings = store.getBackupSettings();
    sendSuccess(res, settings);
  } catch (error) {
    console.error('Error getting backup settings:', error);
    sendServerError(res, 'Failed to get backup settings');
  }
});

// PUT /api/backups/settings - Update backup settings
router.put('/settings', (req: Request, res: Response) => {
  try {
    const validation = validate(UpdateBackupSettingsSchema, req.body);
    if (!validation.success) {
      return sendValidationError(res, validation.error, validation.details);
    }

    const settings = store.updateBackupSettings(validation.data);

    // Reschedule based on new settings
    const backupService = getBackupService();
    backupService.scheduleNextBackup();

    sendSuccess(res, settings);
  } catch (error) {
    console.error('Error updating backup settings:', error);
    sendServerError(res, 'Failed to update backup settings');
  }
});

export default router;
