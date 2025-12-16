import { Router, Request, Response } from 'express';
import { store } from '../store';
import { Guest } from '../../../shared/types/index';
import { capitalizeWords } from '../../../shared/utils/capitalize';

const router = Router();

// Helper function to sort guests by last name
function sortGuests(guests: Guest[]): Guest[] {
  return [...guests].sort((a, b) => 
    a.lastName.localeCompare(b.lastName)
  );
}

// GET /api/guests - Get all guests sorted by last name
router.get('/', (req: Request, res: Response) => {
  const guests = store.getAllGuests();
  const sortedGuests = sortGuests(guests);
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

  // Capitalize names
  const capitalizedFirstName = capitalizeWords(firstName.trim());
  const capitalizedLastName = capitalizeWords(lastName.trim());

  const guest = store.addGuest({
    firstName: capitalizedFirstName,
    lastName: capitalizedLastName,
    familyId: familyId || null,
    tags: tags || [],
  });

  res.status(201).json(guest);
});

// PUT /api/guests/:id - Update a guest
router.put('/:id', (req: Request, res: Response) => {
  const { firstName, lastName, familyId, tags } = req.body;
  
  const updates: Partial<Guest> = {};
  if (firstName !== undefined) updates.firstName = capitalizeWords(firstName.trim());
  if (lastName !== undefined) updates.lastName = capitalizeWords(lastName.trim());
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
