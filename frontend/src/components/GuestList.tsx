/**
 * Guest List component using MUI
 * Main container for displaying guests and families with selection and bulk actions
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  ButtonGroup,
  Alert,
  Chip,
  Stack,
} from '@mui/material';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import DeselectIcon from '@mui/icons-material/Deselect';
import EventIcon from '@mui/icons-material/Event';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import RsvpIcon from '@mui/icons-material/Rsvp';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Guest, Family, CategoryInfo, Event, PermissionLevel, RSVPStatus } from '../types';
import { useFilteredGuests } from '../hooks/useFilteredGuests';
import { GuestPresenceMap } from '../api';
import GuestItem from './GuestItem';
import FamilyGroup from './FamilyGroup';
import BulkEventsModal from './BulkEventsModal';
import BulkCategoriesModal from './BulkCategoriesModal';
import BulkRsvpModal from './BulkRsvpModal';

interface EventWithPermission extends Event {
  permission: PermissionLevel;
}

interface GuestListProps {
  guests: Guest[];
  families: Family[];
  categories: CategoryInfo[];
  selectedCategories: string[];
  selectedRsvpStatuses?: RSVPStatus[];
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
  selectedRsvpStatuses = [],
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
  const [showBulkCategoriesModal, setShowBulkCategoriesModal] = useState(false);
  const [showBulkRsvpModal, setShowBulkRsvpModal] = useState(false);

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

  const handleDeselectAll = useCallback(() => {
    setSelectedGuestIds(new Set());
  }, []);

  const toggleSelectionMode = useCallback(() => {
    if (selectionMode) {
      setSelectedGuestIds(new Set());
    }
    setSelectionMode(!selectionMode);
  }, [selectionMode]);

  const handleBulkEventsComplete = useCallback(() => {
    setShowBulkEventsModal(false);
    setSelectedGuestIds(new Set());
    setSelectionMode(false);
    onUpdate();
  }, [onUpdate]);

  const handleBulkCategoriesComplete = useCallback(() => {
    setShowBulkCategoriesModal(false);
    onUpdate();
  }, [onUpdate]);

  const handleBulkRsvpComplete = useCallback(() => {
    setShowBulkRsvpModal(false);
    setSelectedGuestIds(new Set());
    setSelectionMode(false);
    onUpdate();
  }, [onUpdate]);

  const safeGuests = Array.isArray(guests) ? guests : [];
  const safeFamilies = Array.isArray(families) ? families : [];

  const filteredGuests = useFilteredGuests({
    guests: safeGuests,
    selectedCategories,
    selectedRsvpStatuses,
    searchTerm,
  });

  const filteredFamilies = useMemo(() => {
    if (!searchTerm.trim()) return safeFamilies;

    const searchLower = searchTerm.toLowerCase().trim();
    return safeFamilies.filter(family => {
      if (family.name.toLowerCase().includes(searchLower)) {
        return true;
      }
      return family.members.some(memberId => {
        const member = safeGuests.find(g => g.id === memberId);
        if (!member) return false;
        const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
        return fullName.includes(searchLower);
      });
    });
  }, [safeFamilies, safeGuests, searchTerm]);

  const familyLastNameMap = new Map<string, string>();
  filteredGuests.forEach(guest => {
    if (guest.familyId && !familyLastNameMap.has(guest.familyId)) {
      familyLastNameMap.set(guest.familyId, guest.lastName);
    }
  });

  const sortedFamilies = filteredFamilies
    .filter(f => {
      return filteredGuests.some(g => g.familyId === f.id);
    })
    .sort((a, b) => {
      const aLastName = familyLastNameMap.get(a.id) || '';
      const bLastName = familyLastNameMap.get(b.id) || '';
      return aLastName.localeCompare(bLastName);
    });

  const individualGuests = filteredGuests.filter((g) => !g.familyId);

  const unifiedList: Array<{ type: 'family'; family: Family } | { type: 'individual'; guest: Guest }> = [];

  sortedFamilies.forEach(family => {
    unifiedList.push({ type: 'family', family });
  });

  individualGuests.forEach(guest => {
    unifiedList.push({ type: 'individual', guest });
  });

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

  const totalGuests = filteredGuests.length;
  const selectedGuests = filteredGuests.filter(g => selectedGuestIds.has(g.id));
  const allSelected = filteredGuests.length > 0 && filteredGuests.every(g => selectedGuestIds.has(g.id));
  const someSelected = selectedGuestIds.size > 0;

  // Calculate RSVP counts
  const rsvpCounts = useMemo(() => {
    const accepted = filteredGuests.filter(g => g.rsvp === 'accepted').length;
    const declined = filteredGuests.filter(g => g.rsvp === 'declined').length;
    const pending = filteredGuests.filter(g => !g.rsvp || g.rsvp === 'pending').length;
    return { accepted, declined, pending };
  }, [filteredGuests]);

  return (
    <Box>
      {/* Controls */}
      {!readOnly && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Button
            variant={selectionMode ? 'contained' : 'outlined'}
            startIcon={selectionMode ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
            onClick={toggleSelectionMode}
          >
            {selectionMode ? 'Done Selecting' : 'Select Guests'}
          </Button>

          {selectionMode && filteredGuests.length > 0 && (
            <ButtonGroup variant="outlined" size="small">
              {!allSelected ? (
                <Button
                  startIcon={<SelectAllIcon />}
                  onClick={() => setSelectedGuestIds(new Set(filteredGuests.map(g => g.id)))}
                >
                  Select All ({filteredGuests.length})
                </Button>
              ) : (
                <Button
                  startIcon={<DeselectIcon />}
                  onClick={handleDeselectAll}
                >
                  Deselect All
                </Button>
              )}
            </ButtonGroup>
          )}
        </Box>
      )}

      {/* Bulk Action Bar */}
      {selectionMode && someSelected && (
        <Paper
          elevation={3}
          sx={{
            p: 2,
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            borderRadius: 2,
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={`${selectedGuestIds.size} guest${selectedGuestIds.size !== 1 ? 's' : ''} selected`}
              color="default"
              sx={{ bgcolor: 'rgba(255,255,255,0.9)', color: '#1E293B', fontWeight: 600 }}
            />
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<LocalOfferIcon />}
              onClick={() => setShowBulkCategoriesModal(true)}
            >
              Manage Categories
            </Button>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<EventIcon />}
              onClick={() => setShowBulkEventsModal(true)}
            >
              Manage Events
            </Button>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<RsvpIcon />}
              onClick={() => setShowBulkRsvpModal(true)}
            >
              Update RSVP
            </Button>
          </Stack>
        </Paper>
      )}

      {/* RSVP Summary Bar */}
      {filteredGuests.length > 0 && (
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            mb: 2,
            display: 'flex',
            justifyContent: 'center',
            gap: 3,
            flexWrap: 'wrap',
          }}
        >
          <Stack direction="row" spacing={0.5} alignItems="center">
            <EventAvailableIcon color="success" fontSize="small" />
            <Typography variant="body2">
              <strong>{rsvpCounts.accepted}</strong> Attending
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <HelpOutlineIcon color="action" fontSize="small" />
            <Typography variant="body2">
              <strong>{rsvpCounts.pending}</strong> Pending
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <EventBusyIcon color="error" fontSize="small" />
            <Typography variant="body2">
              <strong>{rsvpCounts.declined}</strong> Declined
            </Typography>
          </Stack>
        </Paper>
      )}

      {/* Guest List */}
      {filteredGuests.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          {searchTerm.trim()
            ? `No guests or families found matching "${searchTerm}".`
            : selectedCategories.length > 0
            ? `No guests found in selected categories.`
            : 'No guests yet. Add your first guest to get started!'}
        </Alert>
      ) : (
        <>
          <Stack spacing={1.5}>
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
          </Stack>

          <Paper
            variant="outlined"
            sx={{
              mt: 3,
              p: 2,
              display: 'flex',
              justifyContent: 'center',
              bgcolor: 'action.hover',
            }}
          >
            <Typography variant="body1">
              Total Guests: <strong>{totalGuests}</strong>
            </Typography>
          </Paper>
        </>
      )}

      {showBulkEventsModal && (
        <BulkEventsModal
          selectedGuests={selectedGuests}
          events={events}
          currentEventId={eventId}
          guestPresenceMap={guestPresence}
          onClose={() => setShowBulkEventsModal(false)}
          onSuccess={handleBulkEventsComplete}
        />
      )}

      {showBulkCategoriesModal && (
        <BulkCategoriesModal
          selectedGuests={selectedGuests}
          categories={categories}
          eventId={eventId}
          onClose={() => setShowBulkCategoriesModal(false)}
          onSuccess={handleBulkCategoriesComplete}
        />
      )}

      {showBulkRsvpModal && (
        <BulkRsvpModal
          selectedGuests={selectedGuests}
          eventId={eventId}
          onClose={() => setShowBulkRsvpModal(false)}
          onSuccess={handleBulkRsvpComplete}
        />
      )}
    </Box>
  );
}
