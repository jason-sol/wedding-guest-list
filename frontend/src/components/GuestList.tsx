import { useState, useMemo, useCallback } from 'react';
import { Guest, Family, CategoryInfo, Event, PermissionLevel } from '../types';
import { useFilteredGuests } from '../hooks/useFilteredGuests';
import { GuestPresenceMap } from '../api';
import GuestItem from './GuestItem';
import FamilyGroup from './FamilyGroup';
import BulkEventsModal from './BulkEventsModal';
import './GuestList.css';

interface EventWithPermission extends Event {
  permission: PermissionLevel;
}

interface GuestListProps {
  guests: Guest[];
  families: Family[];
  categories: CategoryInfo[];
  selectedCategories: string[];
  searchTerm: string;
  onUpdate: () => void;
  eventId: string;
  readOnly?: boolean;
  events?: EventWithPermission[];
  guestPresence?: GuestPresenceMap;
}

export default function GuestList({
  guests,
  families,
  categories,
  selectedCategories,
  searchTerm,
  onUpdate,
  eventId,
  readOnly = false,
  events = [],
  guestPresence = {},
}: GuestListProps) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());
  const [showBulkEventsModal, setShowBulkEventsModal] = useState(false);

  // Selection handlers
  const handleSelectionChange = useCallback((guestId: string, selected: boolean) => {
    setSelectedGuestIds(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(guestId);
      } else {
        newSet.delete(guestId);
      }
      return newSet;
    });
  }, []);

  const handleFamilySelectionChange = useCallback((guestIds: string[], selected: boolean) => {
    setSelectedGuestIds(prev => {
      const newSet = new Set(prev);
      guestIds.forEach(id => {
        if (selected) {
          newSet.add(id);
        } else {
          newSet.delete(id);
        }
      });
      return newSet;
    });
  }, []);

  // Note: handleSelectAll needs filteredGuests, defined below via useMemo

  const handleDeselectAll = useCallback(() => {
    setSelectedGuestIds(new Set());
  }, []);

  const toggleSelectionMode = useCallback(() => {
    if (selectionMode) {
      // Exiting selection mode - clear selections
      setSelectedGuestIds(new Set());
    }
    setSelectionMode(!selectionMode);
  }, [selectionMode]);

  const handleBulkActionComplete = useCallback(() => {
    setShowBulkEventsModal(false);
    setSelectedGuestIds(new Set());
    setSelectionMode(false);
    onUpdate();
  }, [onUpdate]);

  // Ensure guests and families are arrays
  const safeGuests = Array.isArray(guests) ? guests : [];
  const safeFamilies = Array.isArray(families) ? families : [];

  // Use shared filtering hook
  const filteredGuests = useFilteredGuests({
    guests: safeGuests,
    selectedCategories,
    searchTerm,
  });

  // Filter families by search term
  const filteredFamilies = useMemo(() => {
    if (!searchTerm.trim()) return safeFamilies;

    const searchLower = searchTerm.toLowerCase().trim();
    return safeFamilies.filter(family => {
      // Check if family name matches
      if (family.name.toLowerCase().includes(searchLower)) {
        return true;
      }
      // Check if any family member's name matches
      return family.members.some(memberId => {
        const member = safeGuests.find(g => g.id === memberId);
        if (!member) return false;
        const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
        return fullName.includes(searchLower);
      });
    });
  }, [safeFamilies, safeGuests, searchTerm]);

  // Create a map of familyId -> first member's last name for sorting
  const familyLastNameMap = new Map<string, string>();
  filteredGuests.forEach(guest => {
    if (guest.familyId && !familyLastNameMap.has(guest.familyId)) {
      familyLastNameMap.set(guest.familyId, guest.lastName);
    }
  });

  // Sort families by the last name of their first member
  const sortedFamilies = filteredFamilies
    .filter(f => {
      // Only include families that have at least one guest in filtered list
      return filteredGuests.some(g => g.familyId === f.id);
    })
    .sort((a, b) => {
      const aLastName = familyLastNameMap.get(a.id) || '';
      const bLastName = familyLastNameMap.get(b.id) || '';
      return aLastName.localeCompare(bLastName);
    });

  // Get individual guests (already sorted by backend)
  const individualGuests = filteredGuests.filter((g) => !g.familyId);

  // Create unified list: families and individuals sorted together
  const unifiedList: Array<{ type: 'family'; family: Family } | { type: 'individual'; guest: Guest }> = [];

  // Add all families and individuals to the list
  sortedFamilies.forEach(family => {
    unifiedList.push({ type: 'family', family });
  });

  individualGuests.forEach(guest => {
    unifiedList.push({ type: 'individual', guest });
  });

  // Sort the unified list by last name to interleave families and individuals
  unifiedList.sort((a, b) => {
    let aLastName: string;
    let bLastName: string;

    if (a.type === 'family') {
      aLastName = familyLastNameMap.get(a.family.id) || '';
    } else {
      aLastName = a.guest.lastName;
    }

    if (b.type === 'family') {
      bLastName = familyLastNameMap.get(b.family.id) || '';
    } else {
      bLastName = b.guest.lastName;
    }

    return aLastName.localeCompare(bLastName);
  });

  // Calculate total unique guests (filtered)
  const totalGuests = filteredGuests.length;

  // Get selected guests for bulk operations
  const selectedGuests = filteredGuests.filter(g => selectedGuestIds.has(g.id));

  // Check if all filtered guests are selected
  const allSelected = filteredGuests.length > 0 && filteredGuests.every(g => selectedGuestIds.has(g.id));
  const someSelected = selectedGuestIds.size > 0;

  return (
    <div className="guest-list">
      {!readOnly && (
        <div className="guest-list-controls">
          <button
            className={`selection-mode-toggle ${selectionMode ? 'active' : ''}`}
            onClick={toggleSelectionMode}
          >
            {selectionMode ? 'Done Selecting' : 'Select Guests'}
          </button>

          {selectionMode && filteredGuests.length > 0 && (
            <div className="select-all-controls">
              {!allSelected ? (
                <button
                  className="select-all-button"
                  onClick={() => setSelectedGuestIds(new Set(filteredGuests.map(g => g.id)))}
                >
                  Select All ({filteredGuests.length})
                </button>
              ) : (
                <button
                  className="deselect-all-button"
                  onClick={handleDeselectAll}
                >
                  Deselect All
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bulk action bar - shown when guests are selected */}
      {selectionMode && someSelected && (
        <div className="bulk-action-bar">
          <span className="selection-count">
            {selectedGuestIds.size} guest{selectedGuestIds.size !== 1 ? 's' : ''} selected
          </span>
          <div className="bulk-actions">
            <button
              className="bulk-events-button"
              onClick={() => setShowBulkEventsModal(true)}
            >
              Manage Events
            </button>
          </div>
        </div>
      )}

      {filteredGuests.length === 0 ? (
        <div className="empty-state">
          <p>
            {searchTerm.trim()
              ? `No guests or families found matching "${searchTerm}".`
              : selectedCategories.length > 0
              ? `No guests found in selected categories.`
              : 'No guests yet. Add your first guest to get started!'}
          </p>
        </div>
      ) : (
        <>
          {unifiedList.map((item) => {
            if (item.type === 'family') {
              return (
                <FamilyGroup
                  key={item.family.id}
                  family={item.family}
                  guests={filteredGuests}
                  allGuests={safeGuests}
                  categories={categories}
                  onUpdate={onUpdate}
                  eventId={eventId}
                  readOnly={readOnly}
                  events={events}
                  guestPresence={guestPresence}
                  selectionMode={selectionMode}
                  selectedGuestIds={selectedGuestIds}
                  onSelectionChange={handleSelectionChange}
                  onFamilySelectionChange={handleFamilySelectionChange}
                />
              );
            } else {
              return (
                <GuestItem
                  key={item.guest.id}
                  guest={item.guest}
                  categories={categories}
                  onUpdate={onUpdate}
                  eventId={eventId}
                  readOnly={readOnly}
                  events={events}
                  guestPresence={guestPresence[item.guest.id]}
                  selectionMode={selectionMode}
                  isSelected={selectedGuestIds.has(item.guest.id)}
                  onSelectionChange={handleSelectionChange}
                />
              );
            }
          })}
          <div className="guest-count">
            <p>Total Guests: <strong>{totalGuests}</strong></p>
          </div>
        </>
      )}

      {showBulkEventsModal && (
        <BulkEventsModal
          selectedGuests={selectedGuests}
          events={events}
          currentEventId={eventId}
          guestPresenceMap={guestPresence}
          onClose={() => setShowBulkEventsModal(false)}
          onSuccess={handleBulkActionComplete}
        />
      )}
    </div>
  );
}
