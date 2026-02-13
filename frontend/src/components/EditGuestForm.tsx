/**
 * Edit Guest Form using MUI Dialog
 * Edit, delete, or manage event assignments for an existing guest
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Divider,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import { Guest, Category, CategoryInfo, Event, PermissionLevel, AgeGroup } from '../types';
import { updateGuest, deleteGuest, copyGuest, GuestPresenceInfo } from '../api';
import CategoryDropdown from './CategoryDropdown';
import CrossEventSyncDialog from './CrossEventSyncDialog';

interface EventWithPermission extends Event {
  permission: PermissionLevel;
}

interface EditGuestFormProps {
  guest: Guest;
  categories: CategoryInfo[];
  eventId: string;
  onClose: () => void;
  onSuccess: () => void;
  events?: EventWithPermission[];
  guestPresence?: GuestPresenceInfo[];
}

export default function EditGuestForm({
  guest,
  categories,
  eventId,
  onClose,
  onSuccess,
  events = [],
  guestPresence = [],
}: EditGuestFormProps) {
  const [firstName, setFirstName] = useState(guest.firstName);
  const [lastName, setLastName] = useState(guest.lastName);
  const [selectedTags, setSelectedTags] = useState<Category[]>(guest.tags || []);
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(guest.ageGroup || 'adult');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [nameSyncInfo, setNameSyncInfo] = useState<{ firstName: string; lastName: string } | null>(null);

  const alreadyInEventIds = new Set(guestPresence.map(e => e.id));

  const otherAdminEvents = events.filter(
    e => e.id !== eventId && e.permission === 'admin'
  );

  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(() => {
    return new Set(guestPresence.map(e => e.id));
  });

  const toggleEvent = (evtId: string) => {
    setSelectedEventIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(evtId)) {
        newSet.delete(evtId);
      } else {
        newSet.add(evtId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    setFirstName(guest.firstName);
    setLastName(guest.lastName);
    setSelectedTags(guest.tags || []);
    setAgeGroup(guest.ageGroup || 'adult');
    setSelectedEventIds(new Set(guestPresence.map(e => e.id)));
  }, [guest, guestPresence]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    try {
      await updateGuest(eventId, guest.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        tags: selectedTags,
        ageGroup,
      });

      const eventsToAdd = Array.from(selectedEventIds).filter(id => !alreadyInEventIds.has(id));
      const eventsToRemove = Array.from(alreadyInEventIds).filter(id => !selectedEventIds.has(id));

      for (const targetEventId of eventsToAdd) {
        try {
          await copyGuest(eventId, guest.id, targetEventId);
        } catch (err) {
          console.error(`Failed to copy guest to event ${targetEventId}:`, err);
        }
      }

      for (const targetEventId of eventsToRemove) {
        try {
          const presenceInfo = guestPresence.find(p => p.id === targetEventId);
          if (presenceInfo) {
            await deleteGuest(targetEventId, presenceInfo.guestId);
          }
        } catch (err) {
          console.error(`Failed to remove guest from event ${targetEventId}:`, err);
        }
      }

      // If name changed and guest exists in other events, show sync dialog
      const nameChanged =
        firstName.trim().toLowerCase() !== guest.firstName.toLowerCase() ||
        lastName.trim().toLowerCase() !== guest.lastName.toLowerCase();

      if (nameChanged && guestPresence.length > 0) {
        setNameSyncInfo({ firstName: firstName.trim(), lastName: lastName.trim() });
        return; // Don't call onSuccess yet — wait for dialog
      }

      onSuccess();
    } catch (error) {
      console.error('Failed to update guest:', error);
      alert('Failed to update guest');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirmed = async (selectedEventIds: string[]) => {
    setIsSubmitting(true);
    try {
      // Delete from current event
      await deleteGuest(eventId, guest.id);

      // Delete from selected other events
      for (const otherEventId of selectedEventIds) {
        const presenceInfo = guestPresence.find(p => p.id === otherEventId);
        if (presenceInfo) {
          try {
            await deleteGuest(otherEventId, presenceInfo.guestId);
          } catch (err) {
            console.error(`Failed to delete guest from event ${otherEventId}:`, err);
          }
        }
      }

      onSuccess();
    } catch (error) {
      console.error('Failed to delete guest:', error);
      alert('Failed to delete guest');
      setIsSubmitting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleNameSyncApply = async (selectedEventIds: string[]) => {
    if (!nameSyncInfo) return;
    const errors: string[] = [];
    for (const otherEventId of selectedEventIds) {
      const presenceInfo = guestPresence.find(p => p.id === otherEventId);
      if (presenceInfo) {
        try {
          await updateGuest(otherEventId, presenceInfo.guestId, {
            firstName: nameSyncInfo.firstName,
            lastName: nameSyncInfo.lastName,
          });
        } catch (err) {
          const eventName = presenceInfo.name || otherEventId;
          errors.push(eventName);
          console.error(`Failed to sync name to event ${otherEventId}:`, err);
        }
      }
    }
    if (errors.length > 0) {
      alert(`Failed to sync name to: ${errors.join(', ')}`);
    }
    setNameSyncInfo(null);
    onSuccess();
  };

  const handleDeleteCurrentOnly = async () => {
    setIsSubmitting(true);
    try {
      await deleteGuest(eventId, guest.id);
      onSuccess();
    } catch (error) {
      console.error('Failed to delete guest:', error);
      alert('Failed to delete guest');
      setIsSubmitting(false);
      setShowDeleteDialog(false);
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
          <EditIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Edit Guest
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              fullWidth
              id="firstName"
              label="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoFocus
              disabled={isSubmitting}
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
            <TextField
              fullWidth
              id="lastName"
              label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={isSubmitting}
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" fontWeight={500} color="text.secondary" sx={{ mb: 1 }}>
              Age Group
            </Typography>
            <ToggleButtonGroup
              value={ageGroup}
              exclusive
              onChange={(_, val) => val && setAgeGroup(val)}
              size="small"
            >
              <ToggleButton value="adult">
                <PersonIcon sx={{ mr: 0.5, fontSize: '1.1rem' }} />
                Adult
              </ToggleButton>
              <ToggleButton value="child">
                <ChildCareIcon sx={{ mr: 0.5, fontSize: '1.1rem' }} />
                Child
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <CategoryDropdown
            categories={categories}
            selectedCategories={selectedTags}
            onSelect={(category) => {
              if (!selectedTags.includes(category)) {
                setSelectedTags([...selectedTags, category]);
              }
            }}
            onRemove={(category) => {
              setSelectedTags(selectedTags.filter(t => t !== category));
            }}
          />

          {otherAdminEvents.length > 0 && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="body2" fontWeight={500} color="text.secondary" sx={{ mb: 1.5 }}>
                Event Invitations:
              </Typography>
              <FormGroup>
                {[...otherAdminEvents]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(event => (
                    <FormControlLabel
                      key={event.id}
                      control={
                        <Checkbox
                          checked={selectedEventIds.has(event.id)}
                          onChange={() => toggleEvent(event.id)}
                          disabled={isSubmitting}
                        />
                      }
                      label={event.name}
                    />
                  ))}
              </FormGroup>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
          <Button
            color="error"
            onClick={handleDelete}
            disabled={isSubmitting}
            startIcon={<DeleteIcon />}
          >
            Remove Guest
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
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
          </Box>
        </DialogActions>
      </Box>
    </Dialog>

    {nameSyncInfo && (
      <CrossEventSyncDialog
        title="Sync Name Change"
        description={`${guest.firstName} ${guest.lastName} was renamed to ${nameSyncInfo.firstName} ${nameSyncInfo.lastName}. Also update in these events?`}
        events={guestPresence}
        onApply={handleNameSyncApply}
        onSkip={() => {
          setNameSyncInfo(null);
          onSuccess();
        }}
      />
    )}

    {showDeleteDialog && (
      guestPresence.length > 0 ? (
        <CrossEventSyncDialog
          title="Remove Guest"
          description={`Are you sure you want to remove ${guest.firstName} ${guest.lastName}? Also remove from these events:`}
          events={guestPresence}
          onApply={handleDeleteConfirmed}
          onSkip={handleDeleteCurrentOnly}
        />
      ) : (
        // No other events — use a simple confirmation dialog
        <Dialog
          open
          onClose={() => setShowDeleteDialog(false)}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          <DialogTitle>
            <Typography variant="h6" fontWeight={600}>
              Remove Guest
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2">
              Are you sure you want to remove {guest.firstName} {guest.lastName}? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setShowDeleteDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteCurrentOnly}
              disabled={isSubmitting}
            >
              {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Remove'}
            </Button>
          </DialogActions>
        </Dialog>
      )
    )}
  </>
  );
}
