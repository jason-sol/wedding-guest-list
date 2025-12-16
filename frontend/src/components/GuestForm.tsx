import { useState } from 'react';
import { Category, CategoryInfo } from '../types';
import { addGuest } from '../api';
import CategoryDropdown from './CategoryDropdown';
import './GuestForm.css';

interface GuestFormProps {
  onClose: () => void;
  onSuccess: () => void;
  categories: CategoryInfo[];
}

export default function GuestForm({ onClose, onSuccess, categories }: GuestFormProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedTags, setSelectedTags] = useState<Category[]>([]);
  const [reception, setReception] = useState(false);
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
        reception: reception,
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to add guest:', error);
      alert('Failed to add guest');
    } finally {
      setIsSubmitting(false);
    }
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

          <CategoryDropdown
            categories={categories}
            selectedCategories={selectedTags}
            onSelect={(category) => {
              if (!selectedTags.includes(category)) {
                setSelectedTags([...selectedTags, category]);
              }
            }}
            onRemove={(category) => {
              setSelectedTags(selectedTags.filter(t => t !== category));
            }}
          />

          <div className="form-group">
            <label className="reception-checkbox-pill">
              <input
                type="checkbox"
                checked={reception}
                onChange={(e) => setReception(e.target.checked)}
              />
              <span>Attending Reception</span>
            </label>
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
