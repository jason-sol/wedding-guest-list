/**
 * Guest Item component using MUI
 * Displays a single guest with categories, actions, and selection support
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
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import GroupRemoveIcon from '@mui/icons-material/GroupRemove';
import { Guest, CategoryInfo, Event, PermissionLevel } from '../types';
import { removeGuestFromFamily, GuestPresenceInfo } from '../api';
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
