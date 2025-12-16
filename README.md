# Wedding Guest List Website

A web application for managing wedding guest lists with support for individual guests, family groupings, categories, and flexible sorting.

## Features

- Add individual guests with first and last names
- Add families with multiple members at once
- Assign guests to categories/tags (Bridal Party, Bride Family, Groom Family, etc.)
- Sort guests by first name, last name, or category
- View guests as individuals or grouped by family
- Quick add/remove operations
- Remove guests with confirmation
- Assign existing guests to families
- Remove guests from families

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Data Store**: In-memory (can be replaced with database later)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

1. Install root dependencies (if any):
```bash
npm install
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

### Running the Application

1. Start the backend server (from project root):
```bash
npm run dev:backend
```
The backend will run on http://localhost:4000

2. Start the frontend development server (from project root):
```bash
npm run dev:frontend
```
The frontend will run on http://localhost:3000

### Building for Production

1. Build backend:
```bash
npm run build:backend
```

2. Build frontend:
```bash
npm run build:frontend
```

## Project Structure

```
wedding-guest-list-website/
├── backend/           # Node.js/Express backend
│   ├── src/
│   │   ├── index.ts   # Server entry point
│   │   ├── store.ts   # Data store
│   │   └── routes/    # API routes
├── frontend/          # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── App.tsx      # Main app component
│   │   └── api.ts       # API client
├── shared/            # Shared TypeScript types
│   └── types/
└── openspec/          # OpenSpec specifications
```

## API Endpoints

### Guests
- `GET /api/guests?sortBy={firstName|lastName|category}` - Get all guests
- `GET /api/guests/:id` - Get a specific guest
- `POST /api/guests` - Add a new guest
- `PUT /api/guests/:id` - Update a guest
- `DELETE /api/guests/:id` - Delete a guest

### Families
- `GET /api/families` - Get all families
- `GET /api/families/:id` - Get a specific family
- `POST /api/families` - Create a new family
- `PUT /api/families/:id` - Update a family
- `POST /api/families/:id/members` - Add a guest to a family
- `DELETE /api/families/:id/members/:guestId` - Remove a guest from a family
- `DELETE /api/families/:id` - Delete a family

## Development

The project follows Test-Driven Development (TDD) principles. Write tests before implementing features.

### Running Tests

Backend tests:
```bash
cd backend
npm test
```

Frontend tests:
```bash
cd frontend
npm test
```

## Future Enhancements

- [ ] Replace in-memory store with persistent database
- [ ] Add RSVP tracking functionality
- [ ] Add event management (ceremony, reception, etc.)
