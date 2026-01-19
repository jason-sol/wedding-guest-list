/**
 * Add Guest Form using MUI Dialog
 * Creates a new guest with optional category tags and event assignments
 */

import { useState } from 'react';
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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { Category, CategoryInfo, Event, PermissionLevel } from '../types';
import { addGuest, copyGuest } from '../api';
import CategoryDropdown from './CategoryDropdown';

interface EventWithPermission extends Event {
  permission: PermissionLevel;
}

interface GuestFormProps {
  onClose: () => void;
  onSuccess: () => void;
  categories: CategoryInfo[];
  eventId: string;
  events?: EventWithPermission[];
  currentEventName?: string;
}

export default function GuestForm({
  onClose,
  onSuccess,
  categories,
  eventId,
  events = [],
}: GuestFormProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedTags, setSelectedTags] = useState<Category[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const otherAdminEvents = events.filter(
    e => e.id !== eventId && e.permission === 'admin'
  );

  const toggleEvent = (eventId: string) => {
    setSelectedEvents(prev =>
      prev.includes(eventId)
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    try {
      const newGuest = await addGuest(eventId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        familyId: null,
        tags: selectedTags,
      });

      for (const targetEventId of selectedEvents) {
        try {
          await copyGuest(eventId, newGuest.id, targetEventId);
        } catch (err) {
          console.error(`Failed to copy guest to event ${targetEventId}:`, err);
        }
      }

      onSuccess();
    } catch (error) {
      console.error('Failed to add guest:', error);
      alert('Failed to add guest');
    } finally {
      setIsSubmitting(false);
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
          <PersonAddIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Add Guest
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
              placeholder="Optional"
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
              placeholder="Optional"
              disabled={isSubmitting}
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
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
                Also add to other events:
              </Typography>
              <FormGroup>
                {[...otherAdminEvents]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(event => (
                    <FormControlLabel
                      key={event.id}
                      control={
                        <Checkbox
                          checked={selectedEvents.includes(event.id)}
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

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Add Guest'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
