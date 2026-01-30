/**
 * Guest Item component using MUI
 * Displays a single guest with categories, RSVP toggle, actions, and selection support
 */

import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Checkbox,
  Stack,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import GroupRemoveIcon from '@mui/icons-material/GroupRemove';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import { Guest, CategoryInfo, Event, PermissionLevel, RSVPStatus } from '../types';
import { removeGuestFromFamily, updateGuest, GuestPresenceInfo } from '../api';
import CategoryTag from './CategoryTag';
import AssignToFamilyModal from './AssignToFamilyModal';
import EditGuestForm from './EditGuestForm';

interface EventWithPermission extends Event {
  permission: PermissionLevel;
}

interface GuestItemProps {
  guest: Guest;
  categories: CategoryInfo[];
  onUpdate: () => void;
  eventId: string;
  readOnly?: boolean;
  events?: EventWithPermission[];
  guestPresence?: GuestPresenceInfo[];
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (guestId: string, selected: boolean) => void;
}

export default function GuestItem({
  guest,
  categories,
  onUpdate,
  eventId,
  readOnly = false,
  events = [],
  guestPresence = [],
  selectionMode = false,
  isSelected = false,
  onSelectionChange,
}: GuestItemProps) {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isUpdatingRsvp, setIsUpdatingRsvp] = useState(false);

  const handleRsvpChange = async (_: React.MouseEvent<HTMLElement>, newRsvp: RSVPStatus | null) => {
    if (!newRsvp || readOnly || isUpdatingRsvp) return;

    setIsUpdatingRsvp(true);
    try {
      await updateGuest(eventId, guest.id, { rsvp: newRsvp });
      onUpdate();
    } catch (error) {
      console.error('Failed to update RSVP:', error);
    } finally {
      setIsUpdatingRsvp(false);
    }
  };

  const handleRemoveFromFamily = async () => {
    if (!guest.familyId) return;

    if (window.confirm(`Remove ${guest.firstName} ${guest.lastName} from their family?`)) {
      try {
        await removeGuestFromFamily(eventId, guest.familyId, guest.id);
        onUpdate();
      } catch (error) {
        console.error('Failed to remove guest from family:', error);
        alert('Failed to remove guest from family');
      }
    }
  };

  return (
    <>
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          bgcolor: isSelected ? 'action.selected' : 'background.paper',
          transition: 'background-color 0.2s',
          '&:hover': {
            bgcolor: isSelected ? 'action.selected' : 'action.hover',
          },
        }}
      >
        {selectionMode && (
          <Checkbox
            checked={isSelected}
            onChange={(e) => onSelectionChange?.(guest.id, e.target.checked)}
            inputProps={{ 'aria-label': `Select ${guest.firstName} ${guest.lastName}` }}
          />
        )}

        {/* Guest Name and Event Badges */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="body1" fontWeight={500}>
              {guest.firstName}
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {guest.lastName}
            </Typography>
            {guestPresence.length > 0 && (
              <Stack direction="row" spacing={0.5}>
                {guestPresence.map((event) => (
                  <Chip
                    key={event.id}
                    label={event.name}
                    size="small"
                    variant="outlined"
                    sx={{
                      height: 20,
                      fontSize: '0.7rem',
                      '& .MuiChip-label': { px: 1 },
                    }}
                  />
                ))}
              </Stack>
            )}
          </Box>

          {/* RSVP Toggle and Dietary Indicator */}
          {!selectionMode && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <ToggleButtonGroup
                value={guest.rsvp || 'pending'}
                exclusive
                onChange={handleRsvpChange}
                size="small"
                disabled={readOnly || isUpdatingRsvp}
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
                  <Tooltip title="Attending">
                    <EventAvailableIcon fontSize="small" />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="pending">
                  <Tooltip title="Pending">
                    <HelpOutlineIcon fontSize="small" />
                  </Tooltip>
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
                  <Tooltip title="Declined">
                    <EventBusyIcon fontSize="small" />
                  </Tooltip>
                </ToggleButton>
              </ToggleButtonGroup>
              {guest.dietaryRequirements && (
                <Tooltip title={`Dietary: ${guest.dietaryRequirements}`}>
                  <RestaurantIcon fontSize="small" color="action" />
                </Tooltip>
              )}
            </Box>
          )}

          {/* Category Tags */}
          {guest.tags.length > 0 && (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
              {[...guest.tags].sort().map((tag, index) => {
                const catInfo = categories.find(c => c.name === tag);
                return (
                  <CategoryTag key={index} category={tag} categoryInfo={catInfo} />
                );
              })}
            </Stack>
          )}
        </Box>

        {/* Actions */}
        {!readOnly && !selectionMode && (
          <Stack direction="row" spacing={1}>
            {!guest.familyId && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<GroupAddIcon />}
                onClick={() => setShowAssignModal(true)}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Assign to Family
              </Button>
            )}
            {guest.familyId && (
              <Button
                size="small"
                variant="outlined"
                color="warning"
                startIcon={<GroupRemoveIcon />}
                onClick={handleRemoveFromFamily}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Remove from Family
              </Button>
            )}
            <Button
              size="small"
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => setShowEditModal(true)}
            >
              Edit
            </Button>
          </Stack>
        )}
      </Paper>

      {showAssignModal && (
        <AssignToFamilyModal
          guest={guest}
          eventId={eventId}
          onClose={() => setShowAssignModal(false)}
          onSuccess={() => {
            setShowAssignModal(false);
            onUpdate();
          }}
        />
      )}
      {showEditModal && (
        <EditGuestForm
          guest={guest}
          categories={categories}
          eventId={eventId}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            onUpdate();
          }}
          events={events}
          guestPresence={guestPresence}
        />
      )}
    </>
  );
}
