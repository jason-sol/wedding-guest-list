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
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import GroupIcon from '@mui/icons-material/Group';
import { Family, Guest, CategoryInfo, Event, PermissionLevel } from '../types';
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
