import { useState } from 'react';
import { Category, CategoryInfo, Event, PermissionLevel } from '../types';
import { addGuest, copyGuest } from '../api';
import CategoryDropdown from './CategoryDropdown';
import './GuestForm.css';

interface EventWithPermission extends Event {
  permission: PermissionLevel;
}

interface GuestFormProps {
  onClose: () => void;
  onSuccess: () => void;
  categories: CategoryInfo[];
  eventId: string;
  events?: EventWithPermission[];
  currentEventName?: string;
}

export default function GuestForm({
  onClose,
  onSuccess,
  categories,
  eventId,
  events = [],
}: GuestFormProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedTags, setSelectedTags] = useState<Category[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get other events where user has admin access
  const otherAdminEvents = events.filter(
    e => e.id !== eventId && e.permission === 'admin'
  );

  const toggleEvent = (eventId: string) => {
    setSelectedEvents(prev =>
      prev.includes(eventId)
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    try {
      // Create guest in current event
      const newGuest = await addGuest(eventId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        familyId: null,
        tags: selectedTags,
      });

      // Copy to selected other events
      for (const targetEventId of selectedEvents) {
        try {
          await copyGuest(eventId, newGuest.id, targetEventId);
        } catch (err) {
          console.error(`Failed to copy guest to event ${targetEventId}:`, err);
        }
      }

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
          <button className="close-button" onClick={onClose}>x</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="firstName">First Name</label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Optional"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="lastName">Last Name</label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Optional"
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
              {isSubmitting ? 'Adding...' : 'Add Guest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
