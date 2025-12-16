import { useState, useEffect } from 'react';
import { Family, Guest, Category, CategoryInfo } from '../types';
import { updateFamily, reorderFamilyMembers, addGuestToFamily, removeGuestFromFamily, updateGuest, deleteFamily, deleteGuest } from '../api';
import CategoryDropdown from './CategoryDropdown';
import './EditFamilyForm.css';
import './GuestForm.css';

interface EditFamilyFormProps {
  family: Family;
  familyGuests: Guest[];
  allGuests: Guest[];
  categories: CategoryInfo[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditFamilyForm({
  family,
  familyGuests,
  allGuests,
  categories,
  onClose,
  onSuccess,
}: EditFamilyFormProps) {
  const [familyName, setFamilyName] = useState(family.name);
  const [orderedMemberIds, setOrderedMemberIds] = useState<string[]>(family.members);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMembers, setDeleteMembers] = useState(false);
  const [memberReception, setMemberReception] = useState<Map<string, boolean>>(new Map());
  const [familyReception, setFamilyReception] = useState(false);

  // Sync state with family prop when it changes
  useEffect(() => {
    setFamilyName(family.name);
    setOrderedMemberIds(family.members);
  }, [family.name, family.members]);

  // Initialize categories with common categories from all family members
  useEffect(() => {
    if (familyGuests.length > 0) {
      // Get categories that all members have in common
      const commonCategories = familyGuests[0].tags.filter(tag =>
        familyGuests.every(guest => guest.tags.includes(tag))
      );
      setSelectedCategories(commonCategories);
      
      // Initialize reception status from guests
      const receptionMap = new Map<string, boolean>();
      familyGuests.forEach(guest => {
        receptionMap.set(guest.id, guest.reception || false);
      });
      setMemberReception(receptionMap);
      
      // Check if all members have reception
      const allHaveReception = familyGuests.every(guest => guest.reception === true);
      setFamilyReception(allHaveReception);
    } else {
      setSelectedCategories([]);
      setMemberReception(new Map());
      setFamilyReception(false);
    }
  }, [familyGuests]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!familyName.trim()) {
      alert('Please enter a family name');
      return;
    }

    setIsSubmitting(true);
    try {
      // Find newly added members and removed members
      const originalMemberIds = new Set(family.members);
      const newMemberIds = new Set(orderedMemberIds);
      
      const addedMembers = orderedMemberIds.filter(id => !originalMemberIds.has(id));
      const removedMembers = family.members.filter(id => !newMemberIds.has(id));

      // Remove guests from family
      for (const guestId of removedMembers) {
        await removeGuestFromFamily(family.id, guestId);
      }

      // Add new guests to family
      for (const guestId of addedMembers) {
        await addGuestToFamily(family.id, guestId);
      }

      // Update family name
      const updates: Partial<Family> = {
        name: familyName.trim(),
      };

      await updateFamily(family.id, updates);

      // Reorder members if order changed
      if (JSON.stringify(orderedMemberIds) !== JSON.stringify(family.members)) {
        await reorderFamilyMembers(family.id, orderedMemberIds);
      }

      // Apply selected categories and reception status to all family members
      // Get the final list of members after all changes
      const finalMemberIds = orderedMemberIds;
      for (const guestId of finalMemberIds) {
        const guest = allGuests.find(g => g.id === guestId);
        if (guest) {
          // Merge selected categories with existing tags, removing duplicates
          // Selected categories are added/kept, but individual tags are preserved
          const updatedTags = Array.from(new Set([...selectedCategories, ...guest.tags]));
          // Get reception status: family-wide setting or individual member setting
          const receptionStatus = familyReception || memberReception.get(guestId) || false;
          await updateGuest(guestId, { tags: updatedTags, reception: receptionStatus });
        }
      }

      onSuccess();
    } catch (error) {
      console.error('Failed to update family:', error);
      alert('Failed to update family');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;

    if (draggedIndex !== index) {
      const newOrder = [...orderedMemberIds];
      const draggedItem = newOrder[draggedIndex];
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(index, 0, draggedItem);
      setOrderedMemberIds(newOrder);
      setDraggedIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const removeMember = (guestId: string) => {
    setOrderedMemberIds(orderedMemberIds.filter(id => id !== guestId));
  };

  const addMember = (guestId: string) => {
    if (!orderedMemberIds.includes(guestId)) {
      setOrderedMemberIds([...orderedMemberIds, guestId]);
    }
  };

  const handleDeleteFamily = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setIsSubmitting(true);
    try {
      if (deleteMembers) {
        // Delete all family members
        for (const guestId of family.members) {
          await deleteGuest(guestId);
        }
      }
      
      // Delete the family (this will set familyId to null for remaining members)
      await deleteFamily(family.id);
      onSuccess();
    } catch (error) {
      console.error('Failed to delete family:', error);
      alert('Failed to delete family');
      setIsSubmitting(false);
      setShowDeleteConfirm(false);
    }
  };

  const orderedMembers = orderedMemberIds
    .map(id => familyGuests.find(g => g.id === id))
    .filter((g): g is Guest => g !== undefined);

  // Available guests: those not in any family, or already in this family
  const availableGuests = allGuests.filter(
    g => !g.familyId || g.familyId === family.id
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content edit-family-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Family</h2>
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
            />
          </div>

          <div className="form-group">
            <label>Family Members (drag to reorder)</label>
            <div className="member-list">
              {orderedMembers.length === 0 ? (
                <p className="no-members">No members in this family</p>
              ) : (
                orderedMembers.map((guest, index) => (
                  <div
                    key={guest.id}
                    className={`member-item ${draggedIndex === index ? 'dragging' : ''}`}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    <span className="drag-handle">☰</span>
                    <span className="member-name">
                      {guest.firstName} {guest.lastName}
                    </span>
                    <label className="reception-checkbox-pill" style={{ marginLeft: 'auto', marginRight: '8px' }}>
                      <input
                        type="checkbox"
                        checked={familyReception || memberReception.get(guest.id) || false}
                        onChange={(e) => {
                          if (familyReception) {
                            // If family-wide is checked, uncheck it and set individual
                            setFamilyReception(false);
                          }
                          const updated = new Map(memberReception);
                          updated.set(guest.id, e.target.checked);
                          setMemberReception(updated);
                        }}
                      />
                      <span>Reception</span>
                    </label>
                    <button
                      type="button"
                      className="remove-member-btn"
                      onClick={() => removeMember(guest.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Add Member</label>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  addMember(e.target.value);
                  e.target.value = '';
                }
              }}
            >
              <option value="">Select a guest to add...</option>
              {availableGuests
                .filter(g => !orderedMemberIds.includes(g.id))
                .map(guest => (
                  <option key={guest.id} value={guest.id}>
                    {guest.firstName} {guest.lastName}
                  </option>
                ))}
            </select>
          </div>

          <CategoryDropdown
            categories={categories}
            selectedCategories={selectedCategories}
            onSelect={(category) => {
              if (!selectedCategories.includes(category)) {
                setSelectedCategories([...selectedCategories, category]);
              }
            }}
            onRemove={(category) => {
              setSelectedCategories(selectedCategories.filter(t => t !== category));
            }}
            label="Categories (applied to all family members)"
          />

          <div className="form-group">
            <label className="reception-checkbox-pill">
              <input
                type="checkbox"
                checked={familyReception}
                onChange={(e) => {
                  setFamilyReception(e.target.checked);
                  // Apply to all members
                  if (e.target.checked) {
                    const updated = new Map<string, boolean>();
                    orderedMemberIds.forEach(id => updated.set(id, true));
                    setMemberReception(updated);
                  }
                }}
              />
              <span>All family members attending Reception</span>
            </label>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '8px', marginLeft: '0' }}>
              Check this to set reception for all members. You can override individual members above.
            </p>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              onClick={handleDeleteFamily} 
              disabled={isSubmitting}
              className="delete-family-button"
            >
              Remove Family
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

        {showDeleteConfirm && (
          <div className="delete-confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
            <div className="delete-confirm-dialog" onClick={(e) => e.stopPropagation()}>
              <h3>Remove Family</h3>
              <p>Are you sure you want to remove the "{family.name}" family?</p>
              <div className="delete-confirm-options">
                <label>
                  <input
                    type="checkbox"
                    checked={deleteMembers}
                    onChange={(e) => setDeleteMembers(e.target.checked)}
                  />
                  <span>Also remove all family members</span>
                </label>
                <p className="delete-confirm-note">
                  {deleteMembers 
                    ? 'All family members will be permanently deleted.' 
                    : 'Family members will be kept but removed from the family grouping.'}
                </p>
              </div>
              <div className="delete-confirm-actions">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteMembers(false);
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={handleDeleteFamily}
                  disabled={isSubmitting}
                  className="delete-confirm-button"
                >
                  {isSubmitting ? 'Removing...' : 'Remove Family'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
