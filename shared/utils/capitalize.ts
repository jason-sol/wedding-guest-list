// Utility function to capitalize only the first letter of the string
// Preserves other capital letters in the name (e.g., "McDonald" stays "McDonald")
export function capitalizeWords(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Capitalize first letter only (alias for consistency)
export function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
