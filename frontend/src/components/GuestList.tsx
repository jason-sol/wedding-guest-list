import { Guest, Family, ViewMode } from '../types';
import GuestItem from './GuestItem';
import FamilyGroup from './FamilyGroup';
import './GuestList.css';

interface GuestListProps {
  guests: Guest[];
  families: Family[];
  viewMode: ViewMode;
  onUpdate: () => void;
}

export default function GuestList({
  guests,
  families,
  viewMode,
  onUpdate,
}: GuestListProps) {
  // Ensure guests and families are arrays
  const safeGuests = Array.isArray(guests) ? guests : [];
  const safeFamilies = Array.isArray(families) ? families : [];

  if (viewMode === 'family') {
    const guestsInFamilies = new Set(
      safeGuests.filter((g) => g.familyId).map((g) => g.familyId)
    );
    const individualGuests = safeGuests.filter((g) => !g.familyId);

    return (
      <div className="guest-list">
        {safeFamilies
          .filter((f) => guestsInFamilies.has(f.id))
          .map((family) => (
            <FamilyGroup
              key={family.id}
              family={family}
              guests={safeGuests}
              viewMode={viewMode}
              onUpdate={onUpdate}
            />
          ))}
        {individualGuests.length > 0 && (
          <div className="individual-section">
            <h2 className="section-title">Individual Guests</h2>
            {individualGuests.map((guest) => (
              <GuestItem key={guest.id} guest={guest} onUpdate={onUpdate} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="guest-list">
      {safeGuests.length === 0 ? (
        <div className="empty-state">
          <p>No guests yet. Add your first guest to get started!</p>
        </div>
      ) : (
        safeGuests.map((guest) => (
          <GuestItem key={guest.id} guest={guest} onUpdate={onUpdate} />
        ))
      )}
    </div>
  );
}
