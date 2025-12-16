# Project Context

## Purpose
A web application for managing wedding guest lists. The system allows couples to:
- Create and manage guest lists
- Track RSVPs and attendance
- Manage guest information (names, contact details, dietary restrictions, etc.)
- Organize guests by categories (groom's family, bride's family, friends, church friends, church families) and events (ceremony, reception, etc.)

## Tech Stack
- **Frontend**: React
- **Backend**: Node.js
- **Database**: [To be determined - consider PostgreSQL, SQLite, or cloud database]
- **Language**: TypeScript

## Project Conventions

### Code Style
- Prefer simple, clean, maintainable solutions over clever or complex ones
- Readability and maintainability are primary concerns
- Match the style and formatting of surrounding code for consistency
- Use clear, descriptive names that are evergreen (avoid "new", "improved", "enhanced")
- Preserve code comments unless proven false
- Write evergreen comments that describe code as it is, not how it evolved

### Architecture Patterns
- Start with the smallest reasonable implementation
- Single-file implementations until proven insufficient
- Avoid frameworks without clear justification
- Choose boring, proven patterns
- Only add complexity when:
  - Performance data shows current solution is too slow
  - Concrete scale requirements exist (>1000 users, >100MB data)
  - Multiple proven use cases require abstraction

### Testing Strategy
- Prefer Test-Driven Development (TDD) for new functionality
- TDD Cycle: Red (write failing tests) → Green (implement minimum code) → Refactor (improve while keeping tests green)
- Write comprehensive test cases before implementation
- Tests serve as living documentation
- Use TDD for:
  - New features or packages
  - Complex business logic
  - APIs or public interfaces
  - Bug fixes (write test that reproduces bug, then fix)

### Git Workflow
- **NEVER** use `--no-verify` when committing code
- Make the smallest reasonable changes to achieve desired outcome
- Ask permission before reimplementing features or systems from scratch
- Never remove code comments unless proven false
- When fixing bugs or errors, never throw away old implementation without explicit permission

## Domain Context

### Core Entities
- **Guest**: A person invited to the wedding
  - Name, contact information, relationship to couple
  - RSVP status (pending, accepted, declined)
  - Dietary restrictions, special accommodations
  - Plus-one information
- **Guest List**: Collection of guests, possibly organized by category or event
- **Event**: Different parts of the wedding (ceremony, reception, thanksgiving night)
- **RSVP**: Response from guest indicating attendance

### Business Rules
- Guests may be invited to one or more events
- RSVPs may be required by a certain date
- Guest information should be private and secure
- Plus-ones may be allowed or restricted per guest

## Important Constraints
- Privacy: Guest information must be kept secure and private
- Data persistence: Guest lists and RSVPs must be reliably stored
- User experience: Simple, intuitive interface for non-technical users
- Accessibility: Should be usable by guests with varying technical abilities

## External Dependencies
- [To be determined - consider email service for invitations, etc.]
