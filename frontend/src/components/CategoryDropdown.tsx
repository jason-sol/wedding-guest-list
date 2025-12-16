import { useState, useRef, useEffect } from 'react';
import { Category, CategoryInfo } from '../types';
import CategoryTag from './CategoryTag';
import './CategoryDropdown.css';

interface CategoryDropdownProps {
  categories: CategoryInfo[];
  selectedCategories: Category[];
  onSelect: (category: Category) => void;
  onRemove: (category: Category) => void;
  label?: string;
}

export default function CategoryDropdown({
  categories,
  selectedCategories,
  onSelect,
  onRemove,
  label = 'Categories',
}: CategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (category: Category) => {
    onSelect(category);
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div className="form-group">
      <label>{label}</label>
      <div className="category-dropdown" ref={dropdownRef}>
        <div
          className="category-dropdown-trigger"
          onClick={() => setIsOpen(!isOpen)}
        >
          <input
            type="text"
            placeholder="Search or select categories..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
          />
          <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
        </div>
        
        {isOpen && (
          <div className="category-dropdown-menu">
            {filteredCategories.length === 0 ? (
              <div className="dropdown-empty">No categories found</div>
            ) : (
              filteredCategories.map((catInfo) => (
                <div
                  key={catInfo.name}
                  className={`dropdown-item ${
                    selectedCategories.includes(catInfo.name) ? 'selected' : ''
                  }`}
                  onClick={() => handleSelect(catInfo.name)}
                >
                  <CategoryTag category={catInfo.name} categoryInfo={catInfo} />
                </div>
              ))
            )}
          </div>
        )}
      </div>
      
      {selectedCategories.length > 0 && (
        <div className="selected-tags">
          {selectedCategories.map((category) => {
            const catInfo = categories.find(c => c.name === category);
            return (
              <CategoryTag
                key={category}
                category={category}
                categoryInfo={catInfo}
                removable
                onRemove={() => onRemove(category)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
