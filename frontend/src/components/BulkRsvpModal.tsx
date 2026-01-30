/**
 * Bulk RSVP Modal using MUI Dialog
 * Allows setting RSVP status for multiple selected guests at once
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
  Stack,
  CircularProgress,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RsvpIcon from '@mui/icons-material/Rsvp';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Guest, RSVPStatus } from '../types';
import { bulkUpdateRsvp } from '../api';

interface BulkRsvpModalProps {
  selectedGuests: Guest[];
  eventId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkRsvpModal({
  selectedGuests,
  eventId,
  onClose,
  onSuccess,
}: BulkRsvpModalProps) {
  const [selectedRsvp, setSelectedRsvp] = useState<RSVPStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedRsvp) return;

    setIsProcessing(true);
    setError(null);

    try {
      const guestIds = selectedGuests.map(g => g.id);
      const result = await bulkUpdateRsvp(eventId, guestIds, selectedRsvp);

      if (result.errors && result.errors.length > 0) {
        console.warn('Some RSVP updates failed:', result.errors);
      }

      onSuccess();
    } catch (err) {
      console.error('Failed to update RSVP:', err);
      setError(err instanceof Error ? err.message : 'Failed to update RSVP status');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog
      open
      onClose={isProcessing ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <RsvpIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Update RSVP Status
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" disabled={isProcessing}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 3 }}>
          Updating RSVP for <strong>{selectedGuests.length}</strong> selected guest{selectedGuests.length !== 1 ? 's' : ''}.
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Typography variant="body2" fontWeight={500} sx={{ mb: 2 }}>
          Select RSVP Status:
        </Typography>

        <ToggleButtonGroup
          value={selectedRsvp}
          exclusive
          onChange={(_, value) => setSelectedRsvp(value)}
          fullWidth
          sx={{ mb: 2 }}
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
            <Stack direction="row" spacing={1} alignItems="center">
              <EventAvailableIcon />
              <span>Attending</span>
            </Stack>
          </ToggleButton>
          <ToggleButton value="pending">
            <Stack direction="row" spacing={1} alignItems="center">
              <HelpOutlineIcon />
              <span>Pending</span>
            </Stack>
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
            <Stack direction="row" spacing={1} alignItems="center">
              <EventBusyIcon />
              <span>Declined</span>
            </Stack>
          </ToggleButton>
        </ToggleButtonGroup>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isProcessing}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isProcessing || !selectedRsvp}
        >
          {isProcessing ? <CircularProgress size={20} /> : 'Update All'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
