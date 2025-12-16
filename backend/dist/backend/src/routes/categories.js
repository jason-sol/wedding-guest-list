"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const store_1 = require("../store");
const colors_1 = require("../../../shared/utils/colors");
const capitalize_1 = require("../../../shared/utils/capitalize");
const router = (0, express_1.Router)();
// GET /api/categories - Get all categories
router.get('/', (req, res) => {
    const categories = store_1.store.getAllCategories();
    res.json(categories);
});
// POST /api/categories - Add a new category
router.post('/', (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({
            error: 'Category name is required'
        });
    }
    // Capitalize the category name
    const capitalizedName = (0, capitalize_1.capitalizeWords)(name.trim());
    // Check if category already exists
    const existingCategories = store_1.store.getAllCategories();
    if (existingCategories.some(c => c.name.toLowerCase() === capitalizedName.toLowerCase())) {
        return res.status(400).json({
            error: 'Category already exists'
        });
    }
    // Get all existing colors to avoid duplicates
    const existingColors = existingCategories.map(c => c.color);
    const assignedColor = (0, colors_1.getUnusedCategoryColor)(existingColors);
    const category = {
        name: capitalizedName,
        color: assignedColor,
    };
    const added = store_1.store.addCategory(category);
    res.status(201).json(added);
});
// DELETE /api/categories/:name - Delete a category
router.delete('/:name', (req, res) => {
    const categoryName = decodeURIComponent(req.params.name);
    // Check if category exists
    const category = store_1.store.getCategory(categoryName);
    if (!category) {
        return res.status(404).json({ error: 'Category not found' });
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
        return res.status(500).json({ error: 'Failed to delete category' });
    }
    res.status(204).send();
});
exports.default = router;
