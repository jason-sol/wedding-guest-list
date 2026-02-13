/**
 * RSVP Sync Dialog
 * After an RSVP change, offers to apply the same status to other events
 */

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Box,
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import { RSVPStatus } from '../types';
import { updateGuest, GuestPresenceInfo } from '../api';

interface RsvpSyncDialogProps {
  guestName: string;
  newStatus: RSVPStatus;
  /** Events (other than current) where this guest exists */
  otherEvents: GuestPresenceInfo[];
  onClose: () => void;
  onSynced: () => void;
}

export default function RsvpSyncDialog({
  guestName,
  newStatus,
  otherEvents,
  onClose,
  onSynced,
}: RsvpSyncDialogProps) {
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(
    () => new Set(otherEvents.map(e => e.id))
  );
  const [isSyncing, setIsSyncing] = useState(false);

  const statusLabels: Record<RSVPStatus, string> = {
    accepted: 'Attending',
    pending: 'Pending',
    declined: 'Declined',
  };

  const toggleEvent = (eventId: string) => {
    setSelectedEventIds(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const handleApply = async () => {
    setIsSyncing(true);
    try {
      for (const event of otherEvents) {
        if (selectedEventIds.has(event.id)) {
          await updateGuest(event.id, event.guestId, { rsvp: newStatus });
        }
      }
      onSynced();
    } catch (error) {
      console.error('Failed to sync RSVP:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SyncIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Sync RSVP
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {guestName}'s RSVP updated to <strong>{statusLabels[newStatus]}</strong>.
          Apply to other events?
        </Typography>
        <FormGroup>
          {otherEvents.map(event => (
            <FormControlLabel
              key={event.id}
              control={
                <Checkbox
                  checked={selectedEventIds.has(event.id)}
                  onChange={() => toggleEvent(event.id)}
                  disabled={isSyncing}
                />
              }
              label={event.name}
            />
          ))}
        </FormGroup>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isSyncing}>
          Skip
        </Button>
        <Button
          variant="contained"
          onClick={handleApply}
          disabled={isSyncing || selectedEventIds.size === 0}
        >
          {isSyncing ? <CircularProgress size={20} color="inherit" /> : 'Apply'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface FamilyRsvpSyncDialogProps {
  familyName: string;
  newStatus: RSVPStatus;
  /** Array of {eventId, guestIds[]} pairs for events where ALL family members exist */
  eventGuestPairs: Array<{ eventId: string; eventName: string; guestIds: string[] }>;
  onClose: () => void;
  onSynced: () => void;
}

export function FamilyRsvpSyncDialog({
  familyName,
  newStatus,
  eventGuestPairs,
  onClose,
  onSynced,
}: FamilyRsvpSyncDialogProps) {
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(
    () => new Set(eventGuestPairs.map(e => e.eventId))
  );
  const [isSyncing, setIsSyncing] = useState(false);

  const statusLabels: Record<RSVPStatus, string> = {
    accepted: 'Attending',
    pending: 'Pending',
    declined: 'Declined',
  };

  const toggleEvent = (eventId: string) => {
    setSelectedEventIds(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const handleApply = async () => {
    setIsSyncing(true);
    try {
      for (const pair of eventGuestPairs) {
        if (selectedEventIds.has(pair.eventId)) {
          await Promise.all(
            pair.guestIds.map(guestId =>
              updateGuest(pair.eventId, guestId, { rsvp: newStatus })
            )
          );
        }
      }
      onSynced();
    } catch (error) {
      console.error('Failed to sync family RSVP:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SyncIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Sync Family RSVP
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {familyName} family RSVP updated to <strong>{statusLabels[newStatus]}</strong>.
          Apply to other events?
        </Typography>
        <FormGroup>
          {eventGuestPairs.map(pair => (
            <FormControlLabel
              key={pair.eventId}
              control={
                <Checkbox
                  checked={selectedEventIds.has(pair.eventId)}
                  onChange={() => toggleEvent(pair.eventId)}
                  disabled={isSyncing}
                />
              }
              label={pair.eventName}
            />
          ))}
        </FormGroup>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isSyncing}>
          Skip
        </Button>
        <Button
          variant="contained"
          onClick={handleApply}
          disabled={isSyncing || selectedEventIds.size === 0}
        >
          {isSyncing ? <CircularProgress size={20} color="inherit" /> : 'Apply'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
