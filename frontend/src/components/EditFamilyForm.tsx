/**
 * Edit Family Form using MUI Dialog
 * Edit family name, manage members with drag-and-drop reordering, and delete family
 */

import { useState, useEffect, useMemo, useRef } from 'react';
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
  Paper,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { Family, Guest, Category, CategoryInfo, Event, PermissionLevel } from '../types';
import { updateFamily, reorderFamilyMembers, addGuestToFamily, removeGuestFromFamily, updateGuest, deleteFamily, deleteGuest, copyFamily, GuestPresenceMap, fetchFamilies } from '../api';
import CategoryDropdown from './CategoryDropdown';
import CrossEventSyncDialog from './CrossEventSyncDialog';

interface EventWithPermission extends Event {
  permission: PermissionLevel;
}

interface EditFamilyFormProps {
  family: Family;
  familyGuests: Guest[];
  allGuests: Guest[];
  categories: CategoryInfo[];
  eventId: string;
  onClose: () => void;
  onSuccess: () => void;
  events?: EventWithPermission[];
  guestPresenceMap?: GuestPresenceMap;
}

export default function EditFamilyForm({
  family,
  familyGuests,
  allGuests,
  categories,
  eventId,
  onClose,
  onSuccess,
  events = [],
  guestPresenceMap = {},
}: EditFamilyFormProps) {
  const [familyName, setFamilyName] = useState(family.name);
  const [orderedMemberIds, setOrderedMemberIds] = useState<string[]>(family.members);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMembers, setDeleteMembers] = useState(false);
  const [deleteAcrossEvents, setDeleteAcrossEvents] = useState(false);
  const [removedMemberSyncInfo, setRemovedMemberSyncInfo] = useState<{
    memberNames: Array<{ firstName: string; lastName: string }>;
    otherEvents: Array<{ id: string; name: string }>;
  } | null>(null);
  const [familyNameSyncInfo, setFamilyNameSyncInfo] = useState<{ newName: string } | null>(null);
  const [pendingRemovedMembers, setPendingRemovedMembers] = useState<string[]>([]);

  const otherAdminEvents = useMemo(() =>
    events.filter(e => e.id !== eventId && e.permission === 'admin'),
    [events, eventId]
  );

  const originalEventsRef = useRef<Set<string> | null>(null);
  const originalCategoriesRef = useRef<string[] | null>(null);

  if (originalCategoriesRef.current === null) {
    if (familyGuests.length > 0) {
      originalCategoriesRef.current = familyGuests[0].tags.filter(tag =>
        familyGuests.every(guest => guest.tags.includes(tag))
      );
    } else {
      originalCategoriesRef.current = [];
    }
  }

  if (originalEventsRef.current === null) {
    const eventIds = new Set<string>();
    if (familyGuests.length > 0) {
      const adminEvents = events.filter(e => e.id !== eventId && e.permission === 'admin');
      for (const event of adminEvents) {
        const allMembersInEvent = familyGuests.every(guest => {
          const presence = guestPresenceMap[guest.id] || [];
          return presence.some(p => p.id === event.id);
        });
        if (allMembersInEvent) {
          eventIds.add(event.id);
        }
      }
    }
    originalEventsRef.current = eventIds;
  }

  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(() => {
    if (familyGuests.length === 0) return new Set<string>();

    const eventIds = new Set<string>();
    const adminEvents = events.filter(e => e.id !== eventId && e.permission === 'admin');

    for (const event of adminEvents) {
      const allMembersInEvent = familyGuests.every(guest => {
        const presence = guestPresenceMap[guest.id] || [];
        return presence.some(p => p.id === event.id);
      });
      if (allMembersInEvent) {
        eventIds.add(event.id);
      }
    }
    return eventIds;
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
    setFamilyName(family.name);
    setOrderedMemberIds(family.members);
  }, [family.name, family.members]);

  useEffect(() => {
    if (familyGuests.length > 0) {
      const commonCategories = familyGuests[0].tags.filter(tag =>
        familyGuests.every(guest => guest.tags.includes(tag))
      );
      setSelectedCategories(commonCategories);
    } else {
      setSelectedCategories([]);
    }
  }, [familyGuests]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!familyName.trim()) {
      alert('Please enter a family name');
      return;
    }

    setIsSubmitting(true);
    try {
      const originalMemberIds = new Set(family.members);
      const newMemberIds = new Set(orderedMemberIds);

      const addedMembers = orderedMemberIds.filter(id => !originalMemberIds.has(id));
      const removedMembers = family.members.filter(id => !newMemberIds.has(id));

      for (const guestId of removedMembers) {
        await removeGuestFromFamily(eventId, family.id, guestId);
      }

      for (const guestId of addedMembers) {
        await addGuestToFamily(eventId, family.id, guestId);
      }

      const updates: Partial<Family> = {
        name: familyName.trim(),
      };

      await updateFamily(eventId, family.id, updates);

      if (JSON.stringify(orderedMemberIds) !== JSON.stringify(family.members)) {
        await reorderFamilyMembers(eventId, family.id, orderedMemberIds);
      }

      const finalMemberIds = orderedMemberIds;
      const originalCategories = originalCategoriesRef.current || [];

      const removedCategories = originalCategories.filter(cat => !selectedCategories.includes(cat));
      const addedCategories = selectedCategories.filter(cat => !originalCategories.includes(cat));

      for (const guestId of finalMemberIds) {
        const guest = allGuests.find(g => g.id === guestId);
        if (guest) {
          let updatedTags = [...guest.tags];
          updatedTags = updatedTags.filter(tag => !removedCategories.includes(tag));
          for (const cat of addedCategories) {
            if (!updatedTags.includes(cat)) {
              updatedTags.push(cat);
            }
          }
          await updateGuest(eventId, guestId, { tags: updatedTags });
        }
      }

      const originalEvents = originalEventsRef.current || new Set<string>();
      const eventsToAdd = Array.from(selectedEventIds).filter(id => !originalEvents.has(id));
      const eventsToRemove = Array.from(originalEvents).filter(id => !selectedEventIds.has(id));

      for (const targetEventId of eventsToAdd) {
        try {
          await copyFamily(eventId, family.id, targetEventId);
        } catch (err) {
          console.error(`Failed to copy family to event ${targetEventId}:`, err);
        }
      }

      for (const targetEventId of eventsToRemove) {
        try {
          for (const guest of familyGuests) {
            const presence = guestPresenceMap[guest.id] || [];
            const presenceInfo = presence.find(p => p.id === targetEventId);
            if (presenceInfo) {
              await deleteGuest(targetEventId, presenceInfo.guestId);
            }
          }
        } catch (err) {
          console.error(`Failed to remove family from event ${targetEventId}:`, err);
        }
      }

      // Save removed members for potential follow-up dialog
      setPendingRemovedMembers(removedMembers);

      // Check if family name changed and family exists in other events
      const nameChanged = familyName.trim().toLowerCase() !== family.name.toLowerCase();
      if (nameChanged && family.groupId && otherEventsWithFamily.length > 0) {
        setFamilyNameSyncInfo({ newName: familyName.trim() });
        return; // Don't call onSuccess yet — wait for name sync dialog first
      }

      // Check if any members were removed and if they exist in other events with the same family
      if (removedMembers.length > 0 && family.groupId && otherEventsWithFamily.length > 0) {
        const removedGuestNames = removedMembers
          .map(id => familyGuests.find(g => g.id === id))
          .filter((g): g is Guest => g !== undefined)
          .map(g => ({ firstName: g.firstName, lastName: g.lastName }));

        if (removedGuestNames.length > 0) {
          setRemovedMemberSyncInfo({
            memberNames: removedGuestNames,
            otherEvents: otherEventsWithFamily.map(e => ({ id: e.id, name: e.name })),
          });
          return; // Don't call onSuccess yet — wait for dialog
        }
      }

      onSuccess();
    } catch (error) {
      console.error('Failed to update family:', error);
      alert('Failed to update family');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;

    if (draggedIndex !== index) {
      const newOrder = [...orderedMemberIds];
      const draggedItem = newOrder[draggedIndex];
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(index, 0, draggedItem);
      setOrderedMemberIds(newOrder);
      setDraggedIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const removeMember = (guestId: string) => {
    setOrderedMemberIds(orderedMemberIds.filter(id => id !== guestId));
  };

  const addMember = (guestId: string) => {
    if (!orderedMemberIds.includes(guestId)) {
      setOrderedMemberIds([...orderedMemberIds, guestId]);
    }
  };

  // Compute other events that have this family (via groupId)
  const otherEventsWithFamily = useMemo(() => {
    if (!family.groupId) return [];
    return otherAdminEvents.filter(e => {
      // Check if any family member exists in this event
      return familyGuests.some(guest => {
        const presence = guestPresenceMap[guest.id] || [];
        return presence.some(p => p.id === e.id);
      });
    });
  }, [family.groupId, otherAdminEvents, familyGuests, guestPresenceMap]);

  const handleDeleteFamily = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setIsSubmitting(true);
    try {
      // Delete in other events first if requested
      if (deleteAcrossEvents && otherEventsWithFamily.length > 0) {
        for (const otherEvent of otherEventsWithFamily) {
          try {
            // Find the matching family in the other event by groupId, then by name
            const otherFamilies = await fetchFamilies(otherEvent.id);
            let matchingFamily = otherFamilies.find(f => f.groupId === family.groupId);
            if (!matchingFamily) {
              matchingFamily = otherFamilies.find(
                f => f.name.toLowerCase() === family.name.toLowerCase()
              );
            }
            if (matchingFamily) {
              if (deleteMembers) {
                for (const guestId of matchingFamily.members) {
                  await deleteGuest(otherEvent.id, guestId);
                }
              }
              await deleteFamily(otherEvent.id, matchingFamily.id);
            }
          } catch (err) {
            console.error(`Failed to delete family in event ${otherEvent.name}:`, err);
          }
        }
      }

      // Delete in current event
      if (deleteMembers) {
        for (const guestId of family.members) {
          await deleteGuest(eventId, guestId);
        }
      }

      await deleteFamily(eventId, family.id);
      onSuccess();
    } catch (error) {
      console.error('Failed to delete family:', error);
      alert('Failed to delete family');
      setIsSubmitting(false);
      setShowDeleteConfirm(false);
    }
  };

  // After name sync completes, check if there are also removed members to sync
  const checkPendingRemovedMembers = () => {
    if (pendingRemovedMembers.length > 0 && family.groupId && otherEventsWithFamily.length > 0) {
      const removedGuestNames = pendingRemovedMembers
        .map(id => familyGuests.find(g => g.id === id))
        .filter((g): g is Guest => g !== undefined)
        .map(g => ({ firstName: g.firstName, lastName: g.lastName }));

      if (removedGuestNames.length > 0) {
        setRemovedMemberSyncInfo({
          memberNames: removedGuestNames,
          otherEvents: otherEventsWithFamily.map(e => ({ id: e.id, name: e.name })),
        });
        return; // Show removed member sync dialog next
      }
    }
    onSuccess();
  };

  const handleFamilyNameSyncApply = async (selectedEventIds: string[]) => {
    if (!familyNameSyncInfo) return;
    const errors: string[] = [];
    for (const otherEventId of selectedEventIds) {
      try {
        const otherFamilies = await fetchFamilies(otherEventId);
        // Try matching by groupId first, then fall back to matching by old name
        let matchingFamily = otherFamilies.find(f => f.groupId === family.groupId);
        if (!matchingFamily) {
          matchingFamily = otherFamilies.find(
            f => f.name.toLowerCase() === family.name.toLowerCase()
          );
        }
        if (matchingFamily) {
          await updateFamily(otherEventId, matchingFamily.id, { name: familyNameSyncInfo.newName });
        } else {
          const event = events.find(e => e.id === otherEventId);
          errors.push(event?.name || otherEventId);
        }
      } catch (err) {
        const event = events.find(e => e.id === otherEventId);
        errors.push(event?.name || otherEventId);
        console.error(`Failed to sync family name to event ${otherEventId}:`, err);
      }
    }
    if (errors.length > 0) {
      alert(`Failed to sync family name to: ${errors.join(', ')}`);
    }
    setFamilyNameSyncInfo(null);
    checkPendingRemovedMembers();
  };

  const handleRemovedMemberSync = async (selectedEventIds: string[]) => {
    if (!removedMemberSyncInfo) return;

    for (const otherEventId of selectedEventIds) {
      try {
        const otherFamilies = await fetchFamilies(otherEventId);
        let matchingFamily = otherFamilies.find(f => f.groupId === family.groupId);
        if (!matchingFamily) {
          matchingFamily = otherFamilies.find(
            f => f.name.toLowerCase() === family.name.toLowerCase()
          );
        }
        if (!matchingFamily) continue;

        for (const memberName of removedMemberSyncInfo.memberNames) {
          const removedGuest = familyGuests.find(
            g => g.firstName === memberName.firstName && g.lastName === memberName.lastName
          );
          if (removedGuest) {
            const presence = guestPresenceMap[removedGuest.id] || [];
            const presenceInfo = presence.find(p => p.id === otherEventId);
            if (presenceInfo) {
              await removeGuestFromFamily(otherEventId, matchingFamily.id, presenceInfo.guestId);
            }
          }
        }
      } catch (err) {
        console.error(`Failed to sync member removal to event ${otherEventId}:`, err);
      }
    }
    setRemovedMemberSyncInfo(null);
    onSuccess();
  };

  const orderedMembers = orderedMemberIds
    .map(id => familyGuests.find(g => g.id === id))
    .filter((g): g is Guest => g !== undefined);

  const availableGuests = allGuests.filter(
    g => !g.familyId || g.familyId === family.id
  );

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
              Edit Family
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
              disabled={isSubmitting}
              slotProps={{ htmlInput: { maxLength: 100 } }}
              sx={{ mb: 3 }}
            />

            {/* Family Members Section */}
            <Typography variant="body2" fontWeight={500} color="text.secondary" sx={{ mb: 1.5 }}>
              Family Members (drag to reorder)
            </Typography>
            {orderedMembers.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                No members in this family
              </Typography>
            ) : (
              <Stack spacing={1} sx={{ mb: 3 }}>
                {orderedMembers.map((guest, index) => (
                  <Paper
                    key={guest.id}
                    variant="outlined"
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    sx={{
                      p: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      cursor: 'grab',
                      bgcolor: draggedIndex === index ? 'action.selected' : 'background.paper',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <DragIndicatorIcon color="action" sx={{ cursor: 'grab' }} />
                    <Typography sx={{ flex: 1 }}>
                      {guest.firstName} {guest.lastName}
                    </Typography>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => removeMember(guest.id)}
                    >
                      Remove
                    </Button>
                  </Paper>
                ))}
              </Stack>
            )}

            {/* Add Member Section */}
            <Typography variant="body2" fontWeight={500} color="text.secondary" sx={{ mb: 1.5 }}>
              Add Member
            </Typography>
            <FormControl fullWidth size="small" sx={{ mb: 3 }}>
              <InputLabel id="add-member-label">Select a guest to add</InputLabel>
              <Select
                labelId="add-member-label"
                value=""
                label="Select a guest to add"
                onChange={(e) => {
                  if (e.target.value) {
                    addMember(e.target.value);
                  }
                }}
              >
                {availableGuests
                  .filter(g => !orderedMemberIds.includes(g.id))
                  .map(guest => (
                    <MenuItem key={guest.id} value={guest.id}>
                      {guest.firstName} {guest.lastName}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <CategoryDropdown
              categories={categories}
              selectedCategories={selectedCategories}
              onSelect={(category) => {
                if (!selectedCategories.includes(category)) {
                  setSelectedCategories([...selectedCategories, category]);
                }
              }}
              onRemove={(category) => {
                setSelectedCategories(selectedCategories.filter(t => t !== category));
              }}
              label="Categories (applied to all family members)"
            />

            {otherAdminEvents.length > 0 && (
              <>
                <Divider sx={{ my: 3 }} />
                <Typography variant="body2" fontWeight={500} color="text.secondary" sx={{ mb: 1.5 }}>
                  Event Invitations:
                </Typography>
                <FormGroup>
                  {otherAdminEvents.map(event => (
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
              onClick={handleDeleteFamily}
              disabled={isSubmitting}
              startIcon={<DeleteIcon />}
            >
              Remove Family
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteMembers(false);
          setDeleteAcrossEvents(false);
        }}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 },
        }}
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight={600}>
            Remove Family
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to remove the "{family.name}" family?
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={deleteMembers}
                onChange={(e) => setDeleteMembers(e.target.checked)}
              />
            }
            label="Also remove all family members"
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {deleteMembers
              ? 'All family members will be permanently deleted.'
              : 'Family members will be kept but removed from the family grouping.'}
          </Typography>
          {otherEventsWithFamily.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={deleteAcrossEvents}
                    onChange={(e) => setDeleteAcrossEvents(e.target.checked)}
                  />
                }
                label="Also delete in all other events"
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {deleteAcrossEvents
                  ? `This family will also be removed from: ${otherEventsWithFamily.map(e => e.name).join(', ')}.`
                  : 'Only the family in the current event will be removed.'}
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => {
              setShowDeleteConfirm(false);
              setDeleteMembers(false);
              setDeleteAcrossEvents(false);
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteFamily}
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Remove Family'}
          </Button>
        </DialogActions>
      </Dialog>

      {familyNameSyncInfo && (
        <CrossEventSyncDialog
          title="Sync Family Name"
          description={`"${family.name}" was renamed to "${familyNameSyncInfo.newName}". Also update in these events?`}
          events={otherEventsWithFamily.map(e => ({ id: e.id, name: e.name }))}
          onApply={handleFamilyNameSyncApply}
          onSkip={() => {
            setFamilyNameSyncInfo(null);
            checkPendingRemovedMembers();
          }}
        />
      )}

      {removedMemberSyncInfo && (
        <CrossEventSyncDialog
          title="Sync Member Removal"
          description={`Members were removed from ${family.name}. Also remove from family in other events?`}
          events={removedMemberSyncInfo.otherEvents}
          onApply={handleRemovedMemberSync}
          onSkip={() => {
            setRemovedMemberSyncInfo(null);
            onSuccess();
          }}
        />
      )}
    </>
  );
}
