import { useState } from 'react';
import { Guest } from '../types';
import { deleteGuest, removeGuestFromFamily } from '../api';
import CategoryTag from './CategoryTag';
import AssignToFamilyModal from './AssignToFamilyModal';
import './GuestItem.css';

interface GuestItemProps {
  guest: Guest;
  onUpdate: () => void;
}

export default function GuestItem({ guest, onUpdate }: GuestItemProps) {
  const [showAssignModal, setShowAssignModal] = useState(false);

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to remove ${guest.firstName} ${guest.lastName}?`)) {
      try {
        await deleteGuest(guest.id);
        onUpdate();
      } catch (error) {
        console.error('Failed to delete guest:', error);
        alert('Failed to delete guest');
      }
    }
  };

  const handleRemoveFromFamily = async () => {
    if (!guest.familyId) return;
    
    if (window.confirm(`Remove ${guest.firstName} ${guest.lastName} from their family?`)) {
      try {
        await removeGuestFromFamily(guest.familyId, guest.id);
        onUpdate();
      } catch (error) {
        console.error('Failed to remove guest from family:', error);
        alert('Failed to remove guest from family');
      }
    }
  };

  return (
    <>
      <div className="guest-item">
        <div className="guest-name">
          <span className="first-name">{guest.firstName}</span>
          <span className="last-name">{guest.lastName}</span>
        </div>
        {guest.tags.length > 0 && (
          <div className="guest-tags">
            {guest.tags.map((tag, index) => (
              <CategoryTag key={index} category={tag} />
            ))}
          </div>
        )}
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
            className="delete-button"
            onClick={handleDelete}
            aria-label={`Delete ${guest.firstName} ${guest.lastName}`}
          >
            Remove
          </button>
        </div>
      </div>
      {showAssignModal && (
        <AssignToFamilyModal
          guest={guest}
          onClose={() => setShowAssignModal(false)}
          onSuccess={() => {
            setShowAssignModal(false);
            onUpdate();
          }}
        />
      )}
    </>
  );
}
