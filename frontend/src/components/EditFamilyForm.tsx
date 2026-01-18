import { useState, useEffect, useMemo, useRef } from 'react';
import { Family, Guest, Category, CategoryInfo, Event, PermissionLevel } from '../types';
import { updateFamily, reorderFamilyMembers, addGuestToFamily, removeGuestFromFamily, updateGuest, deleteFamily, deleteGuest, copyFamily, GuestPresenceMap } from '../api';
import CategoryDropdown from './CategoryDropdown';
import './EditFamilyForm.css';
import './GuestForm.css';

interface EventWithPermission extends Event {
  permission: PermissionLevel;
}

interface EditFamilyFormProps {
  family: Family;
  familyGuests: Guest[];
  allGuests: Guest[];
  categories: CategoryInfo[];
  eventId: string;
  onClose: () => void;
  onSuccess: () => void;
  events?: EventWithPermission[];
  guestPresenceMap?: GuestPresenceMap;
}

export default function EditFamilyForm({
  family,
  familyGuests,
  allGuests,
  categories,
  eventId,
  onClose,
  onSuccess,
  events = [],
  guestPresenceMap = {},
}: EditFamilyFormProps) {
  const [familyName, setFamilyName] = useState(family.name);
  const [orderedMemberIds, setOrderedMemberIds] = useState<string[]>(family.members);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMembers, setDeleteMembers] = useState(false);

  // Get other events where user has admin access
  const otherAdminEvents = useMemo(() =>
    events.filter(e => e.id !== eventId && e.permission === 'admin'),
    [events, eventId]
  );

  // Calculate which events ALL family members are currently in (only on mount)
  // Use a ref to store the original state so it doesn't change during the modal's lifetime
  const originalEventsRef = useRef<Set<string> | null>(null);
  const originalCategoriesRef = useRef<string[] | null>(null);

  // Calculate original common categories on first render
  if (originalCategoriesRef.current === null) {
    if (familyGuests.length > 0) {
      originalCategoriesRef.current = familyGuests[0].tags.filter(tag =>
        familyGuests.every(guest => guest.tags.includes(tag))
      );
    } else {
      originalCategoriesRef.current = [];
    }
  }

  if (originalEventsRef.current === null) {
    // Calculate on first render only
    const eventIds = new Set<string>();
    if (familyGuests.length > 0) {
      const adminEvents = events.filter(e => e.id !== eventId && e.permission === 'admin');
      for (const event of adminEvents) {
        const allMembersInEvent = familyGuests.every(guest => {
          const presence = guestPresenceMap[guest.id] || [];
          return presence.some(p => p.id === event.id);
        });
        if (allMembersInEvent) {
          eventIds.add(event.id);
        }
      }
    }
    originalEventsRef.current = eventIds;
  }

  // Track which events the family should be in (initialized from presence)
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(() => {
    // Calculate initial state inline
    if (familyGuests.length === 0) return new Set<string>();

    const eventIds = new Set<string>();
    const adminEvents = events.filter(e => e.id !== eventId && e.permission === 'admin');

    for (const event of adminEvents) {
      const allMembersInEvent = familyGuests.every(guest => {
        const presence = guestPresenceMap[guest.id] || [];
        return presence.some(p => p.id === event.id);
      });
      if (allMembersInEvent) {
        eventIds.add(event.id);
      }
    }
    return eventIds;
  });

  const toggleEvent = (evtId: string) => {
    setSelectedEventIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(evtId)) {
        newSet.delete(evtId);
      } else {
        newSet.add(evtId);
      }
      return newSet;
    });
  };

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
    } else {
      setSelectedCategories([]);
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
        await removeGuestFromFamily(eventId, family.id, guestId);
      }

      // Add new guests to family
      for (const guestId of addedMembers) {
        await addGuestToFamily(eventId, family.id, guestId);
      }

      // Update family name
      const updates: Partial<Family> = {
        name: familyName.trim(),
      };

      await updateFamily(eventId, family.id, updates);

      // Reorder members if order changed
      if (JSON.stringify(orderedMemberIds) !== JSON.stringify(family.members)) {
        await reorderFamilyMembers(eventId, family.id, orderedMemberIds);
      }

      // Apply selected categories to all family members
      // Get the final list of members after all changes
      const finalMemberIds = orderedMemberIds;
      const originalCategories = originalCategoriesRef.current || [];

      // Find categories that were removed (were in original but not in selected)
      const removedCategories = originalCategories.filter(cat => !selectedCategories.includes(cat));
      // Find categories that were added (in selected but not in original)
      const addedCategories = selectedCategories.filter(cat => !originalCategories.includes(cat));

      for (const guestId of finalMemberIds) {
        const guest = allGuests.find(g => g.id === guestId);
        if (guest) {
          // Start with existing tags
          let updatedTags = [...guest.tags];

          // Remove categories that were unchecked
          updatedTags = updatedTags.filter(tag => !removedCategories.includes(tag));

          // Add categories that were checked
          for (const cat of addedCategories) {
            if (!updatedTags.includes(cat)) {
              updatedTags.push(cat);
            }
          }

          await updateGuest(eventId, guestId, { tags: updatedTags });
        }
      }

      // Determine which events to add to and which to remove from
      const originalEvents = originalEventsRef.current || new Set<string>();
      const eventsToAdd = Array.from(selectedEventIds).filter(id => !originalEvents.has(id));
      const eventsToRemove = Array.from(originalEvents).filter(id => !selectedEventIds.has(id));

      // Copy family to newly selected events
      for (const targetEventId of eventsToAdd) {
        try {
          await copyFamily(eventId, family.id, targetEventId);
        } catch (err) {
          console.error(`Failed to copy family to event ${targetEventId}:`, err);
        }
      }

      // Remove family members from unselected events
      for (const targetEventId of eventsToRemove) {
        try {
          // For each family member, find their guestId in the target event and delete
          for (const guest of familyGuests) {
            const presence = guestPresenceMap[guest.id] || [];
            const presenceInfo = presence.find(p => p.id === targetEventId);
            if (presenceInfo) {
              await deleteGuest(targetEventId, presenceInfo.guestId);
            }
          }
        } catch (err) {
          console.error(`Failed to remove family from event ${targetEventId}:`, err);
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
          await deleteGuest(eventId, guestId);
        }
      }

      // Delete the family (this will set familyId to null for remaining members)
      await deleteFamily(eventId, family.id);
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

          {otherAdminEvents.length > 0 && (
            <div className="form-group">
              <label>Event Invitations:</label>
              <div className="event-checkboxes">
                {otherAdminEvents.map(event => (
                  <label key={event.id} className="event-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedEventIds.has(event.id)}
                      onChange={() => toggleEvent(event.id)}
                      disabled={isSubmitting}
                    />
                    <span>{event.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

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
