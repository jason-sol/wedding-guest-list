# Wedding Guest List

A modern web application for managing wedding guest lists with support for multiple events, family groupings, categories, user management, and flexible filtering.

## Features

### Guest Management
- Add individual guests with first and last names
- Add families with multiple members at once
- Assign guests to color-coded categories/tags
- Search guests by name
- Filter guests by one or more categories
- Drag-and-drop reordering of family members
- Assign existing guests to families
- Remove guests from families

### Multi-Event Support
- Create multiple events (Ceremony, Reception, etc.)
- Manage separate guest lists per event
- Copy guests/families between events
- Track which guests are invited to which events
- Reconstruct family groupings from another event

### Category Management
- Create custom categories with auto-assigned colors
- Rename categories (updates all guest tags automatically)
- Delete categories
- Filter by multiple categories simultaneously

### User Management
- Multi-user authentication system
- Owner account with full permissions
- Create additional users with per-event permissions
- Permission levels: Admin (edit), Viewer (read-only), None (no access)

### Data Management
- Export all data as JSON backup
- Import data from JSON backup
- Persistent storage with automatic saving

### User Interface
- Modern Material UI design (Material Design 3)
- Light and dark mode with system preference detection
- Responsive design for mobile and desktop
- Toast notifications for user feedback

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Material UI v6
- **Backend**: Node.js, Express, TypeScript, Zod (validation)
- **Data Store**: JSON file persistence with in-memory caching
- **Deployment**: Docker, Nginx

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

1. Install backend dependencies:
```bash
cd backend
npm install
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Create a `.env` file in the project root:
```bash
# Required for production
AUTH_USERNAME=your_username
AUTH_PASSWORD=your_password

# Optional second user
AUTH_USERNAME_2=second_user
AUTH_PASSWORD_2=second_password

# Optional settings
NODE_ENV=development
PORT=5000
SESSION_DURATION_HOURS=24
```

### Running the Application

1. Start the backend server (from project root):
```bash
cd backend
npm run dev
```
The backend will run on http://localhost:5000

2. Start the frontend development server:
```bash
cd frontend
npm run dev
```
The frontend will run on http://localhost:5173

## Docker Deployment

### Using Docker Compose

1. Create a `.env` file with your credentials:
```bash
AUTH_USERNAME=your_username
AUTH_PASSWORD=your_password
```

2. Build and run:
```bash
docker compose up -d --build
```

The application will be available on port 70.

### ZimaOS / CasaOS Deployment

For ZimaBoard or CasaOS systems:

1. Create the data directory:
```bash
mkdir -p /DATA/AppData/wedding-guest-list/data
```

2. Create a `.env` file with credentials

3. Deploy using the ZimaOS compose file:
```bash
docker compose -f zimaos-compose.yaml up -d --build
```

## Project Structure

```
wedding-guest-list/
├── backend/                 # Node.js/Express backend
│   └── src/
│       ├── index.ts         # Server entry point
│       ├── config.ts        # Configuration management
│       ├── store.ts         # Data store with persistence
│       ├── validation.ts    # Zod schemas
│       ├── apiResponse.ts   # Standardized API responses
│       └── routes/          # API route handlers
├── frontend/                # React frontend
│   └── src/
│       ├── components/      # React components
│       ├── contexts/        # Auth and Event contexts
│       ├── hooks/           # Custom React hooks
│       ├── theme/           # MUI theme configuration
│       ├── App.tsx          # Main app component
│       └── api.ts           # API client
├── shared/                  # Shared TypeScript types
│   ├── types/
│   └── utils/
├── data/                    # Persistent data storage
├── docker-compose.yml       # Standard Docker deployment
├── zimaos-compose.yaml      # ZimaOS/CasaOS deployment
├── Dockerfile.backend       # Backend container
├── Dockerfile.frontend      # Frontend container
└── nginx.conf               # Nginx configuration
```

## API Endpoints

All API responses follow the format: `{ success: boolean, data?: T, error?: string }`

### Authentication
- `POST /api/auth/login` - Login with username/password
- `POST /api/auth/logout` - Logout
- `GET /api/auth/check` - Verify token validity

### Events
- `GET /api/events` - Get all events (with user permissions)
- `POST /api/events` - Create a new event
- `PUT /api/events/:id` - Update an event
- `DELETE /api/events/:id` - Delete an event
- `POST /api/events/:id/reconstruct-families` - Reconstruct families from another event

### Guests (Event-scoped)
- `GET /api/events/:eventId/guests` - Get all guests for an event
- `POST /api/events/:eventId/guests` - Add a guest
- `PUT /api/events/:eventId/guests/:id` - Update a guest
- `DELETE /api/events/:eventId/guests/:id` - Delete a guest
- `POST /api/events/:eventId/guests/:id/copy` - Copy guest to another event
- `GET /api/events/:eventId/guests/presence` - Get guest presence across events

### Families (Event-scoped)
- `GET /api/events/:eventId/families` - Get all families
- `POST /api/events/:eventId/families` - Create a family
- `PUT /api/events/:eventId/families/:id` - Update a family
- `DELETE /api/events/:eventId/families/:id` - Delete a family
- `POST /api/events/:eventId/families/:id/members` - Add guest to family
- `DELETE /api/events/:eventId/families/:id/members/:guestId` - Remove guest
- `PUT /api/events/:eventId/families/:id/members/reorder` - Reorder members
- `POST /api/events/:eventId/families/:id/copy` - Copy family to another event

### Categories (Global)
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create a category
- `PUT /api/categories/:name` - Rename a category
- `DELETE /api/categories/:name` - Delete a category

### Users (Owner only)
- `GET /api/users` - Get all users
- `POST /api/users` - Create a user
- `PUT /api/users/:id` - Update user password
- `DELETE /api/users/:id` - Delete a user

### Event Permissions (Owner only)
- `GET /api/events/:eventId/permissions` - Get event permissions
- `PUT /api/events/:eventId/permissions/:userId` - Set user permission

### Data Management (Owner only)
- `GET /api/data/export` - Export all data as JSON
- `POST /api/data/import` - Import data from JSON

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AUTH_USERNAME` | Yes (prod) | `dev` | Primary user username |
| `AUTH_PASSWORD` | Yes (prod) | `dev` | Primary user password |
| `AUTH_USERNAME_2` | No | - | Secondary user username |
| `AUTH_PASSWORD_2` | No | - | Secondary user password |
| `NODE_ENV` | No | `development` | Environment mode |
| `PORT` | No | `5000` | Backend server port |
| `SESSION_DURATION_HOURS` | No | `24` | Session expiry time |
| `DATA_FILE_PATH` | No | `../data/data.json` | Data file location |

## Development

### Building for Production

Backend:
```bash
cd backend
npm run build
```

Frontend:
```bash
cd frontend
npm run build
```

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

## License

MIT
