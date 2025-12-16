"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.capitalizeWords = capitalizeWords;
exports.capitalizeFirst = capitalizeFirst;
// Utility function to capitalize only the first letter of the string
// Preserves other capital letters in the name (e.g., "McDonald" stays "McDonald")
function capitalizeWords(str) {
    if (!str)
        return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}
// Capitalize first letter only (alias for consistency)
function capitalizeFirst(str) {
    if (!str)
        return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}
