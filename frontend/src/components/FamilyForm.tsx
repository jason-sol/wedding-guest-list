import { useState, useEffect, useRef } from 'react';
import { Category, CategoryInfo, Guest, Event, PermissionLevel } from '../types';
import { addFamily, addGuestToFamily, copyFamily } from '../api';
import CategoryDropdown from './CategoryDropdown';
import './FamilyForm.css';
import './GuestForm.css';

interface EventWithPermission extends Event {
  permission: PermissionLevel;
}

interface FamilyFormProps {
  onClose: () => void;
  onSuccess: () => void;
  categories: CategoryInfo[];
  guests: Guest[];
  eventId: string;
  events?: EventWithPermission[];
}

interface FamilyMember {
  firstName: string;
  lastName: string;
}

export default function FamilyForm({
  onClose,
  onSuccess,
  categories,
  guests,
  eventId,
  events = [],
}: FamilyFormProps) {
  const [familyName, setFamilyName] = useState('');
  const [members, setMembers] = useState<FamilyMember[]>([
    { firstName: '', lastName: '' },
  ]);
  const [selectedExistingGuests, setSelectedExistingGuests] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<Category[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track which members have been manually edited (so we don't overwrite user changes)
  const manuallyEditedMembersRef = useRef<Set<number>>(new Set());

  // Available guests: those not in any family (within this event)
  const availableGuests = guests.filter(g => !g.familyId);

  // Get other events where user has admin access
  const otherAdminEvents = events.filter(
    e => e.id !== eventId && e.permission === 'admin'
  );

  const toggleEvent = (evtId: string) => {
    setSelectedEvents(prev =>
      prev.includes(evtId)
        ? prev.filter(id => id !== evtId)
        : [...prev, evtId]
    );
  };

  // When family name changes, update all new members' last names (unless manually edited)
  useEffect(() => {
    if (familyName.trim()) {
      setMembers(prevMembers =>
        prevMembers.map((member, index) => {
          // Only update if this member hasn't been manually edited
          if (!manuallyEditedMembersRef.current.has(index)) {
            return { ...member, lastName: familyName.trim() };
          }
          return member;
        })
      );
    }
  }, [familyName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!familyName.trim()) {
      alert('Please enter a family name');
      return;
    }

    // Include members that have at least some data entered (not completely empty rows)
    const membersToAdd = members.filter(
      (m) => m.firstName.trim() || m.lastName.trim()
    );

    if (membersToAdd.length === 0 && selectedExistingGuests.length === 0) {
      alert('Please add at least one family member (new or existing)');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create family with new members (if any)
      const newFamily = await addFamily(eventId, {
        name: familyName.trim(),
        members: membersToAdd.map((m) => ({
          firstName: m.firstName.trim(),
          lastName: m.lastName.trim(),
          tags: selectedTags,
        })),
      });

      // Add existing guests to the family
      for (const guestId of selectedExistingGuests) {
        await addGuestToFamily(eventId, newFamily.id, guestId);
      }

      // Copy family to selected other events
      for (const targetEventId of selectedEvents) {
        try {
          await copyFamily(eventId, newFamily.id, targetEventId);
        } catch (err) {
          console.error(`Failed to copy family to event ${targetEventId}:`, err);
        }
      }

      onSuccess();
    } catch (error) {
      console.error('Failed to add family:', error);
      alert('Failed to add family');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addMember = () => {
    // New member gets the family name as last name by default
    setMembers([...members, { firstName: '', lastName: familyName.trim() }]);
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
    // Clean up manually edited tracking for removed member and adjust indices
    const updated = new Set<number>();
    manuallyEditedMembersRef.current.forEach(i => {
      if (i < index) {
        updated.add(i);
      } else if (i > index) {
        updated.add(i - 1);
      }
      // i === index is skipped (removed member)
    });
    manuallyEditedMembersRef.current = updated;
  };

  const updateMember = (index: number, field: keyof FamilyMember, value: string) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    setMembers(updated);

    // If user manually edits the last name, mark this member as manually edited
    if (field === 'lastName') {
      manuallyEditedMembersRef.current.add(index);
    }
  };

  const addExistingGuest = (guestId: string) => {
    if (!selectedExistingGuests.includes(guestId)) {
      setSelectedExistingGuests([...selectedExistingGuests, guestId]);
    }
  };

  const removeExistingGuest = (guestId: string) => {
    setSelectedExistingGuests(selectedExistingGuests.filter(id => id !== guestId));
  };

  const selectedExistingGuestsList = selectedExistingGuests
    .map(id => availableGuests.find(g => g.id === id))
    .filter((g): g is Guest => g !== undefined);


  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Family</h2>
          <button className="close-button" onClick={onClose}>x</button>
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
            <label>Add New Members</label>
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
              + Add New Member
            </button>
          </div>

          <div className="form-group">
            <label>Add Existing Guests</label>
            {availableGuests.length === 0 ? (
              <p className="no-guests-message">No available guests (all guests are already in families)</p>
            ) : (
              <>
                <select
                  className="guest-select"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      addExistingGuest(e.target.value);
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="">Select a guest to add...</option>
                  {availableGuests
                    .filter(g => !selectedExistingGuests.includes(g.id))
                    .map(guest => (
                      <option key={guest.id} value={guest.id}>
                        {guest.firstName} {guest.lastName}
                      </option>
                    ))}
                </select>
                {selectedExistingGuestsList.length > 0 && (
                  <div className="selected-guests-list">
                    {selectedExistingGuestsList.map(guest => (
                      <div key={guest.id} className="selected-guest-item">
                        <span>{guest.firstName} {guest.lastName}</span>
                        <button
                          type="button"
                          className="remove-guest-button"
                          onClick={() => removeExistingGuest(guest.id)}
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
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
            label="Categories (applied to new members only)"
          />

          {otherAdminEvents.length > 0 && (
            <div className="form-group">
              <label>Also add to other events:</label>
              <div className="event-checkboxes">
                {otherAdminEvents.map(event => (
                  <label key={event.id} className="event-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(event.id)}
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
