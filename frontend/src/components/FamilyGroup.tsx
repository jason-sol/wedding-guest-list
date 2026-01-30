/**
 * Family Group component using MUI Accordion
 * Displays a collapsible family group with member list
 */

import { useState, useRef, useEffect } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Button,
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

interface EventWithPermission extends Event {
  permission: PermissionLevel;
}

interface FamilyGroupProps {
  family: Family;
  guests: Guest[];
  allGuests?: Guest[];
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
  const [isUpdatingRsvp, setIsUpdatingRsvp] = useState(false);
  const checkboxRef = useRef<HTMLInputElement>(null);

  const familyMembers = family.members
    .map(id => guests.find(g => g.id === id && g.familyId === family.id))
    .filter((g): g is Guest => g !== undefined);

  const guestsForEditing = allGuests || guests;

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

  // Calculate family RSVP status (show common status or null if mixed)
  const getFamilyRsvpStatus = (): RSVPStatus | null => {
    if (familyMembers.length === 0) return null;
    const statuses = familyMembers.map(m => m.rsvp || 'pending');
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
      // Update all family members
      await Promise.all(
        familyMembers.map(member =>
          updateGuest(eventId, member.id, { rsvp: newStatus })
        )
      );
      onUpdate();
    } catch (error) {
      console.error('Failed to update family RSVP:', error);
    } finally {
      setIsUpdatingRsvp(false);
    }
  };

  return (
    <>
      <Accordion
        expanded={isExpanded}
        onChange={(_, expanded) => !selectionMode && setIsExpanded(expanded)}
        disableGutters
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
              inputRef={checkboxRef}
              checked={allMembersSelected}
              onChange={handleFamilyCheckboxChange}
              onClick={(e) => e.stopPropagation()}
              inputProps={{ 'aria-label': `Select all members of ${family.name}` }}
            />
          )}

          <GroupIcon color="primary" />

          <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
            {family.name}
          </Typography>

          <Chip
            label={`${familyMembers.length} member${familyMembers.length !== 1 ? 's' : ''}`}
            size="small"
            variant="outlined"
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
                    <ToggleButton value="pending">
                      <HelpOutlineIcon sx={{ fontSize: '1rem' }} />
                    </ToggleButton>
                    <ToggleButton
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
            <Button
              size="small"
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={(e) => {
                e.stopPropagation();
                setShowEditModal(true);
              }}
            >
              Edit
            </Button>
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
