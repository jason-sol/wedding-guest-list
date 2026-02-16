/**
 * Seating Chart - Full-screen dialog with tabs for List View and Floor Plan.
 * Container component managing table CRUD and guest assignment.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Tabs,
  Tab,
  Button,
  Chip,
  Stack,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import AddIcon from '@mui/icons-material/Add';
import ViewListIcon from '@mui/icons-material/ViewList';
import MapIcon from '@mui/icons-material/Map';
import { Guest, Table, TableShape } from '../types';
import { fetchTables, addTable, updateTable, assignSeats, deleteTable } from '../api';
import TableForm from './TableForm';
import SeatingListView from './SeatingListView';
import SeatingFloorPlan from './SeatingFloorPlan';

interface SeatingChartProps {
  guests: Guest[];
  eventId: string;
  onClose: () => void;
}

export default function SeatingChart({ guests, eventId, onClose }: SeatingChartProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [showTableForm, setShowTableForm] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);

  const loadTables = useCallback(async () => {
    try {
      const data = await fetchTables(eventId);
      setTables(data);
    } catch (error) {
      console.error('Failed to fetch tables:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  // Summary stats
  const stats = useMemo(() => {
    const totalTables = tables.length;
    const totalSeated = tables.reduce((sum, t) => sum + t.seats.length, 0);
    const unassigned = guests.length - totalSeated;
    return { totalTables, totalSeated, unassigned };
  }, [tables, guests]);

  const handleAddTable = useCallback(async (data: { name: string; capacity: number; shape: TableShape }) => {
    await addTable(eventId, data);
    await loadTables();
  }, [eventId, loadTables]);

  const handleEditTable = useCallback((table: Table) => {
    setEditingTable(table);
  }, []);

  const handleUpdateTable = useCallback(async (data: { name: string; capacity: number; shape: TableShape }) => {
    if (!editingTable) return;
    await updateTable(eventId, editingTable.id, data);
    setEditingTable(null);
    await loadTables();
  }, [eventId, editingTable, loadTables]);

  const handleDeleteTable = useCallback(async (tableId: string) => {
    if (!window.confirm('Are you sure you want to delete this table?')) return;
    try {
      await deleteTable(eventId, tableId);
      await loadTables();
    } catch (error) {
      console.error('Failed to delete table:', error);
    }
  }, [eventId, loadTables]);

  const handleAssignGuests = useCallback(async (tableId: string, guestIds: string[]) => {
    try {
      await assignSeats(eventId, tableId, guestIds);
      await loadTables();
    } catch (error) {
      console.error('Failed to assign guests:', error);
    }
  }, [eventId, loadTables]);

  const handleUpdateTablePosition = useCallback(async (tableId: string, x: number, y: number) => {
    // Optimistic update for smooth dragging
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, x, y } : t));
    try {
      await updateTable(eventId, tableId, { x, y });
    } catch (error) {
      console.error('Failed to update table position:', error);
      await loadTables(); // Revert on error
    }
  }, [eventId, loadTables]);

  return (
    <Dialog open fullScreen onClose={onClose}>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={onClose}>
            <CloseIcon />
          </IconButton>
          <TableRestaurantIcon sx={{ mr: 1 }} />
          <Typography variant="h6" fontWeight={600} sx={{ flexGrow: 1 }}>
            Seating Chart
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AddIcon />}
            onClick={() => setShowTableForm(true)}
            sx={{ mr: 2 }}
          >
            Add Table
          </Button>
        </Toolbar>
      </AppBar>

      {/* Summary Bar */}
      <Box sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', px: 3, py: 1.5 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={2} alignItems="center">
            <Chip label={`${stats.totalTables} tables`} variant="outlined" />
            <Chip label={`${stats.totalSeated} seated`} color="success" variant="outlined" />
            <Chip label={`${stats.unassigned} unassigned`} color={stats.unassigned > 0 ? 'warning' : 'default'} variant="outlined" />
          </Stack>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
            <Tab icon={<ViewListIcon />} label="List View" iconPosition="start" />
            <Tab icon={<MapIcon />} label="Floor Plan" iconPosition="start" />
          </Tabs>
        </Stack>
      </Box>

      {/* Content — no padding for floor plan so it uses the full screen */}
      <Box sx={{ flex: 1, p: activeTab === 0 ? 2 : 0, overflow: 'auto', bgcolor: 'background.default' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : activeTab === 0 ? (
          <SeatingListView
            guests={guests}
            tables={tables}
            onAssignGuests={handleAssignGuests}
            onEditTable={handleEditTable}
            onDeleteTable={handleDeleteTable}
          />
        ) : (
          <SeatingFloorPlan
            guests={guests}
            tables={tables}
            onUpdateTablePosition={handleUpdateTablePosition}
            onAssignGuests={handleAssignGuests}
            onEditTable={handleEditTable}
            onDeleteTable={handleDeleteTable}
          />
        )}
      </Box>

      {/* Table Form */}
      {showTableForm && (
        <TableForm
          onClose={() => setShowTableForm(false)}
          onSubmit={handleAddTable}
        />
      )}

      {editingTable && (
        <TableForm
          table={editingTable}
          onClose={() => setEditingTable(null)}
          onSubmit={handleUpdateTable}
        />
      )}
    </Dialog>
  );
}
