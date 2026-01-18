# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Overview

A web application for managing wedding guest lists with support for individual guests, family groupings, categories, and flexible filtering. Built with React + TypeScript (frontend) and Node.js + Express + TypeScript (backend).

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
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
├── frontend/                   # React SPA
│   └── src/
│       ├── App.tsx            # Main component, state management
│       ├── api.ts             # API client with auth token handling
│       ├── hooks/             # Custom React hooks
│       │   └── useFilteredGuests.ts  # Shared guest filtering logic
│       └── components/
│           ├── Toast.tsx      # Toast notification system
│           └── ...            # Other UI components
├── shared/                     # Shared TypeScript types and utilities
│   ├── types/                 # Guest, Family, Category interfaces
│   └── utils/                 # Color assignment, string utilities
└── data/                       # Persistent data directory
    ├── data.json              # Guest/family/category data
    └── sessions.json          # Persisted sessions
```

## Development Commands

### Quick Start
```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Start backend (port 5000)
npm run dev:backend

# Start frontend (port 3000)
npm run dev:frontend
```

### Docker
```bash
make build    # Build containers
make up       # Start services
make down     # Stop services
make backup   # Backup data/data.json
```

### Testing
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

## Environment Variables

Create `.env` in project root:
```bash
# Server
PORT=5000
NODE_ENV=development  # development | production | test

# Authentication (REQUIRED in production)
AUTH_USERNAME=username
AUTH_PASSWORD=password
AUTH_USERNAME_2=username2   # Optional second user
AUTH_PASSWORD_2=password2

# Session config (optional)
SESSION_DURATION_HOURS=24
SESSION_CLEANUP_HOURS=1

# CORS (optional, comma-separated for production)
CORS_ALLOWED_ORIGINS=https://example.com,https://app.example.com

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

### Guests (Protected)
- `GET /api/guests` - Get all guests (sorted by last name)
- `POST /api/guests` - Add guest (validated with Zod)
- `PUT /api/guests/:id` - Update guest
- `DELETE /api/guests/:id` - Delete guest
- `PUT /api/guests/:id/rsvp` - Update RSVP status

### Families (Protected)
- `GET /api/families` - Get all families
- `POST /api/families` - Create family with members
- `PUT /api/families/:id` - Update family
- `PUT /api/families/:id/members/reorder` - Reorder members
- `POST /api/families/:id/members` - Add guest to family
- `DELETE /api/families/:id/members/:guestId` - Remove guest from family
- `DELETE /api/families/:id` - Delete family

### Categories (Protected)
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Add category (auto-assigns color)
- `DELETE /api/categories/:name` - Delete category

### Data Management (Protected)
- `GET /api/data/export` - Export all data as JSON
- `POST /api/data/import` - Import data (validated with Zod)

## Architecture

### Backend Modules

- **config.ts**: Central configuration with environment validation. Fails fast in production if required vars are missing.

- **store.ts**: In-memory data store with async file persistence. Uses debounced writes and atomic file operations (temp file + rename).

- **sessionStore.ts**: Session management with persistence. Sessions survive server restarts.

- **validation.ts**: Zod schemas for all input validation including:
  - Input length limits
  - Basic XSS prevention (strips `<>` characters)
  - Referential integrity checks on import
  - Type coercion (e.g., `"true"` -> `true`)

- **apiResponse.ts**: Standardized response helpers (`sendSuccess`, `sendError`, `sendNotFound`, etc.)

### Frontend Patterns

- **Toast notifications**: Replace `alert()` with `useToast()` hook
- **Shared filtering**: `useFilteredGuests` hook eliminates duplicate logic
- **Loading states**: Per-button loading indicators for async operations
- **Scroll preservation**: Maintains scroll position after data updates

### Authentication Flow
1. Token-based auth with configurable session duration (default 24 hours)
2. Sessions persisted to `data/sessions.json` (survive restarts)
3. Tokens stored in localStorage on frontend
4. `Authorization: Bearer {token}` header on all protected routes
5. Constant-time credential comparison (prevents timing attacks)

### Data Persistence
- In-memory Maps for fast access
- Async JSON writes with debouncing (500ms)
- Atomic writes using temp file + rename
- Auto-loads from file on startup

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
- CSS files co-located with components
- Toast notifications for user feedback (no `alert()`)

## Known Limitations

- **Events feature**: The `/api/events` routes exist but events are NOT persisted. They're stored in memory only and lost on restart. This feature is incomplete.

- **No rate limiting**: Consider adding rate limiting for production.

- **Single-node only**: Session and data stores are local. For multi-node deployment, would need Redis/database.
