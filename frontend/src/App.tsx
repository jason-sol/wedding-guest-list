import { useState, useEffect } from 'react';
import { Guest, Family, CategoryInfo } from './types';
import { fetchGuests, fetchFamilies, fetchCategories } from './api';
import GuestList from './components/GuestList';
import GuestForm from './components/GuestForm';
import FamilyForm from './components/FamilyForm';
import AddCategoryModal from './components/AddCategoryModal';
import CategoryTag from './components/CategoryTag';
import './App.css';

function App() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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
        
        <div className="action-buttons">
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
        />
      )}

      {showCategoryForm && (
        <AddCategoryModal
          categories={categories}
          onClose={() => setShowCategoryForm(false)}
          onSuccess={() => {
            // Refresh categories but keep modal open
            loadData();
          }}
        />
      )}

      <GuestList
        guests={guests}
        families={families}
        categories={categories}
        selectedCategories={selectedCategories}
        onUpdate={loadData}
      />
    </div>
  );
}

export default App;
