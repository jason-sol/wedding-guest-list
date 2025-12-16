# Change: Add Guest List Management

## Why
The core functionality of the wedding guest list website is to manage guests. Users need the ability to add, organize, sort, and manage their guest list with support for individual guests and family groupings. This feature provides the foundation for all other guest list operations.

## What Changes
- Add guest list management capability with CRUD operations for guests
- Support for first and last names
- Category/tag system for organizing guests (groom's family, bride's family, friends, church friends, church families)
- Multiple sorting options (alphabetical by first name, alphabetical by last name, by category)
- Family grouping functionality (guests can be grouped as families but also displayed individually)
- Quick add/remove operations for individual guests and families
- Bulk family addition feature

## Impact
- Affected specs: New capability `guest-list`
- Affected code: New feature - no existing code to modify
- This is the foundational feature that other features (RSVP tracking, event management) will build upon
