import { useState } from 'react';
import { Category, CategoryInfo } from '../types';
import { addFamily } from '../api';
import CategoryDropdown from './CategoryDropdown';
import './FamilyForm.css';

interface FamilyFormProps {
  onClose: () => void;
  onSuccess: () => void;
  categories: CategoryInfo[];
}

interface FamilyMember {
  firstName: string;
  lastName: string;
}

export default function FamilyForm({ onClose, onSuccess, categories }: FamilyFormProps) {
  const [familyName, setFamilyName] = useState('');
  const [members, setMembers] = useState<FamilyMember[]>([
    { firstName: '', lastName: '' },
  ]);
  const [selectedTags, setSelectedTags] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!familyName.trim()) {
      alert('Please enter a family name');
      return;
    }

    const validMembers = members.filter(
      (m) => m.firstName.trim() && m.lastName.trim()
    );

    if (validMembers.length === 0) {
      alert('Please add at least one family member');
      return;
    }

    setIsSubmitting(true);
    try {
      await addFamily({
        name: familyName.trim(),
        members: validMembers.map((m) => ({
          firstName: m.firstName.trim(),
          lastName: m.lastName.trim(),
          tags: selectedTags,
        })),
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to add family:', error);
      alert('Failed to add family');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addMember = () => {
    setMembers([...members, { firstName: '', lastName: '' }]);
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const updateMember = (index: number, field: keyof FamilyMember, value: string) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    setMembers(updated);
  };


  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Family</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="familyName">Family Name *</label>
            <input
              id="familyName"
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              required
              autoFocus
              placeholder="e.g., Smith Family"
            />
          </div>

          <div className="form-group">
            <label>Family Members *</label>
            {members.map((member, index) => (
              <div key={index} className="member-row">
                <input
                  type="text"
                  placeholder="First name"
                  value={member.firstName}
                  onChange={(e) =>
                    updateMember(index, 'firstName', e.target.value)
                  }
                />
                <input
                  type="text"
                  placeholder="Last name"
                  value={member.lastName}
                  onChange={(e) =>
                    updateMember(index, 'lastName', e.target.value)
                  }
                />
                {members.length > 1 && (
                  <button
                    type="button"
                    className="remove-member"
                    onClick={() => removeMember(index)}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="add-member"
              onClick={addMember}
            >
              + Add Member
            </button>
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
            label="Categories (applied to all members)"
          />

          <div className="form-actions">
            <button type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Family'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
