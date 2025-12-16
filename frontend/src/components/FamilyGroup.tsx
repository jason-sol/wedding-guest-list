import { Family, Guest } from '../types';
import GuestItem from './GuestItem';
import './FamilyGroup.css';

interface FamilyGroupProps {
  family: Family;
  guests: Guest[];
  viewMode: 'family' | 'individual';
  onUpdate: () => void;
}

export default function FamilyGroup({
  family,
  guests,
  viewMode,
  onUpdate,
}: FamilyGroupProps) {
  const familyMembers = guests.filter((g) => g.familyId === family.id);

  if (viewMode === 'individual') {
    return (
      <>
        {familyMembers.map((guest) => (
          <GuestItem key={guest.id} guest={guest} onUpdate={onUpdate} />
        ))}
      </>
    );
  }

  return (
    <div className="family-group">
      <div className="family-header">
        <h3 className="family-name">{family.name}</h3>
        <span className="family-count">{familyMembers.length} members</span>
      </div>
      <div className="family-members">
        {familyMembers.map((guest) => (
          <GuestItem key={guest.id} guest={guest} onUpdate={onUpdate} />
        ))}
      </div>
    </div>
  );
}
