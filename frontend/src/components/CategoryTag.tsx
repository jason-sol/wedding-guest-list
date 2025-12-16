import { Category, CategoryInfo } from '../types';
import './CategoryTag.css';

interface CategoryTagProps {
  category: Category;
  categoryInfo?: CategoryInfo;
  onRemove?: () => void;
  removable?: boolean;
}

export default function CategoryTag({
  category,
  categoryInfo,
  onRemove,
  removable = false,
}: CategoryTagProps) {
  const color = categoryInfo?.color || '#4ECDC4';
  
  return (
    <span 
      className="category-tag"
      style={{ backgroundColor: color }}
    >
      {category}
      {removable && onRemove && (
        <button
          type="button"
          className="tag-remove"
          onClick={onRemove}
          aria-label={`Remove ${category} tag`}
        >
          ×
        </button>
      )}
    </span>
  );
}
