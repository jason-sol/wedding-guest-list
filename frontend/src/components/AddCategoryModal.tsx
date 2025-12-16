import { useState, useMemo } from 'react';
import { CategoryInfo } from '../types';
import { addCategory, deleteCategory } from '../api';
import CategoryTag from './CategoryTag';
import './GuestForm.css';

interface AddCategoryModalProps {
  onClose: () => void;
  onSuccess: () => void;
  categories: CategoryInfo[];
}

export default function AddCategoryModal({ onClose, onSuccess, categories }: AddCategoryModalProps) {
  const [categoryName, setCategoryName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingCategories, setDeletingCategories] = useState<Set<string>>(new Set());

  const handleDeleteCategory = async (categoryName: string) => {
    if (!window.confirm(`Are you sure you want to delete the category "${categoryName}"? This will remove it from all guests.`)) {
      return;
    }

    setDeletingCategories(prev => new Set(prev).add(categoryName));
    try {
      await deleteCategory(categoryName);
      // Refresh categories list but keep modal open
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

  // Check if category already exists (case-insensitive)
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
      // Clear the input field
      setCategoryName('');
      // Refresh categories list but keep modal open
      onSuccess();
    } catch (error) {
      console.error('Failed to add category:', error);
      alert(error instanceof Error ? error.message : 'Failed to add category');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add/Remove Category</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="categoryName">Category Name *</label>
            <input
              id="categoryName"
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              required
              autoFocus
              placeholder="e.g., Work Friends"
              className={isDuplicate ? 'input-error' : ''}
            />
            {isDuplicate && (
              <div className="error-message" style={{ marginTop: '8px', fontSize: '14px', color: '#d32f2f' }}>
                This category already exists
              </div>
            )}
          </div>

          {categories.length > 0 && (
            <div className="form-group">
              <label>Existing Categories (click × to remove)</label>
              <div className="existing-categories">
                {categories.map((cat) => (
                  <div key={cat.name} className="category-item-with-delete">
                    <CategoryTag
                      category={cat.name}
                      categoryInfo={cat}
                    />
                    <button
                      type="button"
                      className="delete-category-button"
                      onClick={() => handleDeleteCategory(cat.name)}
                      disabled={deletingCategories.has(cat.name)}
                      aria-label={`Delete ${cat.name} category`}
                    >
                      {deletingCategories.has(cat.name) ? '...' : '×'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-actions">
            <button type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || isDuplicate}>
              {isSubmitting ? 'Adding...' : 'Add Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
