import { useState } from 'react';
import { Event, PermissionLevel, Guest } from '../types';
import { copyGuest, deleteGuest } from '../api';
import './BulkEventsModal.css';
import './GuestForm.css';

interface EventWithPermission extends Event {
  permission: PermissionLevel;
}

interface BulkEventsModalProps {
  selectedGuests: Guest[];
  events: EventWithPermission[];
  currentEventId: string;
  guestPresenceMap: Record<string, { id: string; name: string }[]>;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkEventsModal({
  selectedGuests,
  events,
  currentEventId,
  guestPresenceMap,
  onClose,
  onSuccess,
}: BulkEventsModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Get all events (including current)
  const allEvents = events.filter(e => e.permission === 'admin');
  const currentEvent = events.find(e => e.id === currentEventId);

  // Calculate which events each guest is in
  const getGuestEventIds = (guestId: string): Set<string> => {
    const presence = guestPresenceMap[guestId] || [];
    const eventIds = new Set(presence.map(e => e.id));
    eventIds.add(currentEventId); // Always in current event
    return eventIds;
  };

  // For each event, check how many selected guests are in it
  const eventStats = allEvents.map(event => {
    const guestsInEvent = selectedGuests.filter(g => {
      const eventIds = getGuestEventIds(g.id);
      return eventIds.has(event.id);
    });
    return {
      event,
      count: guestsInEvent.length,
      total: selectedGuests.length,
      allIn: guestsInEvent.length === selectedGuests.length,
      noneIn: guestsInEvent.length === 0,
    };
  });

  const handleAddToEvent = async (targetEventId: string) => {
    if (targetEventId === currentEventId) return;

    setIsProcessing(true);
    try {
      // Copy guests that aren't already in the target event
      for (const guest of selectedGuests) {
        const eventIds = getGuestEventIds(guest.id);
        if (!eventIds.has(targetEventId)) {
          await copyGuest(currentEventId, guest.id, targetEventId);
        }
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to add guests to event:', error);
      alert('Failed to add some guests to event');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveGuests = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setIsProcessing(true);
    try {
      for (const guest of selectedGuests) {
        await deleteGuest(currentEventId, guest.id);
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to remove guests:', error);
      alert('Failed to remove some guests');
    } finally {
      setIsProcessing(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content bulk-events-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Manage {selectedGuests.length} Selected Guest{selectedGuests.length !== 1 ? 's' : ''}</h2>
          <button className="close-button" onClick={onClose}>x</button>
        </div>

        <div className="bulk-events-content">
          <div className="selected-guests-summary">
            <strong>Selected:</strong>
            <div className="selected-guest-names">
              {selectedGuests.slice(0, 5).map(g => (
                <span key={g.id} className="selected-guest-chip">
                  {g.firstName} {g.lastName}
                </span>
              ))}
              {selectedGuests.length > 5 && (
                <span className="more-guests">+{selectedGuests.length - 5} more</span>
              )}
            </div>
          </div>

          <div className="events-section">
            <h3>Add to Events</h3>
            <p className="section-description">
              Click an event to add all selected guests to it. Guests already in an event will be skipped.
            </p>
            <div className="event-list">
              {eventStats.map(({ event, count, total, allIn }) => (
                <div key={event.id} className="event-row">
                  <div className="event-info">
                    <span className="event-name">
                      {event.name}
                      {event.id === currentEventId && ' (current)'}
                    </span>
                    <span className="event-count">
                      {count}/{total} guests
                    </span>
                  </div>
                  {event.id !== currentEventId && (
                    <button
                      className={`add-to-event-button ${allIn ? 'all-added' : ''}`}
                      onClick={() => handleAddToEvent(event.id)}
                      disabled={isProcessing || allIn}
                    >
                      {allIn ? 'All Added' : `Add ${total - count}`}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="danger-section">
            <h3>Remove from {currentEvent?.name || 'Event'}</h3>
            {!showDeleteConfirm ? (
              <button
                className="remove-guests-button"
                onClick={handleRemoveGuests}
                disabled={isProcessing}
              >
                Remove {selectedGuests.length} Guest{selectedGuests.length !== 1 ? 's' : ''}
              </button>
            ) : (
              <div className="delete-confirm">
                <p>Are you sure you want to remove {selectedGuests.length} guest{selectedGuests.length !== 1 ? 's' : ''} from {currentEvent?.name}?</p>
                <div className="delete-confirm-buttons">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isProcessing}
                  >
                    Cancel
                  </button>
                  <button
                    className="confirm-delete-button"
                    onClick={handleRemoveGuests}
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Removing...' : 'Confirm Remove'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={onClose} disabled={isProcessing}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
