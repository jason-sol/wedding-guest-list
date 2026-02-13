import { capitalizeWords, capitalizeFirst } from './capitalize';

describe('Capitalize Utilities', () => {
  describe('capitalizeWords', () => {
    test('should capitalize first letter', () => {
      expect(capitalizeWords('john')).toBe('John');
    });

    test('should preserve other capitals', () => {
      expect(capitalizeWords('mcdonald')).toBe('Mcdonald');
      expect(capitalizeWords('McDonald')).toBe('McDonald');
    });

    test('should handle already capitalized string', () => {
      expect(capitalizeWords('John')).toBe('John');
    });

    test('should handle single character', () => {
      expect(capitalizeWords('j')).toBe('J');
    });

    test('should handle empty string', () => {
      expect(capitalizeWords('')).toBe('');
    });

    test('should return falsy values as-is', () => {
      expect(capitalizeWords(undefined as unknown as string)).toBeUndefined();
      expect(capitalizeWords(null as unknown as string)).toBeNull();
    });

    test('should handle strings with spaces', () => {
      expect(capitalizeWords('hello world')).toBe('Hello world');
    });
  });

  describe('capitalizeFirst', () => {
    test('should capitalize first letter', () => {
      expect(capitalizeFirst('test')).toBe('Test');
    });

    test('should handle empty string', () => {
      expect(capitalizeFirst('')).toBe('');
    });

    test('should preserve rest of string', () => {
      expect(capitalizeFirst('tEsT')).toBe('TEsT');
    });
  });
});
