import { useState, useEffect } from 'react';
import { Guest, Category, CategoryInfo } from '../types';
import { updateGuest, deleteGuest } from '../api';
import CategoryDropdown from './CategoryDropdown';
import './GuestForm.css';

interface EditGuestFormProps {
  guest: Guest;
  categories: CategoryInfo[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditGuestForm({ guest, categories, onClose, onSuccess }: EditGuestFormProps) {
  const [firstName, setFirstName] = useState(guest.firstName);
  const [lastName, setLastName] = useState(guest.lastName);
  const [selectedTags, setSelectedTags] = useState<Category[]>(guest.tags || []);
  const [reception, setReception] = useState(guest.reception || false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFirstName(guest.firstName);
    setLastName(guest.lastName);
    setSelectedTags(guest.tags || []);
    setReception(guest.reception || false);
  }, [guest]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim() || !lastName.trim()) {
      alert('Please enter both first and last name');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateGuest(guest.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        tags: selectedTags,
        reception: reception,
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to update guest:', error);
      alert('Failed to update guest');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to remove ${guest.firstName} ${guest.lastName}? This action cannot be undone.`
    );
    
    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      await deleteGuest(guest.id);
      onSuccess();
    } catch (error) {
      console.error('Failed to delete guest:', error);
      alert('Failed to delete guest');
      setIsSubmitting(false);
    }
  };


  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Guest</h2>
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
            <button 
              type="button" 
              onClick={handleDelete} 
              disabled={isSubmitting}
              className="delete-guest-button"
            >
              Remove Guest
            </button>
            <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
              <button type="button" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
