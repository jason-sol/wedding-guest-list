"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load .env file before any other imports that might use config
// Try multiple locations for flexibility in different run contexts
const envPaths = [
    path_1.default.resolve(process.cwd(), '../.env'), // Project root from backend/
    path_1.default.resolve(process.cwd(), '.env'), // Current directory
    path_1.default.resolve(__dirname, '../../.env'), // Relative to compiled output
];
for (const envPath of envPaths) {
    const result = dotenv_1.default.config({ path: envPath });
    if (!result.error)
        break;
}
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config");
const sessionStore_1 = require("./sessionStore");
const store_1 = require("./store");
const guests_1 = __importDefault(require("./routes/guests"));
const families_1 = __importDefault(require("./routes/families"));
const categories_1 = __importDefault(require("./routes/categories"));
const events_1 = __importDefault(require("./routes/events"));
const users_1 = __importDefault(require("./routes/users"));
const auth_1 = __importDefault(require("./routes/auth"));
const data_1 = __importDefault(require("./routes/data"));
const auth_2 = require("./middleware/auth");
const permissions_1 = require("./middleware/permissions");
// Initialize and validate config early - will throw if required vars are missing
const config = (0, config_1.getConfig)();
const app = (0, express_1.default)();
// Configure CORS based on environment
const corsOptions = config.isDevelopment
    ? {} // Allow all origins in development
    : {
        origin: (origin, callback) => {
            // Allow requests with no origin (mobile apps, curl, etc.)
            if (!origin) {
                callback(null, true);
                return;
            }
            if (config.cors.allowedOrigins.includes(origin)) {
                callback(null, true);
            }
            else {
                callback(new Error(`Origin ${origin} not allowed by CORS`));
            }
        },
        credentials: true,
    };
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json({ limit: '10mb' })); // Add reasonable limit for import
// Public routes
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
// Auth routes (public)
app.use('/api/auth', auth_1.default);
// Protected routes (require authentication)
// Events routes - includes permission-based sub-routes
app.use('/api/events', auth_2.authMiddleware, events_1.default);
// Event-scoped guest and family routes
// These are mounted under /api/events/:eventId and use mergeParams
app.use('/api/events/:eventId/guests', auth_2.authMiddleware, guests_1.default);
app.use('/api/events/:eventId/families', auth_2.authMiddleware, families_1.default);
// User management routes (owner only)
app.use('/api/users', auth_2.authMiddleware, permissions_1.requireOwner, users_1.default);
// Global routes (categories, data import/export)
app.use('/api/categories', auth_2.authMiddleware, categories_1.default);
app.use('/api/data', auth_2.authMiddleware, data_1.default);
// Async startup to initialize stores
async function startServer() {
    try {
        // Initialize data store (loads persisted data)
        await store_1.store.ensureInitialized();
        // Initialize session store (loads persisted sessions)
        const sessionStore = (0, sessionStore_1.getSessionStore)();
        await sessionStore.initialize();
        const server = app.listen(config.port, () => {
            console.log(`Server running on http://localhost:${config.port} [${config.env}]`);
        });
        // Graceful shutdown handler
        const shutdown = async (signal) => {
            console.log(`\n${signal} received, shutting down gracefully...`);
            // Stop accepting new connections
            server.close(async () => {
                console.log('HTTP server closed');
                // Save data and sessions before exit
                await Promise.all([
                    store_1.store.flush().then(() => console.log('Data saved')),
                    sessionStore.shutdown().then(() => console.log('Sessions saved')),
                ]);
                process.exit(0);
            });
            // Force exit after 10 seconds
            setTimeout(() => {
                console.error('Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
