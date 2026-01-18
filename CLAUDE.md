# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Overview

A web application for managing wedding guest lists with support for multiple events, individual guests, family groupings, categories, user management with permissions, and flexible filtering. Built with React + TypeScript + Material UI (frontend) and Node.js + Express + TypeScript (backend).

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Material UI v6 (Material Design 3)
- **Backend**: Node.js, Express, TypeScript, Zod (validation)
- **Data Store**: In-memory with async JSON file persistence (`data/data.json`)
- **Testing**: Jest (backend), Vitest (frontend)
- **Deployment**: Docker + Docker Compose + Nginx

## Project Structure

```
wedding-guest-list/
├── backend/                    # Express API server
│   └── src/
│       ├── index.ts           # Server entry, route mounting, graceful shutdown
│       ├── config.ts          # Central configuration with env validation
│       ├── store.ts           # In-memory data store with async persistence
│       ├── sessionStore.ts    # Persistent session management
│       ├── validation.ts      # Zod schemas for input validation
│       ├── apiResponse.ts     # Standardized API response helpers
│       ├── middleware/auth.ts # Bearer token authentication
│       └── routes/            # API route handlers
│           ├── auth.ts        # Authentication routes
│           ├── events.ts      # Event management routes
│           ├── guests.ts      # Guest CRUD (event-scoped)
│           ├── families.ts    # Family management (event-scoped)
│           ├── categories.ts  # Category CRUD (global)
│           ├── users.ts       # User management (owner only)
│           └── data.ts        # Import/export routes
├── frontend/                   # React SPA with Material UI
│   └── src/
│       ├── App.tsx            # Main component with AppBar, Tabs, controls
│       ├── api.ts             # API client with auth token handling
│       ├── types.ts           # Frontend TypeScript types
│       ├── contexts/          # React contexts
│       │   ├── AuthContext.tsx    # Authentication state
│       │   └── EventContext.tsx   # Event selection and permissions
│       ├── hooks/             # Custom React hooks
│       │   └── useFilteredGuests.ts  # Guest filtering logic
│       ├── theme/             # Material UI theming
│       │   ├── theme.ts       # Theme configuration (colors, typography)
│       │   └── ThemeContext.tsx   # Dark/light mode provider
│       └── components/        # UI components (all using MUI)
│           ├── Toast.tsx      # Snackbar notifications
│           ├── Login.tsx      # Login form
│           ├── GuestList.tsx  # Main guest list display
│           ├── GuestItem.tsx  # Individual guest row
│           ├── GuestForm.tsx  # Add guest dialog
│           ├── EditGuestForm.tsx  # Edit guest dialog
│           ├── FamilyGroup.tsx    # Collapsible family accordion
│           ├── FamilyForm.tsx     # Add family dialog
│           ├── EditFamilyForm.tsx # Edit family with drag-drop
│           ├── CategoryTag.tsx    # Color-coded category chip
│           ├── CategoryDropdown.tsx   # Category autocomplete
│           ├── AddCategoryModal.tsx   # Manage categories dialog
│           ├── AssignToFamilyModal.tsx # Assign guest to family
│           ├── BulkEventsModal.tsx    # Bulk event assignment
│           ├── EventSettings.tsx      # Event settings dialog
│           ├── UserManagement.tsx     # User/permissions management
│           └── ScrollToTop.tsx        # Floating scroll button
├── shared/                     # Shared TypeScript types and utilities
│   ├── types/                 # Guest, Family, Category, Event, User interfaces
│   └── utils/                 # Color assignment, string capitalization
├── data/                       # Persistent data directory
│   ├── data.json              # All application data
│   └── sessions.json          # Active sessions
├── docker-compose.yml          # Standard Docker deployment
├── zimaos-compose.yaml         # ZimaOS/CasaOS deployment
├── Dockerfile.backend          # Backend container
├── Dockerfile.frontend         # Frontend container
└── nginx.conf                  # Nginx reverse proxy config
```

## Development Commands

### Quick Start
```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Start backend (port 5000)
cd backend && npm run dev

# Start frontend (port 5173)
cd frontend && npm run dev
```

### Docker
```bash
docker compose up -d --build     # Build and start
docker compose down              # Stop services
docker compose logs -f           # View logs

# ZimaOS deployment
docker compose -f zimaos-compose.yaml up -d --build
```

### Testing
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

### Building
```bash
# Backend
cd backend && npm run build

# Frontend
cd frontend && npm run build
```

## Environment Variables

Create `.env` in project root:
```bash
# Authentication (REQUIRED in production)
AUTH_USERNAME=username
AUTH_PASSWORD=password
AUTH_USERNAME_2=username2   # Optional second user
AUTH_PASSWORD_2=password2

# Server
PORT=5000
NODE_ENV=development  # development | production | test

# Session config (optional)
SESSION_DURATION_HOURS=24
SESSION_CLEANUP_HOURS=1

# CORS (optional, comma-separated for production)
CORS_ALLOWED_ORIGINS=https://example.com

# Validation limits (optional)
MAX_NAME_LENGTH=100
MAX_CATEGORY_NAME_LENGTH=50
MAX_TAGS_PER_GUEST=20
```

**Note**: In production, `AUTH_USERNAME` and `AUTH_PASSWORD` are required. The server will fail to start without them. In development, it defaults to `dev/dev` with a warning.

## API Endpoints

All API responses follow a standardized format:
```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, error: string, details?: unknown }
```

### Authentication (Public)
- `POST /api/auth/login` - Login, returns bearer token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/check` - Verify token validity
- `GET /health` - Health check

### Events (Protected)
- `GET /api/events` - Get all events with user permissions
- `POST /api/events` - Create event (owner only)
- `PUT /api/events/:id` - Update event (owner only)
- `DELETE /api/events/:id` - Delete event (owner only)
- `POST /api/events/:id/reconstruct-families` - Rebuild families from source event

### Guests (Event-scoped, Protected)
- `GET /api/events/:eventId/guests` - Get all guests for event
- `POST /api/events/:eventId/guests` - Add guest
- `PUT /api/events/:eventId/guests/:id` - Update guest
- `DELETE /api/events/:eventId/guests/:id` - Delete guest
- `POST /api/events/:eventId/guests/:id/copy` - Copy guest to another event
- `GET /api/events/:eventId/guests/presence` - Get guest presence across all events

### Families (Event-scoped, Protected)
- `GET /api/events/:eventId/families` - Get all families
- `POST /api/events/:eventId/families` - Create family with members
- `PUT /api/events/:eventId/families/:id` - Update family
- `PUT /api/events/:eventId/families/:id/members/reorder` - Reorder members
- `POST /api/events/:eventId/families/:id/members` - Add guest to family
- `DELETE /api/events/:eventId/families/:id/members/:guestId` - Remove guest
- `DELETE /api/events/:eventId/families/:id` - Delete family
- `POST /api/events/:eventId/families/:id/copy` - Copy family to another event

### Categories (Global, Protected)
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Add category (auto-assigns color)
- `PUT /api/categories/:name` - Rename category (updates all guest tags)
- `DELETE /api/categories/:name` - Delete category (removes from all guests)

### Users (Owner only)
- `GET /api/users` - Get all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user password
- `DELETE /api/users/:id` - Delete user

### Event Permissions (Owner only)
- `GET /api/events/:eventId/permissions` - Get permissions for event
- `PUT /api/events/:eventId/permissions/:userId` - Set user permission (admin/viewer/none)

### Data Management (Owner only)
- `GET /api/data/export` - Export all data as JSON
- `POST /api/data/import` - Import data (replaces all existing data)

## Architecture

### Backend Modules

- **config.ts**: Central configuration with environment validation. Fails fast in production if required vars are missing.

- **store.ts**: In-memory data store with async file persistence. Uses debounced writes and atomic file operations (temp file + rename). Supports multi-event guest/family storage.

- **sessionStore.ts**: Session management with persistence. Sessions survive server restarts.

- **validation.ts**: Zod schemas for all input validation including input length limits, basic XSS prevention, referential integrity checks, and type coercion.

- **apiResponse.ts**: Standardized response helpers (`sendSuccess`, `sendError`, `sendNotFound`, etc.)

### Frontend Architecture

- **Material UI**: All components use MUI v6 with Material Design 3 styling. Theme configured in `theme/theme.ts`.

- **Dark/Light Mode**: `ThemeContext` provides mode toggle with localStorage persistence and system preference detection.

- **Authentication**: `AuthContext` manages login state, token storage, and user info.

- **Event Management**: `EventContext` manages event selection, permissions, and provides `canEdit`/`isBlocked` flags.

- **Toast Notifications**: `useToast()` hook for success/error/warning/info messages via MUI Snackbar.

- **Shared Filtering**: `useFilteredGuests` hook handles search and category filtering.

- **Scroll Preservation**: `loadData(true)` preserves scroll position after updates.

### Key UI Patterns

- **Category Tags**: Color-coded chips with WCAG-compliant text contrast (auto white/dark based on luminance)
- **Category Filter**: Outlined when inactive, filled with checkmark when active
- **Dialogs**: All modals use MUI Dialog with consistent styling
- **Forms**: MUI TextField, Select, Autocomplete components
- **Lists**: Accordion for families, Paper for guest items
- **Drag-and-Drop**: Family member reordering in EditFamilyForm

### Authentication Flow
1. Token-based auth with configurable session duration (default 24 hours)
2. Sessions persisted to `data/sessions.json` (survive restarts)
3. Tokens stored in localStorage on frontend
4. `Authorization: Bearer {token}` header on all protected routes
5. Constant-time credential comparison (prevents timing attacks)

### Permission System
- **Owner**: Full access to all features including user management
- **Admin**: Can edit guests, families, categories for permitted events
- **Viewer**: Read-only access to permitted events
- **None**: No access to event (blocked)

### Data Persistence
- In-memory Maps for fast access
- Async JSON writes with debouncing (500ms)
- Atomic writes using temp file + rename
- Auto-loads from file on startup
- All data (guests, families, events, categories, users, permissions) in single `data.json`

### Graceful Shutdown
Server handles SIGTERM/SIGINT:
1. Stops accepting new connections
2. Flushes data store to disk
3. Saves active sessions
4. Exits cleanly (10s timeout for force exit)

## Code Conventions

- TypeScript strict mode enabled
- Zod schemas for all input validation
- Standardized API responses via `apiResponse.ts`
- Shared types from `shared/types/index.ts`
- API client functions in `frontend/src/api.ts`
- All UI components use Material UI (no custom CSS files)
- Toast notifications for user feedback (no `alert()` except confirmations)
- Dropdown menus sorted alphabetically

## Color Utilities

The `CategoryTag` component exports helper functions for color contrast:
- `getLuminance(hex)`: Calculate WCAG relative luminance
- `shouldUseWhiteText(hex)`: Determine if white text needed for contrast
- `getContrastAdjustedColor(hex, mode)`: Adjust color for theme mode contrast

## Known Limitations

- **No rate limiting**: Consider adding rate limiting for production.

- **Single-node only**: Session and data stores are local. For multi-node deployment, would need Redis/database.

- **No email/password reset**: Users managed by owner only.
