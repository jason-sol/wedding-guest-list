import { useState } from 'react';
import { Family, Guest, CategoryInfo } from '../types';
import GuestItem from './GuestItem';
import EditFamilyForm from './EditFamilyForm';
import './FamilyGroup.css';

interface FamilyGroupProps {
  family: Family;
  guests: Guest[]; // Filtered guests (for display)
  allGuests?: Guest[]; // All guests (for editing)
  categories: CategoryInfo[];
  onUpdate: () => void;
  removeMode?: boolean;
}

export default function FamilyGroup({
  family,
  guests,
  allGuests,
  categories,
  onUpdate,
  removeMode = false,
}: FamilyGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Get family members from filtered guests (only show matching members)
  const familyMembers = family.members
    .map(id => guests.find(g => g.id === id && g.familyId === family.id))
    .filter((g): g is Guest => g !== undefined);
  
  // For editing, use allGuests if provided, otherwise use filtered guests
  const guestsForEditing = allGuests || guests;
  
  // Check if all family members are attending reception
  const allFamilyMembers = family.members
    .map(id => guestsForEditing.find(g => g.id === id && g.familyId === family.id))
    .filter((g): g is Guest => g !== undefined);
  
  const allAttendingReception = allFamilyMembers.length > 0 && 
    allFamilyMembers.every(member => member.reception === true);

  return (
    <>
      <div className="family-group">
        <div 
          className="family-header"
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ cursor: 'pointer' }}
        >
          <div className="family-header-left">
            <span className="family-toggle">{isExpanded ? '▼' : '▶'}</span>
            <h3 className="family-name">
              {family.name}
              {allAttendingReception && (
                <span className="reception-indicator" title="All family members attending Reception">
                  ✓
                </span>
              )}
            </h3>
          </div>
          <div className="family-header-right">
            <span className="family-count">{familyMembers.length} members</span>
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
                removeMode={removeMode}
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
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            onUpdate();
          }}
        />
      )}
    </>
  );
}
