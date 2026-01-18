import { useState, useEffect } from 'react';
import { Guest, Category, CategoryInfo, Event, PermissionLevel } from '../types';
import { updateGuest, deleteGuest, copyGuest, GuestPresenceInfo } from '../api';
import CategoryDropdown from './CategoryDropdown';
import './GuestForm.css';

interface EventWithPermission extends Event {
  permission: PermissionLevel;
}

interface EditGuestFormProps {
  guest: Guest;
  categories: CategoryInfo[];
  eventId: string;
  onClose: () => void;
  onSuccess: () => void;
  events?: EventWithPermission[];
  guestPresence?: GuestPresenceInfo[];
}

export default function EditGuestForm({
  guest,
  categories,
  eventId,
  onClose,
  onSuccess,
  events = [],
  guestPresence = [],
}: EditGuestFormProps) {
  const [firstName, setFirstName] = useState(guest.firstName);
  const [lastName, setLastName] = useState(guest.lastName);
  const [selectedTags, setSelectedTags] = useState<Category[]>(guest.tags || []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get IDs of events the guest is already in (not including current event)
  const alreadyInEventIds = new Set(guestPresence.map(e => e.id));

  // Get other events where user has admin access
  const otherAdminEvents = events.filter(
    e => e.id !== eventId && e.permission === 'admin'
  );

  // Track which events the guest should be in (initialized from existing presence)
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(() => {
    return new Set(guestPresence.map(e => e.id));
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

  useEffect(() => {
    setFirstName(guest.firstName);
    setLastName(guest.lastName);
    setSelectedTags(guest.tags || []);
    // Reset selected events when guest changes
    setSelectedEventIds(new Set(guestPresence.map(e => e.id)));
  }, [guest, guestPresence]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      alert('Please enter both first and last name');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateGuest(eventId, guest.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        tags: selectedTags,
      });

      // Determine which events to add to and which to remove from
      const eventsToAdd = Array.from(selectedEventIds).filter(id => !alreadyInEventIds.has(id));
      const eventsToRemove = Array.from(alreadyInEventIds).filter(id => !selectedEventIds.has(id));

      // Copy to newly selected events
      for (const targetEventId of eventsToAdd) {
        try {
          await copyGuest(eventId, guest.id, targetEventId);
        } catch (err) {
          console.error(`Failed to copy guest to event ${targetEventId}:`, err);
        }
      }

      // Remove from unselected events using the guestId in that event
      for (const targetEventId of eventsToRemove) {
        try {
          // Find the guest's ID in the target event from presence info
          const presenceInfo = guestPresence.find(p => p.id === targetEventId);
          if (presenceInfo) {
            // Use the guestId from presence info (which is the guest's ID in that specific event)
            await deleteGuest(targetEventId, presenceInfo.guestId);
          }
        } catch (err) {
          console.error(`Failed to remove guest from event ${targetEventId}:`, err);
        }
      }

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
      await deleteGuest(eventId, guest.id);
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
