import { SortOption, ViewMode } from '../types';
import './SortControls.css';

interface SortControlsProps {
  sortBy: SortOption;
  onSortChange: (sortBy: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export default function SortControls({
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
}: SortControlsProps) {
  return (
    <div className="sort-controls">
      <label>
        Sort by:
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
        >
          <option value="firstName">First Name</option>
          <option value="lastName">Last Name</option>
          <option value="category">Category</option>
        </select>
      </label>

      <label>
        View:
        <select
          value={viewMode}
          onChange={(e) => onViewModeChange(e.target.value as ViewMode)}
        >
          <option value="individual">Individual</option>
          <option value="family">Family</option>
        </select>
      </label>
    </div>
  );
}
