/**
 * Cross-Event Sync Dialog
 * Reusable dialog for syncing changes (deletions, member removals) across events.
 * All events are pre-selected by default. Shows a spinner during apply.
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

interface CrossEventSyncDialogProps {
  title: string;
  description: string;
  events: Array<{ id: string; name: string }>;
  onApply: (selectedEventIds: string[]) => Promise<void>;
  onSkip: () => void;
}

export default function CrossEventSyncDialog({
  title,
  description,
  events,
  onApply,
  onSkip,
}: CrossEventSyncDialogProps) {
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(
    () => new Set(events.map(e => e.id))
  );
  const [isSyncing, setIsSyncing] = useState(false);

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
      await onApply(Array.from(selectedEventIds));
    } catch (error) {
      console.error('Failed to sync across events:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onSkip}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SyncIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            {title}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {description}
        </Typography>
        <FormGroup>
          {events.map(event => (
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
        <Button onClick={onSkip} disabled={isSyncing}>
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
