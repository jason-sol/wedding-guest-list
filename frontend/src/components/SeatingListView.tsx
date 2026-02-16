/**
 * Seating List View - Split panel with unassigned guest pool and table cards.
 * Uses HTML5 drag-and-drop for guest assignment.
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  IconButton,
  Stack,
  TextField,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import { Guest, Table } from '../types';

interface SeatingListViewProps {
  guests: Guest[];
  tables: Table[];
  onAssignGuests: (tableId: string, guestIds: string[]) => void;
  onEditTable: (table: Table) => void;
  onDeleteTable: (tableId: string) => void;
}

function getCapacityColor(seated: number, capacity: number): 'success' | 'warning' | 'error' {
  const ratio = seated / capacity;
  if (ratio >= 1) return 'error';
  if (ratio >= 0.75) return 'warning';
  return 'success';
}

export default function SeatingListView({
  guests,
  tables,
  onAssignGuests,
  onEditTable,
  onDeleteTable,
}: SeatingListViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedGuestId, setDraggedGuestId] = useState<string | null>(null);

  // Build guest map for quick lookups
  const guestMap = useMemo(() => {
    const map = new Map<string, Guest>();
    guests.forEach(g => map.set(g.id, g));
    return map;
  }, [guests]);

  // Find all seated guest IDs
  const seatedGuestIds = useMemo(() => {
    const set = new Set<string>();
    for (const table of tables) {
      for (const guestId of table.seats) {
        set.add(guestId);
      }
    }
    return set;
  }, [tables]);

  // Unassigned guests
  const unassignedGuests = useMemo(() => {
    let unassigned = guests.filter(g => !seatedGuestIds.has(g.id));
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      unassigned = unassigned.filter(g =>
        `${g.firstName} ${g.lastName}`.toLowerCase().includes(search)
      );
    }
    return unassigned.sort((a, b) => a.lastName.localeCompare(b.lastName));
  }, [guests, seatedGuestIds, searchTerm]);

  const handleDragStart = useCallback((e: React.DragEvent, guestId: string) => {
    e.dataTransfer.setData('text/plain', guestId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedGuestId(guestId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedGuestId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, tableId: string) => {
    e.preventDefault();
    const guestId = e.dataTransfer.getData('text/plain');
    if (!guestId) return;

    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    // Add the guest to the table's seats
    if (!table.seats.includes(guestId) && table.seats.length < table.capacity) {
      onAssignGuests(tableId, [...table.seats, guestId]);
    }
    setDraggedGuestId(null);
  }, [tables, onAssignGuests]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleRemoveGuest = useCallback((tableId: string, guestId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    onAssignGuests(tableId, table.seats.filter(id => id !== guestId));
  }, [tables, onAssignGuests]);

  const handleDropToUnassigned = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const guestId = e.dataTransfer.getData('text/plain');
    if (!guestId) return;

    // Find which table this guest is in and remove them
    for (const table of tables) {
      if (table.seats.includes(guestId)) {
        onAssignGuests(table.id, table.seats.filter(id => id !== guestId));
        break;
      }
    }
    setDraggedGuestId(null);
  }, [tables, onAssignGuests]);

  return (
    <Box sx={{ display: 'flex', gap: 2, height: '100%', flexDirection: { xs: 'column', md: 'row' } }}>
      {/* Unassigned Guests Pool */}
      <Paper
        variant="outlined"
        sx={{
          flex: { xs: 'none', md: '0 0 300px' },
          p: 2,
          overflow: 'auto',
          maxHeight: { xs: 300, md: 'none' },
        }}
        onDragOver={handleDragOver}
        onDrop={handleDropToUnassigned}
      >
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Unassigned ({unassignedGuests.length})
        </Typography>
        <TextField
          size="small"
          fullWidth
          placeholder="Search guests..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchTerm('')}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <Stack spacing={0.5}>
          {unassignedGuests.map(guest => (
            <Box
              key={guest.id}
              draggable
              onDragStart={(e) => handleDragStart(e, guest.id)}
              onDragEnd={handleDragEnd}
              sx={{
                p: 1,
                borderRadius: 1,
                bgcolor: draggedGuestId === guest.id ? 'action.selected' : 'background.paper',
                border: 1,
                borderColor: 'divider',
                cursor: 'grab',
                '&:hover': { bgcolor: 'action.hover' },
                '&:active': { cursor: 'grabbing' },
              }}
            >
              <Typography variant="body2">
                {guest.firstName} <strong>{guest.lastName}</strong>
              </Typography>
            </Box>
          ))}
          {unassignedGuests.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              {searchTerm ? 'No matching guests' : 'All guests are seated'}
            </Typography>
          )}
        </Stack>
      </Paper>

      {/* Tables */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Stack spacing={2}>
          {tables.map(table => {
            const capacityColor = getCapacityColor(table.seats.length, table.capacity);
            return (
              <Paper
                key={table.id}
                variant="outlined"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, table.id)}
                sx={{
                  p: 2,
                  border: 2,
                  borderColor: draggedGuestId && table.seats.length < table.capacity
                    ? 'primary.main'
                    : 'divider',
                  transition: 'border-color 0.2s',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>{table.name}</Typography>
                    <Chip
                      label={`${table.seats.length}/${table.capacity}`}
                      size="small"
                      color={capacityColor}
                      variant="outlined"
                    />
                    <Chip label={table.shape} size="small" variant="outlined" />
                  </Box>
                  <Box>
                    <IconButton size="small" onClick={() => onEditTable(table)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => onDeleteTable(table.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, minHeight: 32 }}>
                  {table.seats.map(guestId => {
                    const guest = guestMap.get(guestId);
                    if (!guest) return null;
                    return (
                      <Chip
                        key={guestId}
                        label={`${guest.firstName} ${guest.lastName}`}
                        size="small"
                        draggable
                        onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, guestId)}
                        onDragEnd={handleDragEnd}
                        onDelete={() => handleRemoveGuest(table.id, guestId)}
                        deleteIcon={<PersonRemoveIcon />}
                        sx={{ cursor: 'grab' }}
                      />
                    );
                  })}
                  {table.seats.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                      Drag guests here to seat them
                    </Typography>
                  )}
                </Box>
              </Paper>
            );
          })}
          {tables.length === 0 && (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No tables yet. Add a table to start arranging seating.
              </Typography>
            </Paper>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
