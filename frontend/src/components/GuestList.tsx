/**
 * Guest List component using MUI
 * Main container for displaying guests and families with selection and bulk actions
 */

import { useState, useMemo, useCallback, useRef, useEffect, useTransition } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  ButtonGroup,
  Alert,
  Chip,
  Stack,
  CircularProgress,
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
import { Guest, Family, CategoryInfo, Event, PermissionLevel, RSVPStatus, AgeGroup } from '../types';
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
  selectedAgeGroups?: AgeGroup[];
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
  selectedAgeGroups = [],
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

  // Track collapsed families using a ref so state persists across data re-fetches
  const collapsedFamiliesRef = useRef<Set<string>>(new Set());
  const [, forceUpdate] = useState(0);

  const handleToggleExpanded = useCallback((familyId: string, expanded: boolean) => {
    if (expanded) {
      collapsedFamiliesRef.current.delete(familyId);
    } else {
      collapsedFamiliesRef.current.add(familyId);
    }
    forceUpdate(n => n + 1);
  }, []);

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
    selectedAgeGroups,
    searchTerm,
    families: safeFamilies,
  });

  // Memoize the expensive list computations
  const { unifiedList } = useMemo(() => {
    const lastNameMap = new Map<string, string>();
    filteredGuests.forEach(guest => {
      if (guest.familyId && !lastNameMap.has(guest.familyId)) {
        lastNameMap.set(guest.familyId, guest.lastName);
      }
    });

    // Build Set of family IDs for O(1) lookup instead of O(n*m)
    const familyIdsInFilter = new Set(
      filteredGuests.map(g => g.familyId).filter(Boolean)
    );

    const sortedFamilies = safeFamilies
      .filter(f => familyIdsInFilter.has(f.id))
      .sort((a, b) => {
        const aLastName = lastNameMap.get(a.id) || '';
        const bLastName = lastNameMap.get(b.id) || '';
        return aLastName.localeCompare(bLastName);
      });

    const individualGuests = filteredGuests.filter((g) => !g.familyId);

    const list: Array<{ type: 'family'; family: Family } | { type: 'individual'; guest: Guest }> = [];

    sortedFamilies.forEach(family => {
      list.push({ type: 'family', family });
    });

    individualGuests.forEach(guest => {
      list.push({ type: 'individual', guest });
    });

    list.sort((a, b) => {
      const aLastName = a.type === 'family' ? (lastNameMap.get(a.family.id) || '') : a.guest.lastName;
      const bLastName = b.type === 'family' ? (lastNameMap.get(b.family.id) || '') : b.guest.lastName;
      return aLastName.localeCompare(bLastName);
    });

    return { unifiedList: list, familyLastNameMap: lastNameMap };
  }, [filteredGuests, safeFamilies]);

  // Progressive rendering: show first batch immediately, add more on scroll
  const INITIAL_BATCH = 30;
  const BATCH_SIZE = 20;
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);
  const [, startLoadTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset visible count when the list changes (e.g. filter applied)
  const listLengthRef = useRef(unifiedList.length);
  if (unifiedList.length !== listLengthRef.current) {
    listLengthRef.current = unifiedList.length;
    if (visibleCount > INITIAL_BATCH) {
      setVisibleCount(INITIAL_BATCH);
    }
  }

  // IntersectionObserver to load more items as user scrolls
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || visibleCount >= unifiedList.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          startLoadTransition(() => {
            setVisibleCount(prev => Math.min(prev + BATCH_SIZE, unifiedList.length));
          });
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, unifiedList.length]);

  const visibleList = useMemo(
    () => unifiedList.slice(0, visibleCount),
    [unifiedList, visibleCount]
  );

  const totalGuests = filteredGuests.length;
  const selectedGuests = filteredGuests.filter(g => selectedGuestIds.has(g.id));
  const allSelected = filteredGuests.length > 0 && filteredGuests.every(g => selectedGuestIds.has(g.id));
  const someSelected = selectedGuestIds.size > 0;

  // Build guest Map for O(1) lookups in FamilyGroup
  const guestMap = useMemo(() => {
    const map = new Map<string, Guest>();
    safeGuests.forEach(g => map.set(g.id, g));
    return map;
  }, [safeGuests]);

  // Build filtered guest Map for O(1) lookups in FamilyGroup
  const filteredGuestMap = useMemo(() => {
    const map = new Map<string, Guest>();
    filteredGuests.forEach(g => map.set(g.id, g));
    return map;
  }, [filteredGuests]);

  // Calculate RSVP and age group counts (memoized)
  const { rsvpCounts, adultCount, childCount } = useMemo(() => {
    let accepted = 0, declined = 0, pending = 0, adults = 0, children = 0;
    for (const g of filteredGuests) {
      if (g.rsvp === 'accepted') accepted++;
      else if (g.rsvp === 'declined') declined++;
      else pending++;
      if (g.ageGroup === 'child') children++;
      else adults++;
    }
    return {
      rsvpCounts: { accepted, declined, pending },
      adultCount: adults,
      childCount: children,
    };
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
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            borderRadius: 2,
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
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
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
            {visibleList.map((item) => {
              if (item.type === 'family') {
                return (
                  <Box
                    key={item.family.id}
                    sx={{ contain: 'layout style paint', contentVisibility: 'auto', containIntrinsicSize: 'auto 80px' }}
                  >
                    <FamilyGroup
                      family={item.family}
                      guests={filteredGuests}
                      allGuests={safeGuests}
                      guestMap={filteredGuestMap}
                      allGuestMap={guestMap}
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
                      isExpanded={!collapsedFamiliesRef.current.has(item.family.id)}
                      onToggleExpanded={handleToggleExpanded}
                    />
                  </Box>
                );
              } else {
                return (
                  <Box
                    key={item.guest.id}
                    sx={{ contain: 'layout style paint', contentVisibility: 'auto', containIntrinsicSize: 'auto 60px' }}
                  >
                    <GuestItem
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
                  </Box>
                );
              }
            })}
          </Stack>

          {/* Sentinel element for progressive loading */}
          {visibleCount < unifiedList.length && (
            <Box
              ref={sentinelRef}
              sx={{ display: 'flex', justifyContent: 'center', py: 3 }}
            >
              <CircularProgress size={24} />
            </Box>
          )}

          <Paper
            variant="outlined"
            sx={{
              mt: 3,
              p: 2,
              display: 'flex',
              justifyContent: 'center',
              gap: { xs: 1, sm: 3 },
              flexWrap: 'wrap',
              bgcolor: 'action.hover',
            }}
          >
            <Typography variant="body1">
              Total: <strong>{totalGuests}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Adults: <strong>{adultCount}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Children: <strong>{childCount}</strong>
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
