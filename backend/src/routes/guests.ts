import { Router, Request, Response } from 'express';
import { store } from '../store';
import { Guest, Category, SortOption } from '../../../shared/types/index';

const router = Router();

// Helper function to sort guests
function sortGuests(guests: Guest[], sortBy: SortOption): Guest[] {
  const sorted = [...guests];
  
  switch (sortBy) {
    case 'firstName':
      return sorted.sort((a, b) => 
        a.firstName.localeCompare(b.firstName)
      );
    case 'lastName':
      return sorted.sort((a, b) => 
        a.lastName.localeCompare(b.lastName)
      );
    case 'category':
      return sorted.sort((a, b) => {
        // Sort by first category tag, then by last name
        const aFirstTag = a.tags[0] || '';
        const bFirstTag = b.tags[0] || '';
        const tagCompare = aFirstTag.localeCompare(bFirstTag);
        if (tagCompare !== 0) return tagCompare;
        return a.lastName.localeCompare(b.lastName);
      });
    default:
      return sorted;
  }
}

// GET /api/guests - Get all guests with optional sorting
router.get('/', (req: Request, res: Response) => {
  const sortBy = (req.query.sortBy as SortOption) || 'lastName';
  const guests = store.getAllGuests();
  const sortedGuests = sortGuests(guests, sortBy);
  res.json(sortedGuests);
});

// GET /api/guests/:id - Get a specific guest
router.get('/:id', (req: Request, res: Response) => {
  const guest = store.getGuest(req.params.id);
  if (!guest) {
    return res.status(404).json({ error: 'Guest not found' });
  }
  res.json(guest);
});

// POST /api/guests - Add a new guest
router.post('/', (req: Request, res: Response) => {
  const { firstName, lastName, familyId, tags } = req.body;

  if (!firstName || !lastName) {
    return res.status(400).json({ 
      error: 'First name and last name are required' 
    });
  }

  const guest = store.addGuest({
    firstName,
    lastName,
    familyId: familyId || null,
    tags: tags || [],
  });

  res.status(201).json(guest);
});

// PUT /api/guests/:id - Update a guest
router.put('/:id', (req: Request, res: Response) => {
  const { firstName, lastName, familyId, tags } = req.body;
  
  const updates: Partial<Guest> = {};
  if (firstName !== undefined) updates.firstName = firstName;
  if (lastName !== undefined) updates.lastName = lastName;
  if (familyId !== undefined) updates.familyId = familyId;
  if (tags !== undefined) updates.tags = tags;

  const updated = store.updateGuest(req.params.id, updates);
  
  if (!updated) {
    return res.status(404).json({ error: 'Guest not found' });
  }

  res.json(updated);
});

// DELETE /api/guests/:id - Delete a guest
router.delete('/:id', (req: Request, res: Response) => {
  const deleted = store.deleteGuest(req.params.id);
  
  if (!deleted) {
    return res.status(404).json({ error: 'Guest not found' });
  }

  res.status(204).send();
});

export default router;
