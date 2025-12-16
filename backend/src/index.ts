import express from 'express';
import cors from 'cors';
import guestsRouter from './routes/guests';
import familiesRouter from './routes/families';
import rsvpRouter from './routes/rsvp';
import eventsRouter from './routes/events';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/guests', guestsRouter);
app.use('/api/families', familiesRouter);
app.use('/api', rsvpRouter);
app.use('/api/events', eventsRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
