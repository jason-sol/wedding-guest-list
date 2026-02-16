/**
 * Table Form dialog for adding/editing tables in the seating chart.
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
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import { Table, TableShape } from '../types';

interface TableFormProps {
  table?: Table;
  onClose: () => void;
  onSubmit: (data: { name: string; capacity: number; shape: TableShape }) => Promise<void>;
}

export default function TableForm({ table, onClose, onSubmit }: TableFormProps) {
  const [name, setName] = useState(table?.name || '');
  const [capacity, setCapacity] = useState(table?.capacity || 8);
  const [shape, setShape] = useState<TableShape>(table?.shape || 'round');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (table) {
      setName(table.name);
      setCapacity(table.capacity);
      setShape(table.shape);
    }
  }, [table]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), capacity, shape });
      onClose();
    } catch (error) {
      console.error('Failed to save table:', error);
    } finally {
      setIsSubmitting(false);
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
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <TableRestaurantIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            {table ? 'Edit Table' : 'Add Table'}
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
            label="Table Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            disabled={isSubmitting}
            placeholder="e.g., Table 1, Head Table"
            slotProps={{ htmlInput: { maxLength: 100 } }}
            sx={{ mb: 3 }}
          />

          <TextField
            fullWidth
            label="Capacity"
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
            disabled={isSubmitting}
            slotProps={{ htmlInput: { min: 1, max: 50 } }}
            sx={{ mb: 3 }}
          />

          <Box>
            <Typography variant="body2" fontWeight={500} color="text.secondary" sx={{ mb: 1 }}>
              Shape
            </Typography>
            <ToggleButtonGroup
              value={shape}
              exclusive
              onChange={(_, val) => val && setShape(val)}
              size="small"
            >
              <ToggleButton value="round">Round</ToggleButton>
              <ToggleButton value="rectangular">Rectangular</ToggleButton>
              <ToggleButton value="custom">Custom</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || !name.trim()}
          >
            {isSubmitting ? <CircularProgress size={20} color="inherit" /> : (table ? 'Save' : 'Add Table')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
