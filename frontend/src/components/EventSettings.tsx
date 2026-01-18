/**
 * Event Settings Modal using MUI Dialog
 * Edit event name, reconstruct families, and delete event
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Divider,
  Paper,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import { Event } from '../types';
import { updateEvent, deleteEvent, reconstructFamilies } from '../api';

interface EventSettingsProps {
  event: Event;
  events: Event[];
  onClose: () => void;
  onSuccess: () => void;
  onEventDeleted: () => void;
}

export default function EventSettings({
  event,
  events,
  onClose,
  onSuccess,
  onEventDeleted,
}: EventSettingsProps) {
  const [eventName, setEventName] = useState(event.name);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sourceEventId, setSourceEventId] = useState('');
  const [isReconstructing, setIsReconstructing] = useState(false);

  const otherEvents = events.filter(e => e.id !== event.id);

  const handleReconstructFamilies = async () => {
    if (!sourceEventId) {
      alert('Please select a source event');
      return;
    }

    setIsReconstructing(true);
    try {
      const result = await reconstructFamilies(event.id, sourceEventId);
      alert(`${result.message}\nFamilies created: ${result.familiesCreated}\nGuests updated: ${result.guestsUpdated}`);
      onSuccess();
    } catch (err) {
      console.error('Failed to reconstruct families:', err);
      alert(err instanceof Error ? err.message : 'Failed to reconstruct families');
    } finally {
      setIsReconstructing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!eventName.trim()) {
      alert('Please enter an event name');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateEvent(event.id, { name: eventName.trim() });
      onSuccess();
    } catch (err) {
      console.error('Failed to update event:', err);
      alert(err instanceof Error ? err.message : 'Failed to update event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteEvent(event.id);
      onEventDeleted();
    } catch (err) {
      console.error('Failed to delete event:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete event');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
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
            <SettingsIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Event Settings
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent dividers>
            <TextField
              fullWidth
              id="eventName"
              label="Event Name"
              value={eventName}
              onChange={e => setEventName(e.target.value)}
              required
              autoFocus
              disabled={isSubmitting}
              sx={{ mb: 3 }}
            />

            {otherEvents.length > 0 && (
              <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <GroupWorkIcon color="primary" />
                  <Typography variant="subtitle2" fontWeight={600}>
                    Reconstruct Families
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  If guests were copied to this event without their family groupings,
                  you can reconstruct them based on another event's families.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <FormControl size="small" sx={{ minWidth: 200, flex: 1 }}>
                    <InputLabel id="source-event-label">Source Event</InputLabel>
                    <Select
                      labelId="source-event-label"
                      value={sourceEventId}
                      label="Source Event"
                      onChange={e => setSourceEventId(e.target.value)}
                      disabled={isReconstructing}
                    >
                      {[...otherEvents]
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(e => (
                          <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                  <Button
                    variant="outlined"
                    onClick={handleReconstructFamilies}
                    disabled={isReconstructing || !sourceEventId}
                    startIcon={isReconstructing ? <CircularProgress size={16} /> : <GroupWorkIcon />}
                  >
                    {isReconstructing ? 'Reconstructing...' : 'Reconstruct'}
                  </Button>
                </Box>
              </Paper>
            )}

            <Divider sx={{ my: 2 }} />

            <Box>
              <Typography variant="subtitle2" fontWeight={600} color="error" sx={{ mb: 1 }}>
                Danger Zone
              </Typography>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSubmitting}
              >
                Delete Event
              </Button>
            </Box>
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
            >
              {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Save Changes'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 },
        }}
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight={600}>
            Delete Event
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to delete "{event.name}"?
          </Typography>
          <Alert severity="error">
            This will permanently delete all guests and families in this event. This action cannot be undone.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setShowDeleteConfirm(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? <CircularProgress size={20} color="inherit" /> : 'Yes, Delete Event'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
