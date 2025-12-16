"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const guests_1 = __importDefault(require("./routes/guests"));
const families_1 = __importDefault(require("./routes/families"));
const rsvp_1 = __importDefault(require("./routes/rsvp"));
const events_1 = __importDefault(require("./routes/events"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/guests', guests_1.default);
app.use('/api/families', families_1.default);
app.use('/api', rsvp_1.default);
app.use('/api/events', events_1.default);
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
