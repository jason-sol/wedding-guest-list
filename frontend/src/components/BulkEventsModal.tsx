/**
 * Bulk Events Modal using MUI Dialog
 * Manage event assignments for multiple selected guests
 */

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Chip,
  Stack,
  Paper,
  Divider,
  LinearProgress,
  Alert,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EventIcon from '@mui/icons-material/Event';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Event, PermissionLevel, Guest } from '../types';
import { copyGuest, deleteGuest } from '../api';

interface EventWithPermission extends Event {
  permission: PermissionLevel;
}

interface BulkEventsModalProps {
  selectedGuests: Guest[];
  events: EventWithPermission[];
  currentEventId: string;
  guestPresenceMap: Record<string, { id: string; name: string }[]>;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkEventsModal({
  selectedGuests,
  events,
  currentEventId,
  guestPresenceMap,
  onClose,
  onSuccess,
}: BulkEventsModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const allEvents = events.filter(e => e.permission === 'admin');
  const currentEvent = events.find(e => e.id === currentEventId);

  const getGuestEventIds = (guestId: string): Set<string> => {
    const presence = guestPresenceMap[guestId] || [];
    const eventIds = new Set(presence.map(e => e.id));
    eventIds.add(currentEventId);
    return eventIds;
  };

  const eventStats = [...allEvents]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(event => {
      const guestsInEvent = selectedGuests.filter(g => {
        const eventIds = getGuestEventIds(g.id);
        return eventIds.has(event.id);
      });
      return {
        event,
        count: guestsInEvent.length,
        total: selectedGuests.length,
        allIn: guestsInEvent.length === selectedGuests.length,
        noneIn: guestsInEvent.length === 0,
      };
    });

  const handleAddToEvent = async (targetEventId: string) => {
    if (targetEventId === currentEventId) return;

    setIsProcessing(true);
    try {
      for (const guest of selectedGuests) {
        const eventIds = getGuestEventIds(guest.id);
        if (!eventIds.has(targetEventId)) {
          await copyGuest(currentEventId, guest.id, targetEventId);
        }
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to add guests to event:', error);
      alert('Failed to add some guests to event');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveGuests = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setIsProcessing(true);
    try {
      for (const guest of selectedGuests) {
        await deleteGuest(currentEventId, guest.id);
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to remove guests:', error);
      alert('Failed to remove some guests');
    } finally {
      setIsProcessing(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <EventIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Manage {selectedGuests.length} Guest{selectedGuests.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {isProcessing && <LinearProgress sx={{ mb: 2 }} />}

        {/* Selected Guests Summary */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight={500} color="text.secondary" sx={{ mb: 1 }}>
            Selected:
          </Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {selectedGuests.slice(0, 5).map(g => (
              <Chip
                key={g.id}
                label={`${g.firstName} ${g.lastName}`}
                size="small"
                variant="outlined"
              />
            ))}
            {selectedGuests.length > 5 && (
              <Chip
                label={`+${selectedGuests.length - 5} more`}
                size="small"
                color="primary"
              />
            )}
          </Stack>
        </Box>

        {/* Add to Events Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
            Add to Events
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Click an event to add all selected guests. Guests already in an event will be skipped.
          </Typography>
          <Stack spacing={1}>
            {eventStats.map(({ event, count, total, allIn }) => (
              <Paper
                key={event.id}
                variant="outlined"
                sx={{
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box>
                  <Typography variant="body1" fontWeight={500}>
                    {event.name}
                    {event.id === currentEventId && (
                      <Chip label="current" size="small" sx={{ ml: 1, height: 20 }} />
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {count}/{total} guests in this event
                  </Typography>
                </Box>
                {event.id !== currentEventId && (
                  <Button
                    variant={allIn ? 'outlined' : 'contained'}
                    size="small"
                    startIcon={allIn ? <CheckCircleIcon /> : <AddIcon />}
                    onClick={() => handleAddToEvent(event.id)}
                    disabled={isProcessing || allIn}
                    color={allIn ? 'success' : 'primary'}
                  >
                    {allIn ? 'All Added' : `Add ${total - count}`}
                  </Button>
                )}
              </Paper>
            ))}
          </Stack>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Remove Section */}
        <Box>
          <Typography variant="subtitle2" fontWeight={600} color="error" sx={{ mb: 2 }}>
            Remove from {currentEvent?.name || 'Event'}
          </Typography>
          {!showDeleteConfirm ? (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleRemoveGuests}
              disabled={isProcessing}
            >
              Remove {selectedGuests.length} Guest{selectedGuests.length !== 1 ? 's' : ''}
            </Button>
          ) : (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              action={
                <Stack direction="row" spacing={1}>
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isProcessing}
                  >
                    Cancel
                  </Button>
                  <Button
                    color="inherit"
                    size="small"
                    variant="outlined"
                    onClick={handleRemoveGuests}
                    disabled={isProcessing}
                  >
                    {isProcessing ? <CircularProgress size={16} /> : 'Confirm'}
                  </Button>
                </Stack>
              }
            >
              Remove {selectedGuests.length} guest{selectedGuests.length !== 1 ? 's' : ''} from {currentEvent?.name}?
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isProcessing}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
