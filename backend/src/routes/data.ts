import { Router, Request, Response } from 'express';
import { store } from '../store';
import { validate, ImportDataSchema } from '../validation';
import {
  sendSuccess,
  sendValidationError,
  sendServerError,
} from '../apiResponse';
import { requireOwner } from '../middleware/permissions';

const router = Router();

// GET /api/data/export - Export current data as JSON (owner only)
router.get('/export', requireOwner, (req: Request, res: Response) => {
  try {
    const data = store.getExportData();

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="wedding-guest-list-data.json"');
    res.json(data);
  } catch (error) {
    console.error('Error exporting data:', error);
    sendServerError(res, 'Failed to export data');
  }
});

// POST /api/data/import - Import data from JSON (owner only)
router.post('/import', requireOwner, (req: Request, res: Response) => {
  try {
    // Validate the import data with Zod schema
    const validation = validate(ImportDataSchema, req.body);

    if (!validation.success) {
      return sendValidationError(res, validation.error, validation.details);
    }

    const {
      guests = [],
      families = [],
      categories = [],
      users = [],
      events = [],
      permissions = [],
    } = validation.data;

    // Owner privileges should only come from environment variables
    const sanitizedUsers = users.map(user => ({
      ...user,
      isOwner: false, // Always set to false - owner is configured via env vars
    }));

    // Import data with preserved IDs
    store.importData({
      guests,
      families,
      categories,
      users: sanitizedUsers,
      events,
      permissions,
    });

    sendSuccess(res, {
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
  } catch (error) {
    console.error('Error importing data:', error);
    sendServerError(res, 'Failed to import data');
  }
});

export default router;
