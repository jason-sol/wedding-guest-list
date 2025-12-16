import { useState, useEffect, useRef, useMemo } from 'react';
import { Guest, Family, CategoryInfo } from './types';
import { fetchGuests, fetchFamilies, fetchCategories, checkAuth, logout, exportData, importData } from './api';
import GuestList from './components/GuestList';
import GuestForm from './components/GuestForm';
import FamilyForm from './components/FamilyForm';
import AddCategoryModal from './components/AddCategoryModal';
import Login from './components/Login';
import CategoryTag from './components/CategoryTag';
import ScrollToTop from './components/ScrollToTop';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'ceremony' | 'reception'>('ceremony');
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollPositionRef = useRef<number | null>(null);
  const shouldRestoreScrollRef = useRef(false);

  useEffect(() => {
    // Check authentication on mount
    const verifyAuth = async () => {
      const authenticated = await checkAuth();
      setIsAuthenticated(authenticated);
      if (authenticated) {
        loadData();
      } else {
        setLoading(false);
      }
    };
    verifyAuth();
  }, []);

  // Restore scroll position after data updates
  useEffect(() => {
    if (shouldRestoreScrollRef.current && scrollPositionRef.current !== null && !loading) {
      // Use setTimeout to ensure DOM has fully updated after state changes
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

  const loadData = async (preserveScroll = false) => {
    // Save scroll position if we want to preserve it
    if (preserveScroll) {
      scrollPositionRef.current = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
      shouldRestoreScrollRef.current = true;
    }
    
    setLoading(true);
    setError(null);
    try {
      const [guestsData, familiesData, categoriesData] = await Promise.all([
        fetchGuests(),
        fetchFamilies(),
        fetchCategories(),
      ]);
      // Ensure we always set arrays, even if API returns something unexpected
      setGuests(Array.isArray(guestsData) ? guestsData : []);
      setFamilies(Array.isArray(familiesData) ? familiesData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error('Failed to load data:', error);
      // Set empty arrays on error to prevent crashes
      setGuests([]);
      setFamilies([]);
      setCategories([]);
      setError(error instanceof Error ? error.message : 'Failed to load data. Make sure the backend server is running on http://localhost:5000');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestAdded = () => {
    setShowGuestForm(false);
    loadData(true);
  };

  const handleFamilyAdded = () => {
    setShowFamilyForm(false);
    loadData(true);
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    loadData();
  };

  const handleLogout = async () => {
    await logout();
    setIsAuthenticated(false);
    setGuests([]);
    setFamilies([]);
    setCategories([]);
  };

  const handleExport = async () => {
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
      alert('Data exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      alert('Please select a JSON file');
      return;
    }

    const confirmed = window.confirm(
      'Importing data will replace all current guests, families, and categories. Are you sure you want to continue?'
    );

    if (!confirmed) {
      e.target.value = ''; // Reset file input
      return;
    }

    try {
      const result = await importData(file);
      alert(
        `Data imported successfully!\n` +
        `- Guests: ${result.imported.guests}\n` +
        `- Families: ${result.imported.families}\n` +
        `- Categories: ${result.imported.categories}`
      );
      // Reload data to show imported content
      loadData(false);
      // Reset file input
      e.target.value = '';
    } catch (error) {
      console.error('Import failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to import data. Please check the file format.');
      e.target.value = ''; // Reset file input
    }
  };

  // Filter guests by active tab (must be before any conditional returns)
  const tabFilteredGuests = useMemo(() => {
    if (activeTab === 'reception') {
      return guests.filter(guest => guest.reception === true);
    }
    return guests; // 'ceremony' shows all guests
  }, [guests, activeTab]);

  // Show login page if not authenticated
  if (isAuthenticated === false) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (loading || isAuthenticated === null) {
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>Wedding Guest List</h1>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </header>
      
      <div className="tabs-container">
        <button
          className={`tab-button ${activeTab === 'ceremony' ? 'active' : ''}`}
          onClick={() => setActiveTab('ceremony')}
        >
          Ceremony
        </button>
        <button
          className={`tab-button ${activeTab === 'reception' ? 'active' : ''}`}
          onClick={() => setActiveTab('reception')}
        >
          Reception
        </button>
      </div>
      
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
            <button onClick={() => setShowGuestForm(true)}>
              Add Guest
            </button>
            <button onClick={() => setShowFamilyForm(true)}>
              Add Family
            </button>
            <button 
              className="category-button"
              onClick={() => setShowCategoryForm(true)}
            >
              Add/Remove Category
            </button>
          </div>
          <div className="action-buttons-right">
            <button 
              className="export-button"
              onClick={handleExport}
            >
              Export Data
            </button>
            <label className="import-button-label">
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                style={{ display: 'none' }}
              />
              <span className="import-button">Import Data</span>
            </label>
          </div>
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
                ×
              </button>
            )}
          </div>
          <div className="total-guests-top">
            <p>Total Guests: <strong>{(() => {
              // Calculate filtered guest count (same logic as GuestList)
              let filtered = tabFilteredGuests;
              
              // Filter by categories
              if (selectedCategories.length > 0) {
                filtered = filtered.filter(guest => 
                  selectedCategories.some(cat => guest.tags.includes(cat))
                );
              }
              
              // Filter by search term
              if (searchTerm.trim()) {
                const searchLower = searchTerm.toLowerCase().trim();
                filtered = filtered.filter(guest => {
                  const fullName = `${guest.firstName} ${guest.lastName}`.toLowerCase();
                  return fullName.includes(searchLower);
                });
              }
              
              return filtered.length;
            })()}</strong></p>
          </div>
        </div>
      </div>

      {showGuestForm && (
        <GuestForm
          onClose={() => setShowGuestForm(false)}
          onSuccess={handleGuestAdded}
          categories={categories}
        />
      )}

      {showFamilyForm && (
        <FamilyForm
          onClose={() => setShowFamilyForm(false)}
          onSuccess={handleFamilyAdded}
          categories={categories}
          guests={guests}
        />
      )}

      {showCategoryForm && (
        <AddCategoryModal
          categories={categories}
          onClose={() => setShowCategoryForm(false)}
          onSuccess={() => {
            // Refresh categories but keep modal open
            loadData(true);
          }}
        />
      )}

      <GuestList
        guests={tabFilteredGuests}
        families={families}
        categories={categories}
        selectedCategories={selectedCategories}
        searchTerm={searchTerm}
        onUpdate={() => loadData(true)}
      />
      
      <ScrollToTop />
    </div>
  );
}

export default App;
