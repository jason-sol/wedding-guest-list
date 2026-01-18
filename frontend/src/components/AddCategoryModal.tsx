/**
 * Add/Remove Category Modal using MUI Dialog
 * Allows creating new categories, renaming, and deleting existing ones
 */

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  Stack,
  CircularProgress,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import { CategoryInfo } from '../types';
import { addCategory, deleteCategory, renameCategory } from '../api';
import CategoryTag from './CategoryTag';

interface AddCategoryModalProps {
  onClose: () => void;
  onSuccess: () => void;
  categories: CategoryInfo[];
  readOnly?: boolean;
}

export default function AddCategoryModal({ onClose, onSuccess, categories, readOnly = false }: AddCategoryModalProps) {
  const [categoryName, setCategoryName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingCategories, setDeletingCategories] = useState<Set<string>>(new Set());
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const handleDeleteCategory = async (categoryName: string) => {
    if (!window.confirm(`Are you sure you want to delete the category "${categoryName}"? This will remove it from all guests.`)) {
      return;
    }

    setDeletingCategories(prev => new Set(prev).add(categoryName));
    try {
      await deleteCategory(categoryName);
      onSuccess();
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete category');
    } finally {
      setDeletingCategories(prev => {
        const next = new Set(prev);
        next.delete(categoryName);
        return next;
      });
    }
  };

  const handleStartEdit = (cat: CategoryInfo) => {
    setEditingCategory(cat.name);
    setEditName(cat.name);
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setEditName('');
  };

  const handleSaveEdit = async () => {
    if (!editingCategory || !editName.trim()) return;

    // Check if name actually changed
    if (editName.trim().toLowerCase() === editingCategory.toLowerCase()) {
      handleCancelEdit();
      return;
    }

    // Check for duplicate
    const normalizedNewName = editName.trim().toLowerCase();
    if (categories.some(cat =>
      cat.name.toLowerCase() === normalizedNewName &&
      cat.name !== editingCategory
    )) {
      alert('A category with this name already exists');
      return;
    }

    setIsRenaming(true);
    try {
      await renameCategory(editingCategory, editName.trim());
      setEditingCategory(null);
      setEditName('');
      onSuccess();
    } catch (error) {
      console.error('Failed to rename category:', error);
      alert(error instanceof Error ? error.message : 'Failed to rename category');
    } finally {
      setIsRenaming(false);
    }
  };

  const isDuplicate = useMemo(() => {
    if (!categoryName.trim()) return false;
    const normalizedInput = categoryName.trim().toLowerCase();
    return categories.some(cat => cat.name.toLowerCase() === normalizedInput);
  }, [categoryName, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!categoryName.trim()) {
      alert('Please enter a category name');
      return;
    }

    if (isDuplicate) {
      alert('This category already exists. Please choose a different name.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addCategory(categoryName);
      setCategoryName('');
      onSuccess();
    } catch (error) {
      console.error('Failed to add category:', error);
      alert(error instanceof Error ? error.message : 'Failed to add category');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sort categories alphabetically
  const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, maxHeight: '80vh', display: 'flex', flexDirection: 'column' },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, flexShrink: 0 }}>
        <Typography variant="h6" fontWeight={600}>
          {readOnly ? 'View Categories' : 'Manage Categories'}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
        {/* Fixed input section at top */}
        {!readOnly && (
          <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
            <TextField
              fullWidth
              id="categoryName"
              label="New Category Name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              required
              autoFocus
              placeholder="e.g., Work Friends"
              error={isDuplicate}
              helperText={isDuplicate ? 'This category already exists' : ''}
              disabled={isSubmitting}
            />
          </Box>
        )}

        {/* Scrollable categories list */}
        <DialogContent sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {sortedCategories.length > 0 ? (
            <Box>
              <Typography variant="body2" fontWeight={500} color="text.secondary" sx={{ mb: 1.5 }}>
                Existing Categories
              </Typography>
              <Stack spacing={1}>
                {sortedCategories.map((cat) => (
                  <Box
                    key={cat.name}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: 'action.hover',
                    }}
                  >
                    {editingCategory === cat.name ? (
                      // Edit mode
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                        <TextField
                          size="small"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          disabled={isRenaming}
                          autoFocus
                          sx={{ flex: 1 }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveEdit();
                            } else if (e.key === 'Escape') {
                              handleCancelEdit();
                            }
                          }}
                        />
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={handleSaveEdit}
                          disabled={isRenaming || !editName.trim()}
                        >
                          {isRenaming ? <CircularProgress size={18} /> : <CheckIcon fontSize="small" />}
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={handleCancelEdit}
                          disabled={isRenaming}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ) : (
                      // View mode
                      <>
                        <CategoryTag category={cat.name} categoryInfo={cat} />
                        {!readOnly && (
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleStartEdit(cat)}
                              disabled={deletingCategories.has(cat.name) || editingCategory !== null}
                              aria-label={`Edit ${cat.name} category`}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteCategory(cat.name)}
                              disabled={deletingCategories.has(cat.name) || editingCategory !== null}
                              aria-label={`Delete ${cat.name} category`}
                            >
                              {deletingCategories.has(cat.name) ? (
                                <CircularProgress size={18} color="inherit" />
                              ) : (
                                <DeleteIcon fontSize="small" />
                              )}
                            </IconButton>
                          </Box>
                        )}
                      </>
                    )}
                  </Box>
                ))}
              </Stack>
            </Box>
          ) : (
            <Alert severity="info">
              No categories have been created yet.
            </Alert>
          )}
        </DialogContent>

        {/* Fixed buttons at bottom */}
        <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
          <Button onClick={onClose} disabled={isSubmitting}>
            {readOnly ? 'Close' : 'Cancel'}
          </Button>
          {!readOnly && (
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting || isDuplicate || !categoryName.trim()}
            >
              {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Add Category'}
            </Button>
          )}
        </DialogActions>
      </Box>
    </Dialog>
  );
}
