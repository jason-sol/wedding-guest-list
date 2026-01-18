import { useState, useEffect, useRef, useCallback } from 'react';
import { Guest, Family, CategoryInfo } from './types';
import { fetchGuests, fetchFamilies, fetchCategories, fetchGuestPresence, exportData, importData, createEvent, GuestPresenceMap } from './api';
import { useFilteredGuests } from './hooks/useFilteredGuests';
import { useToast } from './components/Toast';
import { useAuth } from './contexts/AuthContext';
import { useEvents } from './contexts/EventContext';
import GuestList from './components/GuestList';
import GuestForm from './components/GuestForm';
import FamilyForm from './components/FamilyForm';
import AddCategoryModal from './components/AddCategoryModal';
import UserManagement from './components/UserManagement';
import EventSettings from './components/EventSettings';
import Login from './components/Login';
import CategoryTag from './components/CategoryTag';
import ScrollToTop from './components/ScrollToTop';
import './App.css';

function App() {
  const { isAuthenticated, user, logout, login } = useAuth();
  const { events, currentEvent, setCurrentEvent, refreshEvents, canEdit, isBlocked, loading: eventsLoading } = useEvents();

  const [guests, setGuests] = useState<Guest[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [guestPresence, setGuestPresence] = useState<GuestPresenceMap>({});
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showAddEventForm, setShowAddEventForm] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const scrollPositionRef = useRef<number | null>(null);
  const shouldRestoreScrollRef = useRef(false);

  const { showSuccess, showError } = useToast();

  // Restore scroll position after data updates
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

    setLoading(true);
    setError(null);
    try {
      const [guestsData, familiesData, categoriesData, presenceData] = await Promise.all([
        fetchGuests(currentEvent.id),
        fetchFamilies(currentEvent.id),
        fetchCategories(),
        fetchGuestPresence(currentEvent.id),
      ]);
      setGuests(Array.isArray(guestsData) ? guestsData : []);
      setFamilies(Array.isArray(familiesData) ? familiesData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setGuestPresence(presenceData || {});
    } catch (err) {
      console.error('Failed to load data:', err);
      setGuests([]);
      setFamilies([]);
      setCategories([]);
      setGuestPresence({});
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [currentEvent]);

  // Load event data when current event changes
  useEffect(() => {
    if (isAuthenticated && currentEvent) {
      loadData();
    }
  }, [isAuthenticated, currentEvent, loadData]);

  // Load categories when authenticated (global, not event-scoped)
  useEffect(() => {
    if (isAuthenticated) {
      fetchCategories().then(setCategories).catch(console.error);
    }
  }, [isAuthenticated]);

  const handleGuestAdded = () => {
    setShowGuestForm(false);
    loadData(true);
    showSuccess('Guest added successfully');
  };

  const handleFamilyAdded = () => {
    setShowFamilyForm(false);
    loadData(true);
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

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await exportData();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wedding-guest-list-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showSuccess('Data exported successfully');
    } catch (err) {
      console.error('Export failed:', err);
      showError('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
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

  // Use shared filtering hook
  const filteredGuests = useFilteredGuests({
    guests,
    selectedCategories,
    searchTerm,
  });

  // Show login page if not authenticated
  if (isAuthenticated === false) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (isAuthenticated === null || eventsLoading) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>Wedding Guest List</h1>
        </header>
        <div className="loading-state">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>Wedding Guest List</h1>
        </header>
        <div className="error-state">
          <p className="error-message">{error}</p>
          <button onClick={() => loadData(false)} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Blocked event view
  if (isBlocked && currentEvent) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>Wedding Guest List</h1>
          <div className="header-right">
            {user && <span className="username-display">{user.username}</span>}
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </header>

        <div className="tabs-container">
          {events.map((event) => (
            <button
              key={event.id}
              className={`tab-button ${currentEvent?.id === event.id ? 'active' : ''}`}
              onClick={() => setCurrentEvent(event.id)}
            >
              {event.name}
            </button>
          ))}
        </div>

        <div className="blocked-state">
          <h2>Access Denied</h2>
          <p>You do not have permission to view this event.</p>
          <p>Please contact the owner to request access to "{currentEvent.name}".</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Wedding Guest List</h1>
        <div className="header-right">
          {user && <span className="username-display">{user.username}{user.isOwner && ' (Owner)'}</span>}
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      <div className="tabs-container">
        {events.map((event) => (
          <button
            key={event.id}
            className={`tab-button ${currentEvent?.id === event.id ? 'active' : ''} ${event.permission === 'none' ? 'blocked' : ''}`}
            onClick={() => setCurrentEvent(event.id)}
            title={event.permission === 'none' ? 'No access' : event.permission}
          >
            {event.name}
            {event.permission === 'none' && <span className="blocked-indicator">!</span>}
            {user?.isOwner && currentEvent?.id === event.id && (
              <span
                className="event-settings-icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingEvent(event.id);
                }}
                title="Event settings"
              >
                ⚙
              </span>
            )}
          </button>
        ))}
        {user?.isOwner && (
          <button
            className="tab-button add-event-button"
            onClick={() => setShowAddEventForm(true)}
            title="Add new event"
          >
            +
          </button>
        )}
      </div>

      {showAddEventForm && (
        <div className="modal-overlay" onClick={() => setShowAddEventForm(false)}>
          <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Event</h2>
            <form onSubmit={handleCreateEvent}>
              <div className="form-group">
                <label htmlFor="event-name">Event Name</label>
                <input
                  id="event-name"
                  type="text"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  placeholder="e.g., Ceremony, Reception"
                  required
                  autoFocus
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowAddEventForm(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={isCreatingEvent || !newEventName.trim()}>
                  {isCreatingEvent ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="app-controls">
        <div className="app-controls-row">
          <div className="category-filter">
            <label>Filter by Category:</label>
            <div className="category-filter-pills">
              {categories.length === 0 ? (
                <span className="no-categories">No categories available</span>
              ) : (
                categories.map((cat) => {
                  const isSelected = selectedCategories.includes(cat.name);
                  return (
                    <button
                      key={cat.name}
                      type="button"
                      className={`category-filter-pill ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedCategories(selectedCategories.filter(c => c !== cat.name));
                        } else {
                          setSelectedCategories([...selectedCategories, cat.name]);
                        }
                      }}
                    >
                      <CategoryTag
                        category={cat.name}
                        categoryInfo={isSelected ? { name: cat.name, color: '#4CAF50' } : cat}
                      />
                    </button>
                  );
                })
              )}
              {selectedCategories.length > 0 && (
                <button
                  type="button"
                  className="clear-filter-button"
                  onClick={() => setSelectedCategories([])}
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          <div className="action-buttons-left">
            {canEdit && (
              <>
                <button onClick={() => setShowGuestForm(true)}>
                  Add Guest
                </button>
                <button onClick={() => setShowFamilyForm(true)}>
                  Add Family
                </button>
              </>
            )}
            <button
              className="category-button"
              onClick={() => setShowCategoryForm(true)}
            >
              {canEdit ? 'Add/Remove Category' : 'View Categories'}
            </button>
          </div>
          {user?.isOwner && (
            <div className="action-buttons-right">
              <button
                className="manage-users-button"
                onClick={() => setShowUserManagement(true)}
              >
                Manage Users
              </button>
              <button
                className="export-button"
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? 'Exporting...' : 'Export Data'}
              </button>
              <label className={`import-button-label ${isImporting ? 'disabled' : ''}`}>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  style={{ display: 'none' }}
                  disabled={isImporting}
                />
                <span className="import-button">
                  {isImporting ? 'Importing...' : 'Import Data'}
                </span>
              </label>
            </div>
          )}
        </div>

        <div className="search-and-stats">
          <div className="search-bar">
            <label htmlFor="search-input">Search:</label>
            <input
              id="search-input"
              type="text"
              placeholder="Search guests and families..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button
                type="button"
                className="clear-search-button"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
              >
                x
              </button>
            )}
          </div>
          <div className="total-guests-top">
            <p>Total Guests: <strong>{filteredGuests.length}</strong></p>
          </div>
        </div>
      </div>

      {showGuestForm && currentEvent && (
        <GuestForm
          onClose={() => setShowGuestForm(false)}
          onSuccess={handleGuestAdded}
          categories={categories}
          eventId={currentEvent.id}
          events={events}
          currentEventName={currentEvent.name}
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

      {loading ? (
        <div className="loading-state">
          <p>Loading guests...</p>
        </div>
      ) : currentEvent ? (
        <GuestList
          guests={guests}
          families={families}
          categories={categories}
          selectedCategories={selectedCategories}
          searchTerm={searchTerm}
          onUpdate={() => loadData(true)}
          eventId={currentEvent.id}
          readOnly={!canEdit}
          events={events}
          guestPresence={guestPresence}
        />
      ) : (
        <div className="empty-state">
          <p>No events available. {user?.isOwner && 'Click + to create one.'}</p>
        </div>
      )}

      <ScrollToTop />
    </div>
  );
}

export default App;
