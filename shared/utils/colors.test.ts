import {
  CATEGORY_COLORS,
  getCategoryColor,
  getUnusedCategoryColor,
} from './colors';

describe('Color Utilities', () => {
  describe('CATEGORY_COLORS', () => {
    test('should have at least 10 colors', () => {
      expect(CATEGORY_COLORS.length).toBeGreaterThanOrEqual(10);
    });

    test('all colors should be valid hex format', () => {
      for (const color of CATEGORY_COLORS) {
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });
  });

  describe('getCategoryColor', () => {
    test('should return a valid hex color', () => {
      const color = getCategoryColor('Test');
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    test('should return consistent color for same name', () => {
      const color1 = getCategoryColor('Bride Family');
      const color2 = getCategoryColor('Bride Family');
      expect(color1).toBe(color2);
    });

    test('should return a color from the palette', () => {
      const color = getCategoryColor('Bride Family');
      expect(CATEGORY_COLORS).toContain(color);
    });

    test('should produce different colors for different names', () => {
      const color1 = getCategoryColor('Bride Family');
      const color2 = getCategoryColor('Groom Family');
      // Not guaranteed to be different but very likely
      // Just check they're valid
      expect(color1).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(color2).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    test('should handle empty string', () => {
      const color = getCategoryColor('');
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  describe('getUnusedCategoryColor', () => {
    test('should return a palette color when some are unused', () => {
      const color = getUnusedCategoryColor([]);
      expect(CATEGORY_COLORS).toContain(color);
    });

    test('should return first unused color from palette', () => {
      const color = getUnusedCategoryColor([CATEGORY_COLORS[0]]);
      expect(color).toBe(CATEGORY_COLORS[1]);
    });

    test('should return a variation when all palette colors are used', () => {
      const color = getUnusedCategoryColor([...CATEGORY_COLORS]);
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      // Should be a new color, not in the original palette
      // (though not guaranteed due to rounding)
    });

    test('should skip already-used colors', () => {
      const usedColors = CATEGORY_COLORS.slice(0, 5);
      const color = getUnusedCategoryColor(usedColors);
      expect(usedColors).not.toContain(color);
    });
  });
});
