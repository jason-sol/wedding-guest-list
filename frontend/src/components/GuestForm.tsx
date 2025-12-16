import { useState } from 'react';
import { Category, CATEGORIES } from '../types';
import { addGuest } from '../api';
import CategoryTag from './CategoryTag';
import './GuestForm.css';

interface GuestFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function GuestForm({ onClose, onSuccess }: GuestFormProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedTags, setSelectedTags] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim() || !lastName.trim()) {
      alert('Please enter both first and last name');
      return;
    }

    setIsSubmitting(true);
    try {
      await addGuest({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        familyId: null,
        tags: selectedTags,
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to add guest:', error);
      alert('Failed to add guest');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTag = (tag: Category) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Guest</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="firstName">First Name *</label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="lastName">Last Name *</label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Categories</label>
            <div className="category-selector">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`category-option ${
                    selectedTags.includes(category) ? 'selected' : ''
                  }`}
                  onClick={() => toggleTag(category)}
                >
                  {category}
                </button>
              ))}
            </div>
            {selectedTags.length > 0 && (
              <div className="selected-tags">
                {selectedTags.map((tag) => (
                  <CategoryTag
                    key={tag}
                    category={tag}
                    removable
                    onRemove={() => toggleTag(tag)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Guest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
