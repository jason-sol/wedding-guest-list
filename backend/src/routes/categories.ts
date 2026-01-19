import { Router, Request, Response } from 'express';
import { store } from '../store';
import { CategoryInfo } from '../../../shared/types/index';
import { getUnusedCategoryColor } from '../../../shared/utils/colors';
import { capitalizeWords } from '../../../shared/utils/capitalize';
import { validate, CreateCategorySchema } from '../validation';
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendNotFound,
  sendValidationError,
  sendServerError,
} from '../apiResponse';
import { requireAdminOrOwner } from '../middleware/permissions';

const router = Router();

// GET /api/categories - Get all categories
router.get('/', (req: Request, res: Response) => {
  const categories = store.getAllCategories();
  sendSuccess(res, categories);
});

// POST /api/categories - Add a new category (admin or owner)
router.post('/', requireAdminOrOwner, (req: Request, res: Response) => {
  const validation = validate(CreateCategorySchema, req.body);

  if (!validation.success) {
    return sendValidationError(res, validation.error, validation.details);
  }

  const { name } = validation.data;

  // Capitalize the category name
  const capitalizedName = capitalizeWords(name);

  // Check if category already exists
  const existingCategories = store.getAllCategories();
  if (existingCategories.some(c => c.name.toLowerCase() === capitalizedName.toLowerCase())) {
    return sendValidationError(res, 'Category already exists');
  }

  // Get all existing colors to avoid duplicates
  const existingColors = existingCategories.map(c => c.color);
  const assignedColor = getUnusedCategoryColor(existingColors);

  const category: CategoryInfo = {
    name: capitalizedName,
    color: assignedColor,
  };

  const added = store.addCategory(category);
  sendCreated(res, added);
});

// PUT /api/categories/:name - Rename a category (admin or owner)
router.put('/:name', requireAdminOrOwner, (req: Request, res: Response) => {
  const oldName = decodeURIComponent(req.params.name);
  const { name: newName } = req.body;

  if (!newName || typeof newName !== 'string' || !newName.trim()) {
    return sendValidationError(res, 'New category name is required');
  }

  const capitalizedNewName = capitalizeWords(newName.trim());

  // Check if old category exists
  const category = store.getCategory(oldName);
  if (!category) {
    return sendNotFound(res, 'Category');
  }

  // Check if new name already exists (unless it's the same category with different case)
  if (oldName.toLowerCase() !== capitalizedNewName.toLowerCase()) {
    const existingCategories = store.getAllCategories();
    if (existingCategories.some(c => c.name.toLowerCase() === capitalizedNewName.toLowerCase())) {
      return sendValidationError(res, 'A category with this name already exists');
    }
  }

  const renamed = store.renameCategory(oldName, capitalizedNewName);
  if (!renamed) {
    return sendServerError(res, 'Failed to rename category');
  }

  sendSuccess(res, renamed);
});

// DELETE /api/categories/:name - Delete a category (admin or owner)
router.delete('/:name', requireAdminOrOwner, (req: Request, res: Response) => {
  const categoryName = decodeURIComponent(req.params.name);

  // Check if category exists
  const category = store.getCategory(categoryName);
  if (!category) {
    return sendNotFound(res, 'Category');
  }

  // Use the actual stored category name for comparisons (case-sensitive match)
  const actualName = category.name;

  // Remove this category from all guests
  const allGuests = store.getAllGuests();
  allGuests.forEach(guest => {
    if (guest.tags.includes(actualName)) {
      // Remove the category from guest's tags
      const updatedTags = guest.tags.filter(tag => tag !== actualName);
      store.updateGuest(guest.id, { tags: updatedTags });
    }
  });

  // Delete the category
  const deleted = store.deleteCategory(actualName);

  if (!deleted) {
    return sendServerError(res, 'Failed to delete category');
  }

  sendNoContent(res);
});

export default router;
