/**
 * Guest Item component using MUI
 * Displays a single guest with categories, RSVP toggle, actions, and selection support
 */

import { useState, memo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
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
import ChildCareIcon from '@mui/icons-material/ChildCare';
import { Guest, CategoryInfo, Event, PermissionLevel, RSVPStatus } from '../types';
import { removeGuestFromFamily, updateGuest, fetchFamilies, GuestPresenceInfo } from '../api';
import CategoryTag from './CategoryTag';
import AssignToFamilyModal from './AssignToFamilyModal';
import EditGuestForm from './EditGuestForm';
import RsvpSyncDialog from './RsvpSyncDialog';
import CrossEventSyncDialog from './CrossEventSyncDialog';

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
  familyGroupId?: string;
  familyName?: string;
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (guestId: string, selected: boolean) => void;
}

export default memo(function GuestItem({
  guest,
  categories,
  onUpdate,
  eventId,
  readOnly = false,
  events = [],
  guestPresence = [],
  familyGroupId,
  familyName,
  selectionMode = false,
  isSelected = false,
  onSelectionChange,
}: GuestItemProps) {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isUpdatingRsvp, setIsUpdatingRsvp] = useState(false);
  const [rsvpSyncInfo, setRsvpSyncInfo] = useState<{ status: RSVPStatus } | null>(null);
  const [showRemoveFamilySyncDialog, setShowRemoveFamilySyncDialog] = useState(false);

  const handleRsvpChange = async (_: React.MouseEvent<HTMLElement>, newRsvp: RSVPStatus | null) => {
    if (!newRsvp || readOnly || isUpdatingRsvp) return;

    setIsUpdatingRsvp(true);
    try {
      await updateGuest(eventId, guest.id, { rsvp: newRsvp });
      // If guest exists in other events, show sync dialog and defer data reload
      // The dialog's onClose/onSynced callbacks will trigger onUpdate()
      if (guestPresence.length > 0) {
        setRsvpSyncInfo({ status: newRsvp });
      } else {
        onUpdate();
      }
    } catch (error) {
      console.error('Failed to update RSVP:', error);
    } finally {
      setIsUpdatingRsvp(false);
    }
  };

  const handleRemoveFromFamily = async () => {
    if (!guest.familyId) return;

    try {
      await removeGuestFromFamily(eventId, guest.familyId, guest.id);

      // If guest has presence in other events and family has a groupId, show sync dialog
      if (guestPresence.length > 0 && familyGroupId) {
        setShowRemoveFamilySyncDialog(true);
      } else {
        onUpdate();
      }
    } catch (error) {
      console.error('Failed to remove guest from family:', error);
      alert('Failed to remove guest from family');
    }
  };

  const handleRemoveFamilySyncApply = async (selectedEventIds: string[]) => {
    for (const otherEventId of selectedEventIds) {
      try {
        const presenceInfo = guestPresence.find(p => p.id === otherEventId);
        if (!presenceInfo) continue;

        // Find the family with the same groupId in the other event, fall back to name
        const otherFamilies = await fetchFamilies(otherEventId);
        let matchingFamily = otherFamilies.find(f => f.groupId === familyGroupId);
        if (!matchingFamily && familyName) {
          matchingFamily = otherFamilies.find(
            f => f.name.toLowerCase() === familyName.toLowerCase()
          );
        }
        if (matchingFamily) {
          await removeGuestFromFamily(otherEventId, matchingFamily.id, presenceInfo.guestId);
        }
      } catch (err) {
        console.error(`Failed to remove from family in event ${otherEventId}:`, err);
      }
    }
    setShowRemoveFamilySyncDialog(false);
    onUpdate();
  };

  return (
    <>
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 1.5, sm: 2 },
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 1, sm: 2 },
          bgcolor: isSelected ? 'action.selected' : 'background.paper',
          transition: 'background-color 0.2s',
          '&:hover': {
            bgcolor: isSelected ? 'action.selected' : 'action.hover',
          },
        }}
      >
        {selectionMode && (
          <Checkbox
            disableRipple
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
            {guest.ageGroup === 'child' && (
              <Chip
                icon={<ChildCareIcon sx={{ fontSize: '0.85rem' }} />}
                label="Child"
                size="small"
                color="info"
                variant="outlined"
                sx={{ height: 22, fontSize: '0.7rem', '& .MuiChip-label': { px: 0.5 } }}
              />
            )}
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
                  <Tooltip title="Attending">
                    <EventAvailableIcon fontSize="small" />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton disableRipple value="pending">
                  <Tooltip title="Pending">
                    <HelpOutlineIcon fontSize="small" />
                  </Tooltip>
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
          <Stack direction="row" spacing={1} sx={{ alignSelf: { xs: 'flex-end', sm: 'center' } }}>
            {!guest.familyId && (
              <>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<GroupAddIcon />}
                  onClick={() => setShowAssignModal(true)}
                  sx={{ whiteSpace: 'nowrap', display: { xs: 'none', sm: 'inline-flex' } }}
                >
                  Assign to Family
                </Button>
                <Tooltip title="Assign to Family">
                  <IconButton
                    size="small"
                    onClick={() => setShowAssignModal(true)}
                    sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
                  >
                    <GroupAddIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
            {guest.familyId && (
              <>
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  startIcon={<GroupRemoveIcon />}
                  onClick={handleRemoveFromFamily}
                  sx={{ whiteSpace: 'nowrap', display: { xs: 'none', sm: 'inline-flex' } }}
                >
                  Remove from Family
                </Button>
                <Tooltip title="Remove from Family">
                  <IconButton
                    size="small"
                    color="warning"
                    onClick={handleRemoveFromFamily}
                    sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
                  >
                    <GroupRemoveIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
            <Button
              size="small"
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => setShowEditModal(true)}
              sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
            >
              Edit
            </Button>
            <IconButton
              size="small"
              color="primary"
              onClick={() => setShowEditModal(true)}
              sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
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
      {rsvpSyncInfo && (
        <RsvpSyncDialog
          guestName={`${guest.firstName} ${guest.lastName}`.trim()}
          newStatus={rsvpSyncInfo.status}
          otherEvents={guestPresence}
          onClose={() => {
            setRsvpSyncInfo(null);
            onUpdate();
          }}
          onSynced={() => {
            setRsvpSyncInfo(null);
            onUpdate();
          }}
        />
      )}
      {showRemoveFamilySyncDialog && guestPresence.length > 0 && (
        <CrossEventSyncDialog
          title="Sync Family Removal"
          description={`${guest.firstName} ${guest.lastName} was removed from their family. Also remove from family in other events?`}
          events={guestPresence}
          onApply={handleRemoveFamilySyncApply}
          onSkip={() => {
            setShowRemoveFamilySyncDialog(false);
            onUpdate();
          }}
        />
      )}
    </>
  );
});
