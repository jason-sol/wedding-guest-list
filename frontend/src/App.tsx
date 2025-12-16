import { useState, useEffect } from 'react';
import { Guest, Family, SortOption, ViewMode } from './types';
import { fetchGuests, fetchFamilies } from './api';
import GuestList from './components/GuestList';
import GuestForm from './components/GuestForm';
import FamilyForm from './components/FamilyForm';
import SortControls from './components/SortControls';
import './App.css';

function App() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('lastName');
  const [viewMode, setViewMode] = useState<ViewMode>('individual');
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [sortBy]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [guestsData, familiesData] = await Promise.all([
        fetchGuests(sortBy),
        fetchFamilies(),
      ]);
      // Ensure we always set arrays, even if API returns something unexpected
      setGuests(Array.isArray(guestsData) ? guestsData : []);
      setFamilies(Array.isArray(familiesData) ? familiesData : []);
    } catch (error) {
      console.error('Failed to load data:', error);
      // Set empty arrays on error to prevent crashes
      setGuests([]);
      setFamilies([]);
      setError(error instanceof Error ? error.message : 'Failed to load data. Make sure the backend server is running on http://localhost:4000');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestAdded = () => {
    setShowGuestForm(false);
    loadData();
  };

  const handleFamilyAdded = () => {
    setShowFamilyForm(false);
    loadData();
  };

  if (loading) {
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
          <button onClick={loadData} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Wedding Guest List</h1>
      </header>
      
      <div className="app-controls">
        <SortControls
          sortBy={sortBy}
          onSortChange={setSortBy}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        
        <div className="action-buttons">
          <button onClick={() => setShowGuestForm(true)}>
            Add Guest
          </button>
          <button onClick={() => setShowFamilyForm(true)}>
            Add Family
          </button>
        </div>
      </div>

      {showGuestForm && (
        <GuestForm
          onClose={() => setShowGuestForm(false)}
          onSuccess={handleGuestAdded}
        />
      )}

      {showFamilyForm && (
        <FamilyForm
          onClose={() => setShowFamilyForm(false)}
          onSuccess={handleFamilyAdded}
        />
      )}

      <GuestList
        guests={guests}
        families={families}
        viewMode={viewMode}
        onUpdate={loadData}
      />
    </div>
  );
}

export default App;
