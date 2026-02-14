/**
 * Family Group component using MUI Accordion
 * Displays a collapsible family group with member list
 */

import { useState, useRef, useEffect, useMemo, memo } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Button,
  IconButton,
  Checkbox,
  Box,
  Stack,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import GroupIcon from '@mui/icons-material/Group';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Family, Guest, CategoryInfo, Event, PermissionLevel, RSVPStatus } from '../types';
import { updateGuest } from '../api';
import { GuestPresenceMap } from '../api';
import GuestItem from './GuestItem';
import EditFamilyForm from './EditFamilyForm';
import { FamilyRsvpSyncDialog } from './RsvpSyncDialog';

interface EventWithPermission extends Event {
  permission: PermissionLevel;
}

interface FamilyGroupProps {
  family: Family;
  guests: Guest[];
  allGuests?: Guest[];
  guestMap?: Map<string, Guest>;
  allGuestMap?: Map<string, Guest>;
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
  isExpanded?: boolean;
  onToggleExpanded?: (familyId: string, expanded: boolean) => void;
}

export default memo(function FamilyGroup({
  family,
  guests,
  allGuests,
  guestMap,
  allGuestMap,
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
  isExpanded = true,
  onToggleExpanded,
}: FamilyGroupProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [isUpdatingRsvp, setIsUpdatingRsvp] = useState(false);
  const [familyRsvpSyncInfo, setFamilyRsvpSyncInfo] = useState<{ status: RSVPStatus } | null>(null);
  const checkboxRef = useRef<HTMLInputElement>(null);

  // familyMembers: filtered for display (respects search)
  // Use Map for O(1) lookups when available, fall back to Array.find()
  const familyMembers = family.members
    .map(id => {
      const g = guestMap ? guestMap.get(id) : guests.find(g => g.id === id);
      return g && g.familyId === family.id ? g : undefined;
    })
    .filter((g): g is Guest => g !== undefined);

  // allFamilyMembers: ALL members regardless of search, for RSVP operations
  const guestsForEditing = allGuests || guests;
  const allFamilyMembers = family.members
    .map(id => {
      const g = allGuestMap ? allGuestMap.get(id) : guestsForEditing.find(g => g.id === id);
      return g && g.familyId === family.id ? g : undefined;
    })
    .filter((g): g is Guest => g !== undefined);

  const allMembersSelected = familyMembers.length > 0 &&
    familyMembers.every(m => selectedGuestIds.has(m.id));
  const someMembersSelected = familyMembers.some(m => selectedGuestIds.has(m.id));

  // Set indeterminate state via ref
  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = someMembersSelected && !allMembersSelected;
    }
  }, [someMembersSelected, allMembersSelected]);

  const handleFamilyCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const memberIds = familyMembers.map(m => m.id);
    onFamilySelectionChange?.(memberIds, e.target.checked);
  };

  // Calculate family RSVP status from ALL members (not just filtered/visible ones)
  const getFamilyRsvpStatus = (): RSVPStatus | null => {
    if (allFamilyMembers.length === 0) return null;
    const statuses = allFamilyMembers.map(m => m.rsvp || 'pending');
    const firstStatus = statuses[0];
    return statuses.every(s => s === firstStatus) ? firstStatus : null;
  };

  const familyRsvpStatus = getFamilyRsvpStatus();

  const handleFamilyRsvpChange = async (
    _event: React.MouseEvent<HTMLElement>,
    newStatus: RSVPStatus | null
  ) => {
    if (!newStatus || isUpdatingRsvp) return;

    setIsUpdatingRsvp(true);
    try {
      // Update ALL family members, not just the filtered/visible ones
      await Promise.all(
        allFamilyMembers.map(member =>
          updateGuest(eventId, member.id, { rsvp: newStatus })
        )
      );

      // If family exists in other events, show sync dialog and defer data reload
      // The dialog's onClose/onSynced callbacks will trigger onUpdate()
      const commonEvents = commonOtherEvents;
      if (commonEvents.length > 0) {
        setFamilyRsvpSyncInfo({ status: newStatus });
      } else {
        onUpdate();
      }
    } catch (error) {
      console.error('Failed to update family RSVP:', error);
    } finally {
      setIsUpdatingRsvp(false);
    }
  };

  // Find events where ANY family member exists (other than current) — memoized
  // For each event, collect only the guestIds of members that exist there
  const commonOtherEvents = useMemo((): Array<{ eventId: string; eventName: string; guestIds: string[] }> => {
    if (allFamilyMembers.length === 0) return [];

    // For each member, get their other events
    const memberPresences = allFamilyMembers.map(member => guestPresence[member.id] || []);

    // Collect all unique events where ANY member exists, with their guestIds
    const eventMap = new Map<string, { eventName: string; guestIds: string[] }>();

    for (const presence of memberPresences) {
      for (const p of presence) {
        if (!eventMap.has(p.id)) {
          eventMap.set(p.id, { eventName: p.name, guestIds: [] });
        }
        eventMap.get(p.id)!.guestIds.push(p.guestId);
      }
    }

    return Array.from(eventMap.entries()).map(([eventId, { eventName, guestIds }]) => ({
      eventId,
      eventName,
      guestIds,
    }));
  }, [allFamilyMembers, guestPresence]);

  return (
    <>
      <Accordion
        expanded={isExpanded}
        onChange={(_, expanded) => !selectionMode && onToggleExpanded?.(family.id, expanded)}
        disableGutters
        slotProps={{ transition: { unmountOnExit: true } }}
        sx={{
          border: 1,
          borderColor: someMembersSelected ? 'primary.main' : 'divider',
          borderRadius: 2,
          '&:before': { display: 'none' },
          mb: 1.5,
          overflow: 'hidden',
        }}
      >
        <AccordionSummary
          expandIcon={!selectionMode ? <ExpandMoreIcon /> : null}
          component="div"
          sx={{
            bgcolor: 'action.hover',
            cursor: selectionMode ? 'default' : 'pointer',
            '& .MuiAccordionSummary-content': {
              alignItems: 'center',
              gap: 1.5,
            },
          }}
        >
          {selectionMode && (
            <Checkbox
              disableRipple
              inputRef={checkboxRef}
              checked={allMembersSelected}
              onChange={handleFamilyCheckboxChange}
              onClick={(e) => e.stopPropagation()}
              inputProps={{ 'aria-label': `Select all members of ${family.name}` }}
            />
          )}

          <GroupIcon color="primary" />

          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1" fontWeight={600} noWrap>
              {family.name}
            </Typography>
            <Box
              sx={{
                display: { xs: 'none', sm: 'flex' },
                gap: 0.5,
                maxWidth: '50%',
                overflow: 'hidden',
                flexWrap: 'nowrap',
              }}
            >
              {allFamilyMembers.map((member) => (
                <Chip
                  key={member.id}
                  label={member.firstName || member.lastName}
                  size="small"
                  variant="outlined"
                  sx={{
                    height: 20,
                    fontSize: '0.7rem',
                    flexShrink: 0,
                    '& .MuiChip-label': { px: 1 },
                  }}
                />
              ))}
            </Box>
          </Box>

          <Chip
            label={`${familyMembers.length} member${familyMembers.length !== 1 ? 's' : ''}`}
            size="small"
            variant="outlined"
            sx={{ display: { xs: 'none', sm: 'flex' } }}
          />
          <Chip
            label={`${familyMembers.length}`}
            size="small"
            variant="outlined"
            sx={{ display: { xs: 'flex', sm: 'none' } }}
          />

          {/* Family RSVP Toggle */}
          {!selectionMode && (
            <Tooltip title={readOnly ? 'View-only mode' : 'Set RSVP for entire family'}>
              <Box onClick={(e) => e.stopPropagation()}>
                {isUpdatingRsvp ? (
                  <CircularProgress size={20} />
                ) : (
                  <ToggleButtonGroup
                    value={familyRsvpStatus}
                    exclusive
                    onChange={handleFamilyRsvpChange}
                    size="small"
                    disabled={readOnly}
                    sx={{
                      '& .MuiToggleButton-root': {
                        py: 0.25,
                        px: 0.75,
                      },
                    }}
                  >
                    <ToggleButton
                      disableRipple
                      value="accepted"
                      sx={{
                        '&.Mui-selected': {
                          bgcolor: 'success.main',
                          color: 'success.contrastText',
                          '&:hover': { bgcolor: 'success.dark' },
                        },
                      }}
                    >
                      <EventAvailableIcon sx={{ fontSize: '1rem' }} />
                    </ToggleButton>
                    <ToggleButton disableRipple value="pending">
                      <HelpOutlineIcon sx={{ fontSize: '1rem' }} />
                    </ToggleButton>
                    <ToggleButton
                      disableRipple
                      value="declined"
                      sx={{
                        '&.Mui-selected': {
                          bgcolor: 'error.main',
                          color: 'error.contrastText',
                          '&:hover': { bgcolor: 'error.dark' },
                        },
                      }}
                    >
                      <EventBusyIcon sx={{ fontSize: '1rem' }} />
                    </ToggleButton>
                  </ToggleButtonGroup>
                )}
              </Box>
            </Tooltip>
          )}

          {!readOnly && !selectionMode && (
            <>
              <Button
                size="small"
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEditModal(true);
                }}
                sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
              >
                Edit
              </Button>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEditModal(true);
                }}
                sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </>
          )}
        </AccordionSummary>

        <AccordionDetails sx={{ p: 0 }}>
          <Stack spacing={0}>
            {familyMembers.map((guest) => (
              <Box key={guest.id} sx={{ borderTop: 1, borderColor: 'divider' }}>
                <GuestItem
                  guest={guest}
                  categories={categories}
                  onUpdate={onUpdate}
                  eventId={eventId}
                  readOnly={readOnly}
                  events={events}
                  guestPresence={guestPresence[guest.id]}
                  familyGroupId={family.groupId}
                  familyName={family.name}
                  selectionMode={selectionMode}
                  isSelected={selectedGuestIds.has(guest.id)}
                  onSelectionChange={onSelectionChange}
                />
              </Box>
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>

      {showEditModal && (
        <EditFamilyForm
          family={family}
          familyGuests={family.members
            .map(id => {
              const g = allGuestMap ? allGuestMap.get(id) : guestsForEditing.find(g => g.id === id);
              return g && g.familyId === family.id ? g : undefined;
            })
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
      {familyRsvpSyncInfo && (
        <FamilyRsvpSyncDialog
          familyName={family.name}
          newStatus={familyRsvpSyncInfo.status}
          eventGuestPairs={commonOtherEvents}
          onClose={() => {
            setFamilyRsvpSyncInfo(null);
            onUpdate();
          }}
          onSynced={() => {
            setFamilyRsvpSyncInfo(null);
            onUpdate();
          }}
        />
      )}
    </>
  );
});
