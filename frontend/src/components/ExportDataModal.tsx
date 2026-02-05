/**
 * Export Data Modal
 * Provides options for exporting data in different formats with filtering options
 */

import { useState, useMemo, useEffect } from 'react';
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
  RadioGroup,
  Radio,
  FormControlLabel,
  FormControl,
  FormLabel,
  Chip,
  Paper,
  Divider,
  TextField,
  Autocomplete,
  Alert,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import DataObjectIcon from '@mui/icons-material/DataObject';
import TableChartIcon from '@mui/icons-material/TableChart';
import GroupIcon from '@mui/icons-material/Group';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import PersonIcon from '@mui/icons-material/Person';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { Guest, Family, CategoryInfo, Event } from '../types';
import { exportData, fetchGuests } from '../api';

type ExportFormat = 'json' | 'joy-csv';
type GuestSelection = 'all' | 'by-family' | 'by-category' | 'selected';

interface EventTagMapping {
  eventId: string;
  eventName: string;
  joyTag: string;
  enabled: boolean;
}

interface ExportDataModalProps {
  guests: Guest[];
  families: Family[];
  categories: CategoryInfo[];
  events: Event[];
  currentEventId: string;
  selectedGuestIds?: Set<string>;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

// JOY CSV columns - matches JOY Contact Collector template format
const JOY_CSV_HEADERS = [
  'First Name',
  'Last Name',
  'Email (Optional)',
  'Phone Number (Optional)',
  'Name on Envelope (Optional)',
  'Party (Optional)',
  'Address Line 1 (Optional)',
  'Address Line 2 (Optional)',
  'City (Optional)',
  'State/Region (Optional)',
  'Postal Code (Optional)',
  'Country (Optional)',
  'Tags (Optional)',
];

export default function ExportDataModal({
  guests,
  families,
  categories,
  events,
  currentEventId,
  selectedGuestIds = new Set(),
  onClose,
  onSuccess,
}: ExportDataModalProps) {
  const [format, setFormat] = useState<ExportFormat>('json');
  const [guestSelection, setGuestSelection] = useState<GuestSelection>(
    selectedGuestIds.size > 0 ? 'selected' : 'all'
  );
  const [selectedFamilyIds, setSelectedFamilyIds] = useState<string[]>([]);
  const [selectedCategoryNames, setSelectedCategoryNames] = useState<string[]>([]);
  const [showEventMapping, setShowEventMapping] = useState(true);
  const [allGuests, setAllGuests] = useState<Guest[]>([]);
  const [loadingAllGuests, setLoadingAllGuests] = useState(false);

  // Fetch all guests from all events for JOY export
  useEffect(() => {
    const loadAllGuests = async () => {
      setLoadingAllGuests(true);
      try {
        const guestPromises = events.map(event => fetchGuests(event.id));
        const guestArrays = await Promise.all(guestPromises);
        const combined = guestArrays.flat();
        setAllGuests(combined);
      } catch (error) {
        console.error('Failed to load guests from all events:', error);
        // Fall back to current event guests
        setAllGuests(guests);
      } finally {
        setLoadingAllGuests(false);
      }
    };
    loadAllGuests();
  }, [events, guests]);

  // Event to JOY tag mapping - ceremony events are excluded by default
  const [eventTagMappings, setEventTagMappings] = useState<EventTagMapping[]>(() =>
    events.map(event => {
      const isCeremony = event.name.toLowerCase().includes('ceremony');
      return {
        eventId: event.id,
        eventName: event.name,
        joyTag: event.name.toLowerCase().includes('reception')
          ? '🍾Reception'
          : event.name.toLowerCase().includes('thanksgiving')
          ? 'Thanksgiving Night'
          : event.name,
        enabled: !isCeremony,  // Exclude ceremony events from export
      };
    })
  );

  // Get all guests for the current event
  const currentEventGuests = useMemo(() =>
    guests.filter(g => g.eventId === currentEventId),
    [guests, currentEventId]
  );

  // Sort families alphabetically
  const sortedFamilies = useMemo(() =>
    [...families]
      .filter(f => f.eventId === currentEventId)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [families, currentEventId]
  );

  // Get guests to export based on selection
  const guestsToExport = useMemo(() => {
    let result: Guest[] = [];

    switch (guestSelection) {
      case 'all':
        result = currentEventGuests;
        break;
      case 'by-family':
        result = currentEventGuests.filter(g =>
          g.familyId && selectedFamilyIds.includes(g.familyId)
        );
        break;
      case 'by-category':
        result = currentEventGuests.filter(g =>
          g.tags.some(tag => selectedCategoryNames.includes(tag))
        );
        break;
      case 'selected':
        result = currentEventGuests.filter(g => selectedGuestIds.has(g.id));
        break;
    }

    return result.sort((a, b) => {
      const aName = `${a.lastName} ${a.firstName}`;
      const bName = `${b.lastName} ${b.firstName}`;
      return aName.localeCompare(bName);
    });
  }, [guestSelection, currentEventGuests, selectedFamilyIds, selectedCategoryNames, selectedGuestIds]);

  // Build unique guest list for JOY export (deduplicated by name across events)
  const uniqueGuestsForJoy = useMemo(() => {
    if (format !== 'joy-csv') return [];
    if (loadingAllGuests) return [];

    // Group guests by name (include guests from ALL events)
    const guestsByName = new Map<string, { guest: Guest; eventIds: Set<string>; categoryTags: Set<string> }>();

    for (const guest of allGuests) {
      // Check if this guest should be exported based on selection
      if (guestSelection !== 'all') {
        const currentEventGuest = currentEventGuests.find(g =>
          g.firstName.toLowerCase() === guest.firstName.toLowerCase() &&
          g.lastName.toLowerCase() === guest.lastName.toLowerCase()
        );
        if (!currentEventGuest) continue;
        if (!guestsToExport.some(g => g.id === currentEventGuest.id)) continue;
      }

      const key = `${guest.firstName.toLowerCase()}|${guest.lastName.toLowerCase()}`;

      if (guestsByName.has(key)) {
        const existing = guestsByName.get(key)!;
        existing.eventIds.add(guest.eventId);
        // Collect category tags from all instances of this guest
        guest.tags.forEach(tag => existing.categoryTags.add(tag));
      } else {
        guestsByName.set(key, {
          guest,
          eventIds: new Set([guest.eventId]),
          categoryTags: new Set(guest.tags),
        });
      }
    }

    // Convert to array with JOY tags (event tags from enabled events + category tags)
    return Array.from(guestsByName.values()).map(({ guest, eventIds, categoryTags }) => {
      // Get event tags from enabled events
      const eventTags = eventTagMappings
        .filter(m => m.enabled && eventIds.has(m.eventId))
        .map(m => m.joyTag);

      // Combine event tags with category tags (event tags first, then category tags)
      const allTags = [...eventTags, ...categoryTags];

      return {
        firstName: guest.firstName,
        lastName: guest.lastName,
        joyTags: allTags.join('|'),  // JOY uses pipe separator for tags
      };
    }).sort((a, b) => {
      const aName = `${a.lastName} ${a.firstName}`;
      const bName = `${b.lastName} ${b.firstName}`;
      return aName.localeCompare(bName);
    });
  }, [format, allGuests, loadingAllGuests, eventTagMappings, guestSelection, currentEventGuests, guestsToExport]);

  const handleExport = async () => {
    try {
      if (format === 'json') {
        // Use existing JSON export
        const blob = await exportData();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wedding-guest-list-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        onSuccess('Data exported successfully as JSON');
      } else {
        // Generate JOY CSV
        const csvRows = [JOY_CSV_HEADERS.join(',')];

        for (const guest of uniqueGuestsForJoy) {
          const row = [
            escapeCSV(guest.firstName),    // First Name
            escapeCSV(guest.lastName),     // Last Name
            '',                            // Email (Optional)
            '',                            // Phone Number (Optional)
            '',                            // Name on Envelope (Optional)
            '',                            // Party (Optional)
            '',                            // Address Line 1 (Optional)
            '',                            // Address Line 2 (Optional)
            '',                            // City (Optional)
            '',                            // State/Region (Optional)
            '',                            // Postal Code (Optional)
            '',                            // Country (Optional)
            escapeCSV(guest.joyTags),      // Tags (Optional)
          ];
          csvRows.push(row.join(','));
        }

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `joy-guest-list-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        onSuccess(`Exported ${uniqueGuestsForJoy.length} guests to JOY CSV format`);
      }
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleEventTagChange = (eventId: string, field: 'joyTag' | 'enabled', value: string | boolean) => {
    setEventTagMappings(prev =>
      prev.map(m =>
        m.eventId === eventId
          ? { ...m, [field]: value }
          : m
      )
    );
  };

  const exportCount = format === 'json'
    ? guestsToExport.length
    : uniqueGuestsForJoy.length;

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, maxHeight: '90vh' },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <DownloadIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Export Data
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {/* Format Selection */}
          <FormControl component="fieldset">
            <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600 }}>
              Export Format
            </FormLabel>
            <RadioGroup
              value={format}
              onChange={(e) => setFormat(e.target.value as ExportFormat)}
            >
              <Paper variant="outlined" sx={{ mb: 1 }}>
                <FormControlLabel
                  value="json"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                      <DataObjectIcon color="primary" />
                      <Box>
                        <Typography variant="body1" fontWeight={500}>
                          JSON (Full Data)
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Complete backup including all events, families, categories, and settings
                        </Typography>
                      </Box>
                    </Box>
                  }
                  sx={{ m: 0, p: 1.5, width: '100%' }}
                />
              </Paper>
              <Paper variant="outlined">
                <FormControlLabel
                  value="joy-csv"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                      <TableChartIcon color="secondary" />
                      <Box>
                        <Typography variant="body1" fontWeight={500}>
                          JOY Guest List (CSV)
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Export for JOY wedding website with event tags
                        </Typography>
                      </Box>
                    </Box>
                  }
                  sx={{ m: 0, p: 1.5, width: '100%' }}
                />
              </Paper>
            </RadioGroup>
          </FormControl>

          {/* JOY CSV Options */}
          {format === 'joy-csv' && (
            <>
              <Divider />

              {/* Event to Tag Mapping */}
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    mb: 1,
                  }}
                  onClick={() => setShowEventMapping(!showEventMapping)}
                >
                  <Typography variant="subtitle1" fontWeight={600}>
                    Event to JOY Tag Mapping
                  </Typography>
                  {showEventMapping ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </Box>
                <Collapse in={showEventMapping}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Configure which events to include and their JOY tags. Guests appearing in multiple events will have all applicable tags.
                  </Alert>
                  <Stack spacing={1}>
                    {eventTagMappings.map(mapping => (
                      <Paper key={mapping.eventId} variant="outlined" sx={{ p: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Checkbox
                            checked={mapping.enabled}
                            onChange={(e) => handleEventTagChange(mapping.eventId, 'enabled', e.target.checked)}
                          />
                          <Typography sx={{ minWidth: 120 }}>{mapping.eventName}</Typography>
                          <Typography color="text.secondary">→</Typography>
                          <TextField
                            size="small"
                            value={mapping.joyTag}
                            onChange={(e) => handleEventTagChange(mapping.eventId, 'joyTag', e.target.value)}
                            disabled={!mapping.enabled}
                            sx={{ flex: 1 }}
                            placeholder="JOY tag name"
                          />
                        </Box>
                      </Paper>
                    ))}
                  </Stack>
                </Collapse>
              </Box>

              <Divider />

              {/* Guest Selection */}
              <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600 }}>
                  Guest Selection
                </FormLabel>
                <RadioGroup
                  value={guestSelection}
                  onChange={(e) => setGuestSelection(e.target.value as GuestSelection)}
                >
                  <Stack spacing={1}>
                    <Paper variant="outlined">
                      <FormControlLabel
                        value="all"
                        control={<Radio />}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <SelectAllIcon fontSize="small" />
                            <Typography>All Guests ({currentEventGuests.length})</Typography>
                          </Box>
                        }
                        sx={{ m: 0, p: 1, width: '100%' }}
                      />
                    </Paper>

                    {selectedGuestIds.size > 0 && (
                      <Paper variant="outlined">
                        <FormControlLabel
                          value="selected"
                          control={<Radio />}
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <PersonIcon fontSize="small" />
                              <Typography>Selected Guests ({selectedGuestIds.size})</Typography>
                            </Box>
                          }
                          sx={{ m: 0, p: 1, width: '100%' }}
                        />
                      </Paper>
                    )}

                    <Paper variant="outlined">
                      <FormControlLabel
                        value="by-family"
                        control={<Radio />}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <GroupIcon fontSize="small" />
                            <Typography>By Family</Typography>
                          </Box>
                        }
                        sx={{ m: 0, p: 1, width: '100%' }}
                      />
                    </Paper>

                    <Paper variant="outlined">
                      <FormControlLabel
                        value="by-category"
                        control={<Radio />}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LocalOfferIcon fontSize="small" />
                            <Typography>By Category/Tag</Typography>
                          </Box>
                        }
                        sx={{ m: 0, p: 1, width: '100%' }}
                      />
                    </Paper>
                  </Stack>
                </RadioGroup>
              </FormControl>

              {/* Family Selection */}
              {guestSelection === 'by-family' && (
                <Autocomplete
                  multiple
                  options={sortedFamilies}
                  getOptionLabel={(option) => option.name}
                  value={sortedFamilies.filter(f => selectedFamilyIds.includes(f.id))}
                  onChange={(_, newValue) => setSelectedFamilyIds(newValue.map(f => f.id))}
                  renderInput={(params) => (
                    <TextField {...params} label="Select Families" placeholder="Choose families..." />
                  )}
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                      <Box>
                        <Typography variant="body2">{option.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.members.length} member{option.members.length !== 1 ? 's' : ''}
                        </Typography>
                      </Box>
                    </li>
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option.id}
                        label={option.name}
                        size="small"
                      />
                    ))
                  }
                />
              )}

              {/* Category Selection */}
              {guestSelection === 'by-category' && (
                <Autocomplete
                  multiple
                  options={categories.map(c => c.name)}
                  value={selectedCategoryNames}
                  onChange={(_, newValue) => setSelectedCategoryNames(newValue)}
                  renderInput={(params) => (
                    <TextField {...params} label="Select Categories" placeholder="Choose categories..." />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option}
                        label={option}
                        size="small"
                        sx={{
                          bgcolor: categories.find(c => c.name === option)?.color,
                          color: 'white',
                        }}
                      />
                    ))
                  }
                />
              )}

              {/* Preview */}
              <Box>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                  Preview ({uniqueGuestsForJoy.length} guests)
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    maxHeight: 200,
                    overflow: 'auto',
                    bgcolor: 'action.hover',
                  }}
                >
                  <List dense>
                    {uniqueGuestsForJoy.slice(0, 20).map((guest, index) => (
                      <ListItem key={index} divider>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <PersonIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={`${guest.firstName} ${guest.lastName}`}
                          secondary={guest.joyTags || 'No tags'}
                        />
                      </ListItem>
                    ))}
                    {uniqueGuestsForJoy.length > 20 && (
                      <ListItem>
                        <ListItemText
                          primary={`... and ${uniqueGuestsForJoy.length - 20} more`}
                          sx={{ textAlign: 'center', color: 'text.secondary' }}
                        />
                      </ListItem>
                    )}
                    {uniqueGuestsForJoy.length === 0 && (
                      <ListItem>
                        <ListItemText
                          primary="No guests match the current selection"
                          sx={{ textAlign: 'center', color: 'text.secondary' }}
                        />
                      </ListItem>
                    )}
                  </List>
                </Paper>
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleExport}
          disabled={format === 'joy-csv' && exportCount === 0}
        >
          Export {format === 'json' ? 'JSON' : `${exportCount} Guests`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Helper to escape CSV values
function escapeCSV(value: string): string {
  if (!value) return '';
  // If the value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
