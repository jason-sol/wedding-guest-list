// Predefined color palette - optimized for white text readability
export const CATEGORY_COLORS = [
  '#E74C3C', // Dark Red
  '#3498DB', // Bright Blue
  '#2ECC71', // Green
  '#9B59B6', // Purple
  '#E67E22', // Orange
  '#1ABC9C', // Turquoise
  '#34495E', // Dark Blue-Gray
  '#E91E63', // Pink
  '#00BCD4', // Cyan
  '#8E44AD', // Dark Purple
  '#16A085', // Dark Teal
  '#27AE60', // Dark Green
  '#2980B9', // Dark Blue
  '#C0392B', // Dark Red
  '#D35400', // Dark Orange
  '#7F8C8D', // Gray
  '#95A5A6', // Light Gray (darker for contrast)
  '#F39C12', // Amber (darker)
  '#D68910', // Dark Amber
  '#5D6D7E', // Blue Gray
];

// Generate a color for a category based on its name
// Uses a simple hash function to consistently assign colors
export function getCategoryColor(categoryName: string): string {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Use absolute value and modulo to get index
  const index = Math.abs(hash) % CATEGORY_COLORS.length;
  return CATEGORY_COLORS[index];
}

// Get an unused color from the palette, or generate a new one if all are used
export function getUnusedCategoryColor(existingColors: string[]): string {
  // Find first unused color from palette
  for (const color of CATEGORY_COLORS) {
    if (!existingColors.includes(color)) {
      return color;
    }
  }
  
  // If all colors are used, generate a new color based on hash
  // This creates a variation by slightly modifying an existing color
  const baseColor = CATEGORY_COLORS[existingColors.length % CATEGORY_COLORS.length];
  return generateVariationColor(baseColor, existingColors.length);
}

// Generate a color variation when all palette colors are used
function generateVariationColor(baseColor: string, index: number): string {
  // Remove # and convert to RGB
  const hex = baseColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Create variation by adjusting brightness
  const variation = (index % 3) * 20 - 20; // -20, 0, or 20
  const newR = Math.max(0, Math.min(255, r + variation));
  const newG = Math.max(0, Math.min(255, g + variation));
  const newB = Math.max(0, Math.min(255, b + variation));
  
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}
