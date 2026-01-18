/**
 * Category tag component using MUI Chip
 * Displays a colored badge for categories with optional remove functionality
 */

import { Chip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Category, CategoryInfo } from '../types';

interface CategoryTagProps {
  category: Category;
  categoryInfo?: CategoryInfo;
  onRemove?: () => void;
  removable?: boolean;
  size?: 'small' | 'medium';
}

// Calculate relative luminance for WCAG contrast
export function getLuminance(hexColor: string): number {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;

  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

// Determine if white or black text has better contrast
export function shouldUseWhiteText(hexColor: string): boolean {
  const luminance = getLuminance(hexColor);
  // Use white text if background luminance is below 0.4 (more aggressive threshold for readability)
  return luminance < 0.4;
}

// Convert hex to HSL
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substr(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substr(2, 2), 16) / 255;
  const b = parseInt(cleanHex.substr(4, 2), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

// Convert HSL to hex
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Adjust color for better contrast based on theme mode
// In light mode: darken light colors; In dark mode: lighten dark colors
export function getContrastAdjustedColor(hexColor: string, mode: 'light' | 'dark'): string {
  const hsl = hexToHsl(hexColor);

  if (mode === 'light') {
    // In light mode, if the color is too light (high luminance), darken it
    // Target: colors should have luminance that makes them readable on white/light gray
    if (hsl.l > 55) {
      // Darken the color by reducing lightness and boosting saturation
      hsl.l = Math.max(35, hsl.l - 25);
      hsl.s = Math.min(100, hsl.s + 15);
    }
  } else {
    // In dark mode, if the color is too dark (low luminance), lighten it
    // Also boost saturation for better visibility
    if (hsl.l < 45) {
      hsl.l = Math.min(65, hsl.l + 25);
      hsl.s = Math.min(100, hsl.s + 10);
    }
  }

  return hslToHex(hsl.h, hsl.s, hsl.l);
}

export default function CategoryTag({
  category,
  categoryInfo,
  onRemove,
  removable = false,
  size = 'small',
}: CategoryTagProps) {
  const bgColor = categoryInfo?.color || '#4ECDC4';
  const textColor = shouldUseWhiteText(bgColor) ? '#FFFFFF' : '#1E293B';

  return (
    <Chip
      label={category}
      size={size}
      onDelete={removable && onRemove ? onRemove : undefined}
      deleteIcon={removable ? <CloseIcon /> : undefined}
      sx={{
        bgcolor: bgColor,
        color: textColor,
        fontWeight: 500,
        fontSize: size === 'small' ? '0.75rem' : '0.875rem',
        height: size === 'small' ? 24 : 32,
        '& .MuiChip-label': {
          px: 1.5,
        },
        '& .MuiChip-deleteIcon': {
          color: textColor,
          opacity: 0.7,
          fontSize: '1rem',
          '&:hover': {
            color: textColor,
            opacity: 1,
          },
        },
        transition: 'all 0.2s ease',
        '&:hover': {
          filter: 'brightness(0.95)',
        },
      }}
    />
  );
}
