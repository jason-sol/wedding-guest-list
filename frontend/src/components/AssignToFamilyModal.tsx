/**
 * Assign Guest to Family Modal using MUI Dialog
 * Allows assigning a guest to an existing family
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Typography,
  IconButton,
  CircularProgress,
  Box,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import GroupIcon from '@mui/icons-material/Group';
import { Family, Guest } from '../types';
import { fetchFamilies, addGuestToFamily } from '../api';

interface AssignToFamilyModalProps {
  guest: Guest;
  eventId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignToFamilyModal({
  guest,
  eventId,
  onClose,
  onSuccess,
}: AssignToFamilyModalProps) {
  const [families, setFamilies] = useState<Family[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFamilies();
  }, [eventId]);

  const loadFamilies = async () => {
    try {
      const data = await fetchFamilies(eventId);
      setFamilies(data);
    } catch (error) {
      console.error('Failed to load families:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFamilyId) {
      alert('Please select a family');
      return;
    }

    setIsSubmitting(true);
    try {
      await addGuestToFamily(eventId, selectedFamilyId, guest.id);
      onSuccess();
    } catch (error) {
      console.error('Failed to assign guest to family:', error);
      alert('Failed to assign guest to family');
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
          <GroupIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Assign to Family
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent dividers>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Assign <strong>{guest.firstName} {guest.lastName}</strong> to a family group.
          </Typography>

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <FormControl fullWidth required>
              <InputLabel id="family-select-label">Select Family</InputLabel>
              <Select
                labelId="family-select-label"
                id="family-select"
                value={selectedFamilyId}
                label="Select Family"
                onChange={(e) => setSelectedFamilyId(e.target.value)}
              >
                {[...families]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((family) => (
                    <MenuItem key={family.id} value={family.id}>
                      {family.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || !selectedFamilyId || isLoading}
          >
            {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Assign to Family'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
