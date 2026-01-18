import { useState } from 'react';
import { Event } from '../types';
import { updateEvent, deleteEvent, reconstructFamilies } from '../api';
import './EventSettings.css';

interface EventSettingsProps {
  event: Event;
  events: Event[];
  onClose: () => void;
  onSuccess: () => void;
  onEventDeleted: () => void;
}

export default function EventSettings({
  event,
  events,
  onClose,
  onSuccess,
  onEventDeleted,
}: EventSettingsProps) {
  const [eventName, setEventName] = useState(event.name);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sourceEventId, setSourceEventId] = useState('');
  const [isReconstructing, setIsReconstructing] = useState(false);

  // Other events to use as source for family reconstruction
  const otherEvents = events.filter(e => e.id !== event.id);

  const handleReconstructFamilies = async () => {
    if (!sourceEventId) {
      alert('Please select a source event');
      return;
    }

    setIsReconstructing(true);
    try {
      const result = await reconstructFamilies(event.id, sourceEventId);
      alert(`${result.message}\nFamilies created: ${result.familiesCreated}\nGuests updated: ${result.guestsUpdated}`);
      onSuccess();
    } catch (err) {
      console.error('Failed to reconstruct families:', err);
      alert(err instanceof Error ? err.message : 'Failed to reconstruct families');
    } finally {
      setIsReconstructing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!eventName.trim()) {
      alert('Please enter an event name');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateEvent(event.id, { name: eventName.trim() });
      onSuccess();
    } catch (err) {
      console.error('Failed to update event:', err);
      alert(err instanceof Error ? err.message : 'Failed to update event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteEvent(event.id);
      onEventDeleted();
    } catch (err) {
      console.error('Failed to delete event:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete event');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content event-settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Event Settings</h2>
          <button className="close-button" onClick={onClose}>x</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="eventName">Event Name *</label>
            <input
              id="eventName"
              type="text"
              value={eventName}
              onChange={e => setEventName(e.target.value)}
              required
              autoFocus
            />
          </div>

          {otherEvents.length > 0 && (
            <div className="form-group reconstruct-section">
              <label>Reconstruct Families</label>
              <p className="help-text">
                If guests were copied to this event without their family groupings,
                you can reconstruct them based on another event's families.
              </p>
              <div className="reconstruct-controls">
                <select
                  value={sourceEventId}
                  onChange={e => setSourceEventId(e.target.value)}
                  disabled={isReconstructing}
                >
                  <option value="">Select source event...</option>
                  {otherEvents.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleReconstructFamilies}
                  disabled={isReconstructing || !sourceEventId}
                  className="reconstruct-button"
                >
                  {isReconstructing ? 'Reconstructing...' : 'Reconstruct'}
                </button>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="delete-event-button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSubmitting}
            >
              Delete Event
            </button>
            <div className="form-actions-right">
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
            <div className="delete-confirm-dialog" onClick={e => e.stopPropagation()}>
              <h3>Delete Event</h3>
              <p>Are you sure you want to delete "{event.name}"?</p>
              <p className="delete-warning">
                This will permanently delete all guests and families in this event. This action cannot be undone.
              </p>
              <div className="delete-confirm-actions">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="confirm-delete-button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete Event'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
