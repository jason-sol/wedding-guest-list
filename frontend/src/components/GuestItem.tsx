import { useState } from 'react';
import { Guest, CategoryInfo, Event, PermissionLevel } from '../types';
import { removeGuestFromFamily, GuestPresenceInfo } from '../api';
import CategoryTag from './CategoryTag';
import AssignToFamilyModal from './AssignToFamilyModal';
import EditGuestForm from './EditGuestForm';
import './GuestItem.css';

interface EventWithPermission extends Event {
  permission: PermissionLevel;
}

interface GuestItemProps {
  guest: Guest;
  categories: CategoryInfo[];
  onUpdate: () => void;
  eventId: string;
  readOnly?: boolean;
  events?: EventWithPermission[];
  guestPresence?: GuestPresenceInfo[];
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (guestId: string, selected: boolean) => void;
}

export default function GuestItem({
  guest,
  categories,
  onUpdate,
  eventId,
  readOnly = false,
  events = [],
  guestPresence = [],
  selectionMode = false,
  isSelected = false,
  onSelectionChange,
}: GuestItemProps) {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleRemoveFromFamily = async () => {
    if (!guest.familyId) return;

    if (window.confirm(`Remove ${guest.firstName} ${guest.lastName} from their family?`)) {
      try {
        await removeGuestFromFamily(eventId, guest.familyId, guest.id);
        onUpdate();
      } catch (error) {
        console.error('Failed to remove guest from family:', error);
        alert('Failed to remove guest from family');
      }
    }
  };

  return (
    <>
      <div className={`guest-item ${isSelected ? 'selected' : ''}`}>
        {selectionMode && (
          <input
            type="checkbox"
            className="guest-checkbox"
            checked={isSelected}
            onChange={(e) => onSelectionChange?.(guest.id, e.target.checked)}
            aria-label={`Select ${guest.firstName} ${guest.lastName}`}
          />
        )}
        <div className="guest-name">
          <span className="first-name">{guest.firstName}</span>
          <span className="last-name">{guest.lastName}</span>
          {guestPresence.length > 0 && (
            <span className="guest-event-badges">
              {guestPresence.map((event) => (
                <span key={event.id} className="event-badge" title={`Also in ${event.name}`}>
                  {event.name}
                </span>
              ))}
            </span>
          )}
        </div>
        {guest.tags.length > 0 && (
          <div className="guest-tags">
            {[...guest.tags].sort().map((tag, index) => {
              const catInfo = categories.find(c => c.name === tag);
              return (
                <CategoryTag key={index} category={tag} categoryInfo={catInfo} />
              );
            })}
          </div>
        )}
        {!readOnly && !selectionMode && (
          <div className="guest-actions">
            {!guest.familyId && (
              <button
                className="assign-button"
                onClick={() => setShowAssignModal(true)}
                aria-label={`Assign ${guest.firstName} ${guest.lastName} to family`}
              >
                Assign to Family
              </button>
            )}
            {guest.familyId && (
              <button
                className="remove-family-button"
                onClick={handleRemoveFromFamily}
                aria-label={`Remove ${guest.firstName} ${guest.lastName} from family`}
              >
                Remove from Family
              </button>
            )}
            <button
              className="edit-button"
              onClick={() => setShowEditModal(true)}
              aria-label={`Edit ${guest.firstName} ${guest.lastName}`}
            >
              Edit
            </button>
          </div>
        )}
      </div>
      {showAssignModal && (
        <AssignToFamilyModal
          guest={guest}
          eventId={eventId}
          onClose={() => setShowAssignModal(false)}
          onSuccess={() => {
            setShowAssignModal(false);
            onUpdate();
          }}
        />
      )}
      {showEditModal && (
        <EditGuestForm
          guest={guest}
          categories={categories}
          eventId={eventId}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            onUpdate();
          }}
          events={events}
          guestPresence={guestPresence}
        />
      )}
    </>
  );
}
