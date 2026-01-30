/**
 * Bulk Categories Modal using MUI Dialog
 * Allows adding/removing categories from multiple selected guests at once
 */

import { useState, useMemo } from 'react';
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
  Chip,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { Guest, CategoryInfo } from '../types';
import { updateGuest } from '../api';
import CategoryTag from './CategoryTag';

interface BulkCategoriesModalProps {
  selectedGuests: Guest[];
  categories: CategoryInfo[];
  eventId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkCategoriesModal({
  selectedGuests,
  categories,
  eventId,
  onClose,
  onSuccess,
}: BulkCategoriesModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Calculate which categories are present in any of the selected guests
  const categoriesInUse = useMemo(() => {
    const inUse = new Set<string>();
    selectedGuests.forEach(guest => {
      guest.tags.forEach(tag => inUse.add(tag));
    });
    return inUse;
  }, [selectedGuests]);

  // Count how many guests have each category
  const categoryGuestCounts = useMemo(() => {
    const counts = new Map<string, number>();
    categories.forEach(cat => {
      const count = selectedGuests.filter(g => g.tags.includes(cat.name)).length;
      counts.set(cat.name, count);
    });
    return counts;
  }, [selectedGuests, categories]);

  // Sort categories alphabetically
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  const handleAddCategory = async (categoryName: string) => {
    setIsProcessing(true);
    setError(null);
    setProcessedCount(0);

    try {
      // Only add to guests that don't already have this category
      const guestsToUpdate = selectedGuests.filter(g => !g.tags.includes(categoryName));

      for (let i = 0; i < guestsToUpdate.length; i++) {
        const guest = guestsToUpdate[i];
        await updateGuest(eventId, guest.id, {
          tags: [...guest.tags, categoryName],
        });
        setProcessedCount(i + 1);
      }

      onSuccess();
    } catch (err) {
      console.error('Failed to add category:', err);
      setError(err instanceof Error ? err.message : 'Failed to add category to guests');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveCategory = async (categoryName: string) => {
    setIsProcessing(true);
    setError(null);
    setProcessedCount(0);

    try {
      // Only remove from guests that have this category
      const guestsToUpdate = selectedGuests.filter(g => g.tags.includes(categoryName));

      for (let i = 0; i < guestsToUpdate.length; i++) {
        const guest = guestsToUpdate[i];
        await updateGuest(eventId, guest.id, {
          tags: guest.tags.filter(t => t !== categoryName),
        });
        setProcessedCount(i + 1);
      }

      onSuccess();
    } catch (err) {
      console.error('Failed to remove category:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove category from guests');
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
        sx: { borderRadius: 3, maxHeight: '80vh' },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <LocalOfferIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Manage Categories
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" disabled={isProcessing}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 3 }}>
          Managing categories for <strong>{selectedGuests.length}</strong> selected guest{selectedGuests.length !== 1 ? 's' : ''}.
          Click <AddIcon sx={{ fontSize: 16, verticalAlign: 'middle' }} /> to add or <RemoveIcon sx={{ fontSize: 16, verticalAlign: 'middle' }} /> to remove a category.
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {isProcessing && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <CircularProgress size={20} />
            <Typography variant="body2">
              Processing {processedCount} of {selectedGuests.length} guests...
            </Typography>
          </Box>
        )}

        {sortedCategories.length === 0 ? (
          <Alert severity="warning">
            No categories available. Create categories first to manage them.
          </Alert>
        ) : (
          <Stack spacing={1.5}>
            {sortedCategories.map(category => {
              const guestCount = categoryGuestCounts.get(category.name) || 0;
              const allHave = guestCount === selectedGuests.length;
              const someHave = guestCount > 0 && guestCount < selectedGuests.length;
              const noneHave = guestCount === 0;

              return (
                <Box
                  key={category.name}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'action.hover',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CategoryTag category={category.name} categoryInfo={category} />
                    <Typography variant="body2" color="text.secondary">
                      {guestCount} of {selectedGuests.length} guest{selectedGuests.length !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    {/* Add button - only show if not all guests have this category */}
                    {!allHave && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        startIcon={<AddIcon />}
                        onClick={() => handleAddCategory(category.name)}
                        disabled={isProcessing}
                      >
                        Add
                      </Button>
                    )}
                    {/* Remove button - only show if at least one guest has this category */}
                    {!noneHave && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<RemoveIcon />}
                        onClick={() => handleRemoveCategory(category.name)}
                        disabled={isProcessing}
                      >
                        Remove
                      </Button>
                    )}
                    {/* Show status chip if all guests already have or none have */}
                    {allHave && (
                      <Chip
                        label="All have"
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isProcessing}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
