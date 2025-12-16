import { Router, Request, Response } from 'express';
import { store } from '../store';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

const DATA_FILE = path.join(__dirname, '../../data/data.json');

// GET /api/data/export - Export current data as JSON
router.get('/export', (req: Request, res: Response) => {
  try {
    const data = {
      guests: store.getAllGuests(),
      families: store.getAllFamilies(),
      categories: store.getAllCategories(),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="wedding-guest-list-data.json"');
    res.json(data);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// POST /api/data/import - Import data from JSON
router.post('/import', (req: Request, res: Response) => {
  try {
    const { guests, families, categories } = req.body;

    if (!guests || !families || !categories) {
      return res.status(400).json({ error: 'Invalid data format. Expected guests, families, and categories arrays.' });
    }

    if (!Array.isArray(guests) || !Array.isArray(families) || !Array.isArray(categories)) {
      return res.status(400).json({ error: 'guests, families, and categories must be arrays' });
    }

    // Validate data structure (allow guests without last names)
    const validGuests = guests.filter((g: any) => g.id && g.firstName);
    const validFamilies = families.filter((f: any) => f.id && f.name);
    const validCategories = categories.filter((c: any) => c.name && c.color);

    // Import data with preserved IDs
    store.importData({
      guests: validGuests,
      families: validFamilies,
      categories: validCategories,
    });

    res.json({ 
      message: 'Data imported successfully',
      imported: {
        guests: validGuests.length,
        families: validFamilies.length,
        categories: validCategories.length,
      }
    });
  } catch (error) {
    console.error('Error importing data:', error);
    res.status(500).json({ error: 'Failed to import data' });
  }
});

export default router;
