import { Category } from '../types';
import './CategoryTag.css';

interface CategoryTagProps {
  category: Category;
  onRemove?: () => void;
  removable?: boolean;
}

export default function CategoryTag({
  category,
  onRemove,
  removable = false,
}: CategoryTagProps) {
  return (
    <span className="category-tag">
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
