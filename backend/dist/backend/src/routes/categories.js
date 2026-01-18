"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const store_1 = require("../store");
const colors_1 = require("../../../shared/utils/colors");
const capitalize_1 = require("../../../shared/utils/capitalize");
const validation_1 = require("../validation");
const apiResponse_1 = require("../apiResponse");
const router = (0, express_1.Router)();
// GET /api/categories - Get all categories
router.get('/', (req, res) => {
    const categories = store_1.store.getAllCategories();
    (0, apiResponse_1.sendSuccess)(res, categories);
});
// POST /api/categories - Add a new category
router.post('/', (req, res) => {
    const validation = (0, validation_1.validate)(validation_1.CreateCategorySchema, req.body);
    if (!validation.success) {
        return (0, apiResponse_1.sendValidationError)(res, validation.error, validation.details);
    }
    const { name } = validation.data;
    // Capitalize the category name
    const capitalizedName = (0, capitalize_1.capitalizeWords)(name);
    // Check if category already exists
    const existingCategories = store_1.store.getAllCategories();
    if (existingCategories.some(c => c.name.toLowerCase() === capitalizedName.toLowerCase())) {
        return (0, apiResponse_1.sendValidationError)(res, 'Category already exists');
    }
    // Get all existing colors to avoid duplicates
    const existingColors = existingCategories.map(c => c.color);
    const assignedColor = (0, colors_1.getUnusedCategoryColor)(existingColors);
    const category = {
        name: capitalizedName,
        color: assignedColor,
    };
    const added = store_1.store.addCategory(category);
    (0, apiResponse_1.sendCreated)(res, added);
});
// PUT /api/categories/:name - Rename a category
router.put('/:name', (req, res) => {
    const oldName = decodeURIComponent(req.params.name);
    const { name: newName } = req.body;
    if (!newName || typeof newName !== 'string' || !newName.trim()) {
        return (0, apiResponse_1.sendValidationError)(res, 'New category name is required');
    }
    const capitalizedNewName = (0, capitalize_1.capitalizeWords)(newName.trim());
    // Check if old category exists
    const category = store_1.store.getCategory(oldName);
    if (!category) {
        return (0, apiResponse_1.sendNotFound)(res, 'Category');
    }
    // Check if new name already exists (unless it's the same category with different case)
    if (oldName.toLowerCase() !== capitalizedNewName.toLowerCase()) {
        const existingCategories = store_1.store.getAllCategories();
        if (existingCategories.some(c => c.name.toLowerCase() === capitalizedNewName.toLowerCase())) {
            return (0, apiResponse_1.sendValidationError)(res, 'A category with this name already exists');
        }
    }
    const renamed = store_1.store.renameCategory(oldName, capitalizedNewName);
    if (!renamed) {
        return (0, apiResponse_1.sendServerError)(res, 'Failed to rename category');
    }
    (0, apiResponse_1.sendSuccess)(res, renamed);
});
// DELETE /api/categories/:name - Delete a category
router.delete('/:name', (req, res) => {
    const categoryName = decodeURIComponent(req.params.name);
    // Check if category exists
    const category = store_1.store.getCategory(categoryName);
    if (!category) {
        return (0, apiResponse_1.sendNotFound)(res, 'Category');
    }
    // Remove this category from all guests
    const allGuests = store_1.store.getAllGuests();
    allGuests.forEach(guest => {
        if (guest.tags.includes(categoryName)) {
            // Remove the category from guest's tags
            const updatedTags = guest.tags.filter(tag => tag !== categoryName);
            store_1.store.updateGuest(guest.id, { tags: updatedTags });
        }
    });
    // Delete the category
    const deleted = store_1.store.deleteCategory(categoryName);
    if (!deleted) {
        return (0, apiResponse_1.sendServerError)(res, 'Failed to delete category');
    }
    (0, apiResponse_1.sendNoContent)(res);
});
exports.default = router;
