"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const guests_1 = __importDefault(require("./routes/guests"));
const families_1 = __importDefault(require("./routes/families"));
const categories_1 = __importDefault(require("./routes/categories"));
const rsvp_1 = __importDefault(require("./routes/rsvp"));
const events_1 = __importDefault(require("./routes/events"));
const auth_1 = __importDefault(require("./routes/auth"));
const auth_2 = require("./middleware/auth");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Public routes
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
// Auth routes (public)
app.use('/api/auth', auth_1.default);
// Protected routes (require authentication)
app.use('/api/guests', auth_2.authMiddleware, guests_1.default);
app.use('/api/families', auth_2.authMiddleware, families_1.default);
app.use('/api/categories', auth_2.authMiddleware, categories_1.default);
app.use('/api', auth_2.authMiddleware, rsvp_1.default);
app.use('/api/events', auth_2.authMiddleware, events_1.default);
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
