import { Router, Request, Response } from 'express';
import { store } from '../store';
import { Family, Guest } from '../../../shared/types/index';
import { capitalizeWords } from '../../../shared/utils/capitalize';

const router = Router();

// GET /api/families - Get all families
router.get('/', (req: Request, res: Response) => {
  const families = store.getAllFamilies();
  res.json(families);
});

// GET /api/families/:id - Get a specific family
router.get('/:id', (req: Request, res: Response) => {
  const family = store.getFamily(req.params.id);
  if (!family) {
    return res.status(404).json({ error: 'Family not found' });
  }
  res.json(family);
});

// POST /api/families - Create a new family with members
router.post('/', (req: Request, res: Response) => {
  const { name, members } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Family name is required' });
  }

  // If members are provided as guest data, create guests first
  const memberIds: string[] = [];
  if (Array.isArray(members)) {
    for (const member of members) {
      if (typeof member === 'object' && member.firstName && member.lastName) {
        // Create guest and add to family (capitalize names)
        const guest = store.addGuest({
          firstName: capitalizeWords(member.firstName.trim()),
          lastName: capitalizeWords(member.lastName.trim()),
          familyId: null, // Will be set after family is created
          tags: member.tags || [],
        });
        memberIds.push(guest.id);
      } else if (typeof member === 'string') {
        // Assume it's an existing guest ID
        memberIds.push(member);
      }
    }
  }

  const family = store.addFamily({
    name: capitalizeWords(name.trim()),
    members: memberIds,
  });

  // Update guests to reference this family
  memberIds.forEach(guestId => {
    store.updateGuest(guestId, { familyId: family.id });
  });

  res.status(201).json(family);
});

// PUT /api/families/:id - Update a family
router.put('/:id', (req: Request, res: Response) => {
  const { name, members } = req.body;
  
  const updates: Partial<Family> = {};
  if (name !== undefined) updates.name = capitalizeWords(name.trim());
  if (members !== undefined) updates.members = members;

  const updated = store.updateFamily(req.params.id, updates);
  
  if (!updated) {
    return res.status(404).json({ error: 'Family not found' });
  }

  res.json(updated);
});

// POST /api/families/:id/members - Add a guest to a family
router.post('/:id/members', (req: Request, res: Response) => {
  const { guestId } = req.body;
  
  if (!guestId) {
    return res.status(400).json({ error: 'guestId is required' });
  }

  const family = store.getFamily(req.params.id);
  if (!family) {
    return res.status(404).json({ error: 'Family not found' });
  }

  const guest = store.getGuest(guestId);
  if (!guest) {
    return res.status(404).json({ error: 'Guest not found' });
  }

  // Add guest to family members if not already present
  if (!family.members.includes(guestId)) {
    store.updateFamily(family.id, {
      members: [...family.members, guestId],
    });
  }

  // Update guest to reference family
  store.updateGuest(guestId, { familyId: family.id });

  const updatedFamily = store.getFamily(family.id);
  res.json(updatedFamily);
});

// DELETE /api/families/:id/members/:guestId - Remove a guest from a family
router.delete('/:id/members/:guestId', (req: Request, res: Response) => {
  const family = store.getFamily(req.params.id);
  if (!family) {
    return res.status(404).json({ error: 'Family not found' });
  }

  const guestId = req.params.guestId;
  const updatedMembers = family.members.filter(id => id !== guestId);
  
  store.updateFamily(family.id, { members: updatedMembers });
  store.updateGuest(guestId, { familyId: null });

  const updatedFamily = store.getFamily(family.id);
  res.json(updatedFamily);
});

// DELETE /api/families/:id - Delete a family
router.delete('/:id', (req: Request, res: Response) => {
  const family = store.getFamily(req.params.id);
  if (!family) {
    return res.status(404).json({ error: 'Family not found' });
  }

  // Remove family reference from all members
  family.members.forEach(guestId => {
    store.updateGuest(guestId, { familyId: null });
  });

  const deleted = store.deleteFamily(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Family not found' });
  }

  res.status(204).send();
});

export default router;
