import { useState } from 'react';
import { Family, Guest, CategoryInfo } from '../types';
import GuestItem from './GuestItem';
import './FamilyGroup.css';

interface FamilyGroupProps {
  family: Family;
  guests: Guest[];
  categories: CategoryInfo[];
  onUpdate: () => void;
  removeMode?: boolean;
}

export default function FamilyGroup({
  family,
  guests,
  categories,
  onUpdate,
  removeMode = false,
}: FamilyGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const familyMembers = guests.filter((g) => g.familyId === family.id);

  return (
    <div className="family-group">
      <div 
        className="family-header"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ cursor: 'pointer' }}
      >
        <div className="family-header-left">
          <span className="family-toggle">{isExpanded ? '▼' : '▶'}</span>
          <h3 className="family-name">{family.name}</h3>
        </div>
        <span className="family-count">{familyMembers.length} members</span>
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
  );
}
