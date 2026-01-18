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

const router = Router();

// GET /api/categories - Get all categories
router.get('/', (req: Request, res: Response) => {
  const categories = store.getAllCategories();
  sendSuccess(res, categories);
});

// POST /api/categories - Add a new category
router.post('/', (req: Request, res: Response) => {
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

// DELETE /api/categories/:name - Delete a category
router.delete('/:name', (req: Request, res: Response) => {
  const categoryName = decodeURIComponent(req.params.name);

  // Check if category exists
  const category = store.getCategory(categoryName);
  if (!category) {
    return sendNotFound(res, 'Category');
  }

  // Remove this category from all guests
  const allGuests = store.getAllGuests();
  allGuests.forEach(guest => {
    if (guest.tags.includes(categoryName)) {
      // Remove the category from guest's tags
      const updatedTags = guest.tags.filter(tag => tag !== categoryName);
      store.updateGuest(guest.id, { tags: updatedTags });
    }
  });

  // Delete the category
  const deleted = store.deleteCategory(categoryName);

  if (!deleted) {
    return sendServerError(res, 'Failed to delete category');
  }

  sendNoContent(res);
});

export default router;
