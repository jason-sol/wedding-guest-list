import { useState } from 'react';
import { Family, Guest, CategoryInfo, Event, PermissionLevel } from '../types';
import { GuestPresenceMap } from '../api';
import GuestItem from './GuestItem';
import EditFamilyForm from './EditFamilyForm';
import './FamilyGroup.css';

interface EventWithPermission extends Event {
  permission: PermissionLevel;
}

interface FamilyGroupProps {
  family: Family;
  guests: Guest[]; // Filtered guests (for display)
  allGuests?: Guest[]; // All guests (for editing)
  categories: CategoryInfo[];
  onUpdate: () => void;
  eventId: string;
  readOnly?: boolean;
  events?: EventWithPermission[];
  guestPresence?: GuestPresenceMap;
  selectionMode?: boolean;
  selectedGuestIds?: Set<string>;
  onSelectionChange?: (guestId: string, selected: boolean) => void;
  onFamilySelectionChange?: (guestIds: string[], selected: boolean) => void;
}

export default function FamilyGroup({
  family,
  guests,
  allGuests,
  categories,
  onUpdate,
  eventId,
  readOnly = false,
  events = [],
  guestPresence = {},
  selectionMode = false,
  selectedGuestIds = new Set(),
  onSelectionChange,
  onFamilySelectionChange,
}: FamilyGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  // Get family members from filtered guests (only show matching members)
  const familyMembers = family.members
    .map(id => guests.find(g => g.id === id && g.familyId === family.id))
    .filter((g): g is Guest => g !== undefined);

  // For editing, use allGuests if provided, otherwise use filtered guests
  const guestsForEditing = allGuests || guests;

  // Check if all family members are selected
  const allMembersSelected = familyMembers.length > 0 &&
    familyMembers.every(m => selectedGuestIds.has(m.id));
  const someMembersSelected = familyMembers.some(m => selectedGuestIds.has(m.id));

  const handleFamilyCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const memberIds = familyMembers.map(m => m.id);
    onFamilySelectionChange?.(memberIds, e.target.checked);
  };

  return (
    <>
      <div className={`family-group ${someMembersSelected ? 'has-selection' : ''}`}>
        <div
          className="family-header"
          onClick={() => !selectionMode && setIsExpanded(!isExpanded)}
          style={{ cursor: selectionMode ? 'default' : 'pointer' }}
        >
          {selectionMode && (
            <input
              type="checkbox"
              className="family-checkbox"
              checked={allMembersSelected}
              ref={(input) => {
                if (input) {
                  input.indeterminate = someMembersSelected && !allMembersSelected;
                }
              }}
              onChange={handleFamilyCheckboxChange}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Select all members of ${family.name}`}
            />
          )}
          <div className="family-header-left">
            <span className="family-toggle">{isExpanded ? '▼' : '▶'}</span>
            <h3 className="family-name">
              {family.name}
            </h3>
          </div>
          <div className="family-header-right">
            <span className="family-count">{familyMembers.length} members</span>
            {!readOnly && !selectionMode && (
              <button
                className="edit-family-button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEditModal(true);
                }}
                aria-label={`Edit ${family.name} family`}
              >
                Edit
              </button>
            )}
          </div>
        </div>
        {isExpanded && (
          <div className="family-members">
            {familyMembers.map((guest) => (
              <GuestItem
                key={guest.id}
                guest={guest}
                categories={categories}
                onUpdate={onUpdate}
                eventId={eventId}
                readOnly={readOnly}
                events={events}
                guestPresence={guestPresence[guest.id]}
                selectionMode={selectionMode}
                isSelected={selectedGuestIds.has(guest.id)}
                onSelectionChange={onSelectionChange}
              />
            ))}
          </div>
        )}
      </div>
      {showEditModal && (
        <EditFamilyForm
          family={family}
          familyGuests={family.members
            .map(id => guestsForEditing.find(g => g.id === id && g.familyId === family.id))
            .filter((g): g is Guest => g !== undefined)}
          allGuests={guestsForEditing}
          categories={categories}
          eventId={eventId}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            onUpdate();
          }}
          events={events}
          guestPresenceMap={guestPresence}
        />
      )}
    </>
  );
}
