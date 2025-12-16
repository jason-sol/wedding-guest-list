import { useState, useMemo } from 'react';
import { Guest, Family, CategoryInfo } from '../types';
import GuestItem from './GuestItem';
import FamilyGroup from './FamilyGroup';
import './GuestList.css';

interface GuestListProps {
  guests: Guest[];
  families: Family[];
  categories: CategoryInfo[];
  selectedCategories: string[];
  searchTerm: string;
  onUpdate: () => void;
}

export default function GuestList({
  guests,
  families,
  categories,
  selectedCategories,
  searchTerm,
  onUpdate,
}: GuestListProps) {
  const [removeMode, setRemoveMode] = useState(false);
  
  // Ensure guests and families are arrays
  const safeGuests = Array.isArray(guests) ? guests : [];
  const safeFamilies = Array.isArray(families) ? families : [];
  
  // Filter guests by selected categories and search term
  const filteredGuests = useMemo(() => {
    let filtered = safeGuests;
    
    // Filter by categories
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(guest => 
        selectedCategories.some(cat => guest.tags.includes(cat))
      );
    }
    
    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(guest => {
        const fullName = `${guest.firstName} ${guest.lastName}`.toLowerCase();
        return fullName.includes(searchLower);
      });
    }
    
    return filtered;
  }, [safeGuests, selectedCategories, searchTerm]);
  
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

  return (
    <div className="guest-list">
      <div className="guest-list-controls">
        <button
          className={`remove-mode-toggle ${removeMode ? 'active' : ''}`}
          onClick={() => setRemoveMode(!removeMode)}
        >
          {removeMode ? '✓ Remove Guests Ready' : 'Remove Guests'}
        </button>
      </div>
      
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
                  removeMode={removeMode}
                />
              );
            } else {
              return (
                <GuestItem 
                  key={item.guest.id} 
                  guest={item.guest}
                  categories={categories}
                  onUpdate={onUpdate}
                  removeMode={removeMode}
                />
              );
            }
          })}
          <div className="guest-count">
            <p>Total Guests: <strong>{totalGuests}</strong></p>
          </div>
        </>
      )}
    </div>
  );
}
