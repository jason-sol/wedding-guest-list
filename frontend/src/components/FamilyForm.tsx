/**
 * Add Family Form using MUI Dialog
 * Creates a new family with new members and/or existing guests
 */

import { useState, useEffect, useRef } from 'react';
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
  Stack,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { Category, CategoryInfo, Guest, Event, PermissionLevel } from '../types';
import { addFamily, addGuestToFamily, copyFamily } from '../api';
import CategoryDropdown from './CategoryDropdown';

interface EventWithPermission extends Event {
  permission: PermissionLevel;
}

interface FamilyFormProps {
  onClose: () => void;
  onSuccess: () => void;
  categories: CategoryInfo[];
  guests: Guest[];
  eventId: string;
  events?: EventWithPermission[];
}

interface FamilyMember {
  firstName: string;
  lastName: string;
}

export default function FamilyForm({
  onClose,
  onSuccess,
  categories,
  guests,
  eventId,
  events = [],
}: FamilyFormProps) {
  const [familyName, setFamilyName] = useState('');
  const [members, setMembers] = useState<FamilyMember[]>([
    { firstName: '', lastName: '' },
  ]);
  const [selectedExistingGuests, setSelectedExistingGuests] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<Category[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const manuallyEditedMembersRef = useRef<Set<number>>(new Set());

  const availableGuests = guests.filter(g => !g.familyId);

  const otherAdminEvents = events.filter(
    e => e.id !== eventId && e.permission === 'admin'
  );

  const toggleEvent = (evtId: string) => {
    setSelectedEvents(prev =>
      prev.includes(evtId)
        ? prev.filter(id => id !== evtId)
        : [...prev, evtId]
    );
  };

  useEffect(() => {
    if (familyName.trim()) {
      setMembers(prevMembers =>
        prevMembers.map((member, index) => {
          if (!manuallyEditedMembersRef.current.has(index)) {
            return { ...member, lastName: familyName.trim() };
          }
          return member;
        })
      );
    }
  }, [familyName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!familyName.trim()) {
      alert('Please enter a family name');
      return;
    }

    const membersToAdd = members.filter(
      (m) => m.firstName.trim() || m.lastName.trim()
    );

    if (membersToAdd.length === 0 && selectedExistingGuests.length === 0) {
      alert('Please add at least one family member (new or existing)');
      return;
    }

    setIsSubmitting(true);
    try {
      const newFamily = await addFamily(eventId, {
        name: familyName.trim(),
        members: membersToAdd.map((m) => ({
          firstName: m.firstName.trim(),
          lastName: m.lastName.trim(),
          tags: selectedTags,
        })),
      });

      for (const guestId of selectedExistingGuests) {
        await addGuestToFamily(eventId, newFamily.id, guestId);
      }

      for (const targetEventId of selectedEvents) {
        try {
          await copyFamily(eventId, newFamily.id, targetEventId);
        } catch (err) {
          console.error(`Failed to copy family to event ${targetEventId}:`, err);
        }
      }

      onSuccess();
    } catch (error) {
      console.error('Failed to add family:', error);
      alert('Failed to add family');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addMember = () => {
    setMembers([...members, { firstName: '', lastName: familyName.trim() }]);
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
    const updated = new Set<number>();
    manuallyEditedMembersRef.current.forEach(i => {
      if (i < index) {
        updated.add(i);
      } else if (i > index) {
        updated.add(i - 1);
      }
    });
    manuallyEditedMembersRef.current = updated;
  };

  const updateMember = (index: number, field: keyof FamilyMember, value: string) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    setMembers(updated);

    if (field === 'lastName') {
      manuallyEditedMembersRef.current.add(index);
    }
  };

  const addExistingGuest = (guestId: string) => {
    if (!selectedExistingGuests.includes(guestId)) {
      setSelectedExistingGuests([...selectedExistingGuests, guestId]);
    }
  };

  const removeExistingGuest = (guestId: string) => {
    setSelectedExistingGuests(selectedExistingGuests.filter(id => id !== guestId));
  };

  const selectedExistingGuestsList = selectedExistingGuests
    .map(id => availableGuests.find(g => g.id === id))
    .filter((g): g is Guest => g !== undefined);

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
          <GroupAddIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Add Family
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent dividers sx={{ maxHeight: '60vh' }}>
          <TextField
            fullWidth
            id="familyName"
            label="Family Name"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            required
            autoFocus
            placeholder="e.g., Smith Family"
            disabled={isSubmitting}
            sx={{ mb: 3 }}
          />

          {/* New Members Section */}
          <Typography variant="body2" fontWeight={500} color="text.secondary" sx={{ mb: 1.5 }}>
            Add New Members
          </Typography>
          <Stack spacing={1.5} sx={{ mb: 2 }}>
            {members.map((member, index) => (
              <Paper
                key={index}
                variant="outlined"
                sx={{ p: 2, display: 'flex', gap: 1.5, alignItems: 'center' }}
              >
                <TextField
                  size="small"
                  placeholder="First name"
                  value={member.firstName}
                  onChange={(e) => updateMember(index, 'firstName', e.target.value)}
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  placeholder="Last name"
                  value={member.lastName}
                  onChange={(e) => updateMember(index, 'lastName', e.target.value)}
                  sx={{ flex: 1 }}
                />
                {members.length > 1 && (
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => removeMember(index)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Paper>
            ))}
          </Stack>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={addMember}
            sx={{ mb: 3 }}
          >
            Add New Member
          </Button>

          {/* Existing Guests Section */}
          <Typography variant="body2" fontWeight={500} color="text.secondary" sx={{ mb: 1.5 }}>
            Add Existing Guests
          </Typography>
          {availableGuests.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              No available guests (all guests are already in families)
            </Typography>
          ) : (
            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="guest-select-label">Select a guest to add</InputLabel>
                <Select
                  labelId="guest-select-label"
                  value=""
                  label="Select a guest to add"
                  onChange={(e) => {
                    if (e.target.value) {
                      addExistingGuest(e.target.value);
                    }
                  }}
                >
                  {availableGuests
                    .filter(g => !selectedExistingGuests.includes(g.id))
                    .sort((a, b) => {
                      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
                      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
                      return nameA.localeCompare(nameB);
                    })
                    .map(guest => (
                      <MenuItem key={guest.id} value={guest.id}>
                        {guest.firstName} {guest.lastName}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              {selectedExistingGuestsList.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                  {selectedExistingGuestsList.map(guest => (
                    <Chip
                      key={guest.id}
                      label={`${guest.firstName} ${guest.lastName}`}
                      onDelete={() => removeExistingGuest(guest.id)}
                      size="small"
                    />
                  ))}
                </Stack>
              )}
            </Box>
          )}

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
            label="Categories (applied to new members only)"
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
            {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Add Family'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
