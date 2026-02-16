/**
 * Main App component using MUI
 * Includes AppBar, event tabs, guest management, and dark mode toggle
 */

import { useState, useEffect, useRef, useCallback, useMemo, useDeferredValue, startTransition } from 'react';
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Paper,
  Stack,
  CircularProgress,
  LinearProgress,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import LogoutIcon from '@mui/icons-material/Logout';
import AddIcon from '@mui/icons-material/Add';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import CategoryIcon from '@mui/icons-material/Category';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SettingsIcon from '@mui/icons-material/Settings';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import BackupIcon from '@mui/icons-material/Backup';
import BlockIcon from '@mui/icons-material/Block';
import CheckIcon from '@mui/icons-material/Check';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import PersonIcon from '@mui/icons-material/Person';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import MailIcon from '@mui/icons-material/Mail';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import { Guest, Family, CategoryInfo, RSVPStatus, AgeGroup } from './types';
import { InvitationStatus } from './hooks/useFilteredGuests';
import { fetchGuests, fetchFamilies, fetchCategories, fetchGuestPresence, importData, createEvent, GuestPresenceMap } from './api';
import { useToast } from './components/Toast';
import { useAuth } from './contexts/AuthContext';
import { useEvents } from './contexts/EventContext';
import { useThemeMode } from './theme/ThemeContext';
import GuestList from './components/GuestList';
import GuestForm from './components/GuestForm';
import FamilyForm from './components/FamilyForm';
import AddCategoryModal from './components/AddCategoryModal';
import UserManagement from './components/UserManagement';
import EventSettings from './components/EventSettings';
import Login from './components/Login';
import ScrollToTop from './components/ScrollToTop';
import ImportRsvpModal from './components/ImportRsvpModal';
import ExportDataModal from './components/ExportDataModal';
import BackupManagement from './components/BackupManagement';
import Dashboard from './components/Dashboard';
import SeatingChart from './components/SeatingChart';
import { shouldUseWhiteText, getContrastAdjustedColor } from './components/CategoryTag';

function App() {
  const { isAuthenticated, user, logout, login } = useAuth();
  const { events, currentEvent, setCurrentEvent, refreshEvents, canEdit, isBlocked, loading: eventsLoading } = useEvents();
  const { mode, toggleTheme } = useThemeMode();

  const [guests, setGuests] = useState<Guest[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [guestPresence, setGuestPresence] = useState<GuestPresenceMap>({});
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedRsvpStatuses, setSelectedRsvpStatuses] = useState<RSVPStatus[]>([]);
  const [selectedAgeGroups, setSelectedAgeGroups] = useState<AgeGroup[]>([]);
  const [selectedInvitationStatuses, setSelectedInvitationStatuses] = useState<InvitationStatus[]>([]);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showSeatingChart, setShowSeatingChart] = useState(false);
  const [searchInput, setSearchInput] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showAddEventForm, setShowAddEventForm] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [moreMenuAnchor, setMoreMenuAnchor] = useState<null | HTMLElement>(null);
  const [showImportRsvpModal, setShowImportRsvpModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const scrollPositionRef = useRef<number | null>(null);
  const shouldRestoreScrollRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { showSuccess, showError } = useToast();

  // Debounce search input so filtering only runs after the user pauses typing
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput), 150);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (shouldRestoreScrollRef.current && scrollPositionRef.current !== null && !loading) {
      const timeoutId = setTimeout(() => {
        if (scrollPositionRef.current !== null) {
          window.scrollTo(0, scrollPositionRef.current);
          scrollPositionRef.current = null;
          shouldRestoreScrollRef.current = false;
        }
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [guests, families, loading]);

  // Targeted refresh: only guests + families (used for normal edits)
  const refreshGuests = useCallback(async () => {
    if (!currentEvent) return;
    scrollPositionRef.current = window.scrollY;
    shouldRestoreScrollRef.current = true;
    try {
      const [guestsData, familiesData] = await Promise.all([
        fetchGuests(currentEvent.id),
        fetchFamilies(currentEvent.id),
      ]);
      setGuests(Array.isArray(guestsData) ? guestsData : []);
      setFamilies(Array.isArray(familiesData) ? familiesData : []);
    } catch (err) {
      console.error('Failed to refresh guests:', err);
    }
  }, [currentEvent]);

  // Full load: all data (used for initial load, event switch, major operations)
  // On initial load, shows a full spinner. On subsequent loads (event switch),
  // keeps previous data visible and shows a subtle LinearProgress bar.
  const loadData = useCallback(async (preserveScroll = false) => {
    if (!currentEvent) {
      setGuests([]);
      setFamilies([]);
      setGuestPresence({});
      setLoading(false);
      return;
    }

    if (preserveScroll) {
      scrollPositionRef.current = window.scrollY;
      shouldRestoreScrollRef.current = true;
    }

    const isInitialLoad = guests.length === 0 && families.length === 0;
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);
    try {
      const [guestsData, familiesData, presenceData] = await Promise.all([
        fetchGuests(currentEvent.id),
        fetchFamilies(currentEvent.id),
        fetchGuestPresence(currentEvent.id),
      ]);
      startTransition(() => {
        setGuests(Array.isArray(guestsData) ? guestsData : []);
        setFamilies(Array.isArray(familiesData) ? familiesData : []);
        setGuestPresence(presenceData || {});
      });
    } catch (err) {
      console.error('Failed to load data:', err);
      setGuests([]);
      setFamilies([]);
      setGuestPresence({});
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [currentEvent, guests.length, families.length]);

  useEffect(() => {
    if (isAuthenticated && currentEvent) {
      loadData();
    }
  }, [isAuthenticated, currentEvent, loadData]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCategories().then(setCategories).catch(console.error);
    }
  }, [isAuthenticated]);

  // Stable callback for normal edits (RSVP changes, guest edits, family edits)
  const handleUpdate = useCallback(() => refreshGuests(), [refreshGuests]);

  const handleGuestAdded = () => {
    setShowGuestForm(false);
    refreshGuests();
    showSuccess('Guest added successfully');
  };

  const handleFamilyAdded = () => {
    setShowFamilyForm(false);
    refreshGuests();
    showSuccess('Family added successfully');
  };

  const handleLoginSuccess = async (username: string, password: string) => {
    await login(username, password);
    await refreshEvents();
  };

  const handleLogout = async () => {
    await logout();
    setGuests([]);
    setFamilies([]);
    setCategories([]);
  };

  const handleExport = () => {
    setMoreMenuAnchor(null);
    setShowExportModal(true);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      showError('Please select a JSON file');
      return;
    }

    const confirmed = window.confirm(
      'Importing data will replace all current data including guests, families, categories, users, and events. Are you sure you want to continue?'
    );

    if (!confirmed) {
      e.target.value = '';
      return;
    }

    setIsImporting(true);
    try {
      const result = await importData(file);
      showSuccess(
        `Data imported: ${result.imported.guests} guests, ${result.imported.families} families, ${result.imported.events} events`
      );
      await refreshEvents();
      e.target.value = '';
    } catch (err) {
      console.error('Import failed:', err);
      showError(err instanceof Error ? err.message : 'Failed to import data');
      e.target.value = '';
    } finally {
      setIsImporting(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName.trim()) return;

    setIsCreatingEvent(true);
    try {
      await createEvent({ name: newEventName.trim() });
      await refreshEvents();
      setNewEventName('');
      setShowAddEventForm(false);
      showSuccess('Event created successfully');
    } catch (err) {
      console.error('Failed to create event:', err);
      showError('Failed to create event');
    } finally {
      setIsCreatingEvent(false);
    }
  };

  // Deferred filter values: chips toggle instantly, list re-render is deferred
  const deferredCategories = useDeferredValue(selectedCategories);
  const deferredRsvpStatuses = useDeferredValue(selectedRsvpStatuses);
  const deferredAgeGroups = useDeferredValue(selectedAgeGroups);
  const deferredInvitationStatuses = useDeferredValue(selectedInvitationStatuses);
  const deferredSearchTerm = useDeferredValue(searchTerm);

  // Lightweight stats computation for the sticky search bar (single O(n) pass)
  const { statsTotal, statsAdults, statsChildren } = useMemo(() => {
    let filtered = guests;
    if (deferredCategories.length > 0) {
      filtered = filtered.filter(g => deferredCategories.some(cat => g.tags.includes(cat)));
    }
    if (deferredRsvpStatuses.length > 0) {
      filtered = filtered.filter(g => deferredRsvpStatuses.includes(g.rsvp || 'pending'));
    }
    if (deferredAgeGroups.length > 0) {
      filtered = filtered.filter(g => deferredAgeGroups.includes(g.ageGroup || 'adult'));
    }
    if (deferredInvitationStatuses.length > 0) {
      filtered = filtered.filter(g => {
        const status: InvitationStatus = g.invitationSent ? 'sent' : 'not-sent';
        return deferredInvitationStatuses.includes(status);
      });
    }
    if (deferredSearchTerm.trim()) {
      const s = deferredSearchTerm.toLowerCase().trim();
      const familyIds = new Set(families.filter(f => f.name.toLowerCase().includes(s)).map(f => f.id));
      filtered = filtered.filter(g => {
        const name = `${g.firstName} ${g.lastName}`.toLowerCase();
        return name.includes(s) || (g.familyId && familyIds.has(g.familyId));
      });
    }
    let adults = 0, children = 0;
    for (const g of filtered) {
      if (g.ageGroup === 'child') children++;
      else adults++;
    }
    return { statsTotal: filtered.length, statsAdults: adults, statsChildren: children };
  }, [guests, families, deferredCategories, deferredRsvpStatuses, deferredAgeGroups, deferredInvitationStatuses, deferredSearchTerm]);

  if (isAuthenticated === false) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (isAuthenticated === null || eventsLoading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar position="static" elevation={0}>
          <Toolbar>
            <FavoriteIcon sx={{ mr: 1.5 }} />
            <Typography variant="h6" fontWeight={600}>Wedding Guest List</Typography>
          </Toolbar>
        </AppBar>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar position="static" elevation={0}>
          <Toolbar>
            <FavoriteIcon sx={{ mr: 1.5 }} />
            <Typography variant="h6" fontWeight={600}>Wedding Guest List</Typography>
          </Toolbar>
        </AppBar>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Alert
            severity="error"
            action={<Button onClick={() => loadData(false)}>Retry</Button>}
          >
            {error}
          </Alert>
        </Container>
      </Box>
    );
  }

  if (isBlocked && currentEvent) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar position="static" elevation={0}>
          <Toolbar>
            <FavoriteIcon sx={{ mr: 1.5 }} />
            <Typography variant="h6" fontWeight={600} sx={{ flexGrow: 1 }}>Wedding Guest List</Typography>
            <Tooltip title={`Logged in as ${user?.username}`}>
              <Chip label={user?.username} size="small" sx={{ mr: 2, bgcolor: 'rgba(255,255,255,0.15)' }} />
            </Tooltip>
            <IconButton color="inherit" onClick={toggleTheme}>
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
            <IconButton color="inherit" onClick={handleLogout}>
              <LogoutIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Container maxWidth="lg">
            <Tabs value={currentEvent.id} onChange={(_, v) => setCurrentEvent(v)}>
              {events.map((event) => (
                <Tab key={event.id} label={event.name} value={event.id} />
              ))}
            </Tabs>
          </Container>
        </Box>
        <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
          <BlockIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" fontWeight={600} gutterBottom>Access Denied</Typography>
          <Typography color="text.secondary">
            You do not have permission to view this event.
            <br />
            Please contact the owner to request access to "{currentEvent.name}".
          </Typography>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* App Bar */}
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <FavoriteIcon sx={{ mr: 1.5 }} />
          <Typography variant="h6" fontWeight={600} sx={{ flexGrow: 1 }}>
            Wedding Guest List
          </Typography>
          {user && (
            <Tooltip title={`Logged in as ${user.username}${user.isOwner ? ' (Owner)' : ''}`}>
              <Chip
                label={user.username}
                size="small"
                sx={{ mr: 2, bgcolor: 'rgba(255,255,255,0.15)', color: 'inherit' }}
              />
            </Tooltip>
          )}
          <IconButton color="inherit" onClick={toggleTheme}>
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Event Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tabs
              value={currentEvent?.id || false}
              onChange={(_, v) => setCurrentEvent(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ flexGrow: 1 }}
            >
              {events.map((event) => (
                <Tab
                  key={event.id}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {event.name}
                      {event.permission === 'none' && (
                        <BlockIcon fontSize="small" sx={{ color: 'error.main' }} />
                      )}
                      {user?.isOwner && currentEvent?.id === event.id && (
                        <Box
                          component="span"
                          role="button"
                          tabIndex={-1}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingEvent(event.id);
                          }}
                          sx={{
                            ml: 0.5,
                            p: 0.25,
                            borderRadius: '50%',
                            display: 'inline-flex',
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                        >
                          <SettingsIcon fontSize="small" />
                        </Box>
                      )}
                    </Box>
                  }
                  value={event.id}
                />
              ))}
            </Tabs>
            {user?.isOwner && (
              <IconButton
                color="primary"
                onClick={() => setShowAddEventForm(true)}
                sx={{ ml: 1 }}
              >
                <AddIcon />
              </IconButton>
            )}
          </Box>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ py: { xs: 1, sm: 3 } }}>
        {/* Controls - Actions + Filters (scrolls with page) */}
        <Paper sx={{ p: 2, mb: 1 }}>
          {/* Top row - Actions */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
            {canEdit && (
              <>
                <Button
                  variant="contained"
                  startIcon={<PersonAddIcon />}
                  onClick={() => setShowGuestForm(true)}
                >
                  Add Guest
                </Button>
                <Button
                  variant="contained"
                  startIcon={<GroupAddIcon />}
                  onClick={() => setShowFamilyForm(true)}
                >
                  Add Family
                </Button>
              </>
            )}
            <Button
              variant="outlined"
              startIcon={<CategoryIcon />}
              onClick={() => setShowCategoryForm(true)}
            >
              {canEdit ? 'Categories' : 'View Categories'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<DashboardIcon />}
              onClick={() => setShowDashboard(true)}
            >
              Dashboard
            </Button>
            {canEdit && (
              <Button
                variant="outlined"
                startIcon={<TableRestaurantIcon />}
                onClick={() => setShowSeatingChart(true)}
              >
                Seating
              </Button>
            )}
            {user?.isOwner && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<AdminPanelSettingsIcon />}
                  onClick={() => setShowUserManagement(true)}
                >
                  Manage Users
                </Button>
                <IconButton onClick={(e) => setMoreMenuAnchor(e.currentTarget)}>
                  <MoreVertIcon />
                </IconButton>
                <Menu
                  anchorEl={moreMenuAnchor}
                  open={Boolean(moreMenuAnchor)}
                  onClose={() => setMoreMenuAnchor(null)}
                >
                  <MenuItem onClick={handleExport}>
                    <FileDownloadIcon sx={{ mr: 1 }} />
                    Export Data
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setMoreMenuAnchor(null);
                      fileInputRef.current?.click();
                    }}
                    disabled={isImporting}
                  >
                    <FileUploadIcon sx={{ mr: 1 }} />
                    {isImporting ? 'Importing...' : 'Import Data'}
                  </MenuItem>
                  <Divider />
                  <MenuItem
                    onClick={() => {
                      setMoreMenuAnchor(null);
                      setShowImportRsvpModal(true);
                    }}
                  >
                    <FileUploadIcon sx={{ mr: 1 }} />
                    Import RSVP from JOY
                  </MenuItem>
                  <Divider />
                  <MenuItem
                    onClick={() => {
                      setMoreMenuAnchor(null);
                      setShowBackupModal(true);
                    }}
                  >
                    <BackupIcon sx={{ mr: 1 }} />
                    Backup Management
                  </MenuItem>
                </Menu>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={handleImport}
                  style={{ display: 'none' }}
                />
              </>
            )}
          </Stack>

          <Divider sx={{ my: 2 }} />

          {/* Category filter */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight={500} color="text.secondary" sx={{ mb: 1 }}>
              Filter by Category
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
              {categories.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No categories available</Typography>
              ) : (
                categories.map((cat) => {
                  const isSelected = selectedCategories.includes(cat.name);
                  const textColor = shouldUseWhiteText(cat.color) ? '#FFFFFF' : '#1E293B';
                  const outlinedColor = getContrastAdjustedColor(cat.color, mode);
                  return (
                    <Chip
                      key={cat.name}
                      label={cat.name}
                      icon={<CheckIcon sx={{ fontSize: '1rem', color: `${textColor} !important`, visibility: isSelected ? 'visible' : 'hidden' }} />}
                      onClick={() => {
                        startTransition(() => {
                          if (isSelected) {
                            setSelectedCategories(selectedCategories.filter(c => c !== cat.name));
                          } else {
                            setSelectedCategories([...selectedCategories, cat.name]);
                          }
                        });
                      }}
                      variant={isSelected ? 'filled' : 'outlined'}
                      sx={{
                        bgcolor: isSelected ? cat.color : 'transparent',
                        color: isSelected ? textColor : outlinedColor,
                        borderColor: isSelected ? cat.color : outlinedColor,
                        borderWidth: 2,
                        fontWeight: 600,
                        '& .MuiChip-label': {
                          transform: isSelected ? 'none' : 'translateX(-8px)',
                          transition: 'transform 0.15s ease',
                        },
                        '&:hover': {
                          bgcolor: isSelected ? cat.color : `${outlinedColor}20`,
                          filter: isSelected ? 'brightness(0.9)' : 'none',
                          borderColor: isSelected ? cat.color : outlinedColor,
                        },
                      }}
                    />
                  );
                })
              )}
              <Button
                size="small"
                onClick={() => setSelectedCategories([])}
                sx={{ visibility: selectedCategories.length > 0 ? 'visible' : 'hidden' }}
              >
                Clear All
              </Button>
            </Stack>
          </Box>

          {/* RSVP Status filter */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight={500} color="text.secondary" sx={{ mb: 1 }}>
              Filter by RSVP Status
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center" sx={{ minHeight: 32 }}>
              {(['accepted', 'pending', 'declined'] as RSVPStatus[]).map((status) => {
                const isSelected = selectedRsvpStatuses.includes(status);
                const config = {
                  accepted: { label: 'Attending', color: 'success' as const, icon: <EventAvailableIcon sx={{ fontSize: '1rem' }} /> },
                  pending: { label: 'Pending', color: 'default' as const, icon: <HelpOutlineIcon sx={{ fontSize: '1rem' }} /> },
                  declined: { label: 'Declined', color: 'error' as const, icon: <EventBusyIcon sx={{ fontSize: '1rem' }} /> },
                }[status];

                return (
                  <Chip
                    key={status}
                    label={config.label}
                    icon={isSelected ? <CheckIcon sx={{ fontSize: '1rem' }} /> : config.icon}
                    onClick={() => {
                      startTransition(() => {
                        if (isSelected) {
                          setSelectedRsvpStatuses(selectedRsvpStatuses.filter(s => s !== status));
                        } else {
                          setSelectedRsvpStatuses([...selectedRsvpStatuses, status]);
                        }
                      });
                    }}
                    variant={isSelected ? 'filled' : 'outlined'}
                    color={isSelected ? config.color : 'default'}
                    sx={{ transition: 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease' }}
                  />
                );
              })}
              <Button
                size="small"
                onClick={() => setSelectedRsvpStatuses([])}
                sx={{ visibility: selectedRsvpStatuses.length > 0 ? 'visible' : 'hidden' }}
              >
                Clear
              </Button>
            </Stack>
          </Box>

          {/* Age Group filter */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight={500} color="text.secondary" sx={{ mb: 1 }}>
              Filter by Age Group
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center" sx={{ minHeight: 32 }}>
              {(['adult', 'child'] as AgeGroup[]).map((ageGroup) => {
                const isSelected = selectedAgeGroups.includes(ageGroup);
                const config = {
                  adult: { label: 'Adults', icon: <PersonIcon sx={{ fontSize: '1rem' }} /> },
                  child: { label: 'Children', icon: <ChildCareIcon sx={{ fontSize: '1rem' }} /> },
                }[ageGroup];

                return (
                  <Chip
                    key={ageGroup}
                    label={config.label}
                    icon={isSelected ? <CheckIcon sx={{ fontSize: '1rem' }} /> : config.icon}
                    onClick={() => {
                      startTransition(() => {
                        if (isSelected) {
                          setSelectedAgeGroups(selectedAgeGroups.filter(a => a !== ageGroup));
                        } else {
                          setSelectedAgeGroups([...selectedAgeGroups, ageGroup]);
                        }
                      });
                    }}
                    variant={isSelected ? 'filled' : 'outlined'}
                    color={isSelected ? 'primary' : 'default'}
                    sx={{ transition: 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease' }}
                  />
                );
              })}
              <Button
                size="small"
                onClick={() => setSelectedAgeGroups([])}
                sx={{ visibility: selectedAgeGroups.length > 0 ? 'visible' : 'hidden' }}
              >
                Clear
              </Button>
            </Stack>
          </Box>

          {/* Invitation Status filter */}
          <Box>
            <Typography variant="body2" fontWeight={500} color="text.secondary" sx={{ mb: 1 }}>
              Filter by Invitation Status
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center" sx={{ minHeight: 32 }}>
              {(['sent', 'not-sent'] as InvitationStatus[]).map((status) => {
                const isSelected = selectedInvitationStatuses.includes(status);
                const config = {
                  'sent': { label: 'Sent', icon: <MailIcon sx={{ fontSize: '1rem' }} /> },
                  'not-sent': { label: 'Not Sent', icon: <MailOutlineIcon sx={{ fontSize: '1rem' }} /> },
                }[status];

                return (
                  <Chip
                    key={status}
                    label={config.label}
                    icon={isSelected ? <CheckIcon sx={{ fontSize: '1rem' }} /> : config.icon}
                    onClick={() => {
                      startTransition(() => {
                        if (isSelected) {
                          setSelectedInvitationStatuses(selectedInvitationStatuses.filter(s => s !== status));
                        } else {
                          setSelectedInvitationStatuses([...selectedInvitationStatuses, status]);
                        }
                      });
                    }}
                    variant={isSelected ? 'filled' : 'outlined'}
                    color={isSelected ? 'primary' : 'default'}
                    sx={{ transition: 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease' }}
                  />
                );
              })}
              <Button
                size="small"
                onClick={() => setSelectedInvitationStatuses([])}
                sx={{ visibility: selectedInvitationStatuses.length > 0 ? 'visible' : 'hidden' }}
              >
                Clear
              </Button>
            </Stack>
          </Box>
        </Paper>

        {/* Sticky Search Bar + Stats */}
        <Paper
          sx={{
            p: 2,
            mb: 3,
            position: 'sticky',
            top: 0,
            zIndex: (theme) => theme.zIndex.appBar - 1,
          }}
        >
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Search guests and families..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              sx={{ minWidth: { xs: '100%', sm: 300 }, flex: 1, maxWidth: { sm: 400 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: searchInput && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => { setSearchInput(''); setSearchTerm(''); }}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
              <Chip
                label={`Total: ${statsTotal}`}
                variant="outlined"
                color="primary"
                size="small"
                sx={{ minWidth: 75, fontVariantNumeric: 'tabular-nums' }}
              />
              <Chip
                icon={<PersonIcon sx={{ fontSize: '1rem' }} />}
                label={`${statsAdults}`}
                variant="outlined"
                size="small"
                sx={{ minWidth: 55, fontVariantNumeric: 'tabular-nums' }}
              />
              <Chip
                icon={<ChildCareIcon sx={{ fontSize: '1rem' }} />}
                label={`${statsChildren}`}
                variant="outlined"
                size="small"
                sx={{ minWidth: 55, fontVariantNumeric: 'tabular-nums' }}
              />
            </Stack>
          </Box>
        </Paper>

        {/* Refresh progress indicator */}
        <Box sx={{ height: 4, mb: 1, borderRadius: 1, overflow: 'hidden', opacity: isRefreshing ? 1 : 0, transition: 'opacity 0.3s ease' }}>
          <LinearProgress />
        </Box>

        {/* Guest List */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : currentEvent ? (
          <Box sx={{ opacity: isRefreshing ? 0.6 : 1, transition: 'opacity 0.3s ease' }}>
          <GuestList
            guests={guests}
            families={families}
            categories={categories}
            selectedCategories={deferredCategories}
            selectedRsvpStatuses={deferredRsvpStatuses}
            selectedAgeGroups={deferredAgeGroups}
            selectedInvitationStatuses={deferredInvitationStatuses}
            searchTerm={deferredSearchTerm}
            onUpdate={handleUpdate}
            eventId={currentEvent.id}
            readOnly={!canEdit}
            events={events}
            guestPresence={guestPresence}
          />
          </Box>
        ) : (
          <Alert severity="info">
            No events available.{user?.isOwner && ' Click + to create one.'}
          </Alert>
        )}
      </Container>

      {/* Add Event Dialog */}
      <Dialog
        open={showAddEventForm}
        onClose={() => setShowAddEventForm(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight={600}>Add New Event</Typography>
        </DialogTitle>
        <Box component="form" onSubmit={handleCreateEvent}>
          <DialogContent>
            <TextField
              fullWidth
              label="Event Name"
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              placeholder="e.g., Ceremony, Reception"
              required
              autoFocus
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setShowAddEventForm(false)}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isCreatingEvent || !newEventName.trim()}
            >
              {isCreatingEvent ? <CircularProgress size={20} /> : 'Create Event'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Modals */}
      {showGuestForm && currentEvent && (
        <GuestForm
          onClose={() => setShowGuestForm(false)}
          onSuccess={handleGuestAdded}
          categories={categories}
          eventId={currentEvent.id}
          events={events}
          currentEventName={currentEvent.name}
          families={families}
        />
      )}

      {showFamilyForm && currentEvent && (
        <FamilyForm
          onClose={() => setShowFamilyForm(false)}
          onSuccess={handleFamilyAdded}
          categories={categories}
          guests={guests}
          eventId={currentEvent.id}
          events={events}
        />
      )}

      {showCategoryForm && (
        <AddCategoryModal
          categories={categories}
          onClose={() => setShowCategoryForm(false)}
          onSuccess={() => {
            fetchCategories().then(setCategories);
            // Also reload guests since renaming a category updates guest tags
            refreshGuests();
          }}
          readOnly={!canEdit}
        />
      )}

      {showUserManagement && (
        <UserManagement onClose={() => setShowUserManagement(false)} />
      )}

      {editingEvent && currentEvent && (
        <EventSettings
          event={currentEvent}
          events={events}
          onClose={() => setEditingEvent(null)}
          onSuccess={() => {
            setEditingEvent(null);
            refreshEvents();
            loadData(true);
          }}
          onEventDeleted={() => {
            setEditingEvent(null);
            refreshEvents();
          }}
        />
      )}

      {showImportRsvpModal && currentEvent && (
        <ImportRsvpModal
          eventId={currentEvent.id}
          guests={guests}
          families={families}
          onClose={() => setShowImportRsvpModal(false)}
          onSuccess={() => {
            setShowImportRsvpModal(false);
            loadData(true);
            showSuccess('RSVP data imported successfully');
          }}
        />
      )}

      {showExportModal && currentEvent && (
        <ExportDataModal
          guests={guests}
          families={families}
          categories={categories}
          events={events}
          currentEventId={currentEvent.id}
          onClose={() => setShowExportModal(false)}
          onSuccess={(message) => {
            showSuccess(message);
          }}
        />
      )}

      {showBackupModal && (
        <BackupManagement
          onClose={() => setShowBackupModal(false)}
          onDataRestored={() => {
            refreshEvents();
            loadData();
          }}
        />
      )}

      {showDashboard && currentEvent && (
        <Dashboard
          guests={guests}
          categories={categories}
          events={events}
          currentEventId={currentEvent.id}
          onClose={() => setShowDashboard(false)}
        />
      )}

      {showSeatingChart && currentEvent && (
        <SeatingChart
          guests={guests}
          eventId={currentEvent.id}
          onClose={() => setShowSeatingChart(false)}
        />
      )}

      <ScrollToTop />
    </Box>
  );
}

export default App;
