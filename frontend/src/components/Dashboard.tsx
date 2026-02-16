/**
 * Dashboard component with charts and summary statistics.
 * Full-screen dialog with RSVP breakdown, category distribution,
 * event comparison, invitation progress, and age group breakdown.
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Paper,
  Grid,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import MailIcon from '@mui/icons-material/Mail';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Guest, CategoryInfo, Event, PermissionLevel } from '../types';
import { fetchGuests } from '../api';

interface EventWithPermission extends Event {
  permission: PermissionLevel;
}

interface DashboardProps {
  guests: Guest[];
  categories: CategoryInfo[];
  events: EventWithPermission[];
  currentEventId: string;
  onClose: () => void;
}

const RSVP_COLORS = {
  accepted: '#4caf50',
  pending: '#ff9800',
  declined: '#f44336',
};

const INVITATION_COLORS = {
  sent: '#2196f3',
  notSent: '#9e9e9e',
};

const AGE_COLORS = {
  adults: '#7c4dff',
  children: '#00bcd4',
};

export default function Dashboard({
  guests,
  categories,
  events,
  currentEventId,
  onClose,
}: DashboardProps) {
  const [eventGuestsMap, setEventGuestsMap] = useState<Record<string, Guest[]>>({});
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Fetch guests for all accessible events on mount
  useEffect(() => {
    const loadAllEventGuests = async () => {
      setLoadingEvents(true);
      const results: Record<string, Guest[]> = {};
      results[currentEventId] = guests;

      const otherEvents = events.filter(e => e.id !== currentEventId && e.permission !== 'none');
      const promises = otherEvents.map(async (event) => {
        try {
          const eventGuests = await fetchGuests(event.id);
          results[event.id] = eventGuests;
        } catch {
          results[event.id] = [];
        }
      });

      await Promise.all(promises);
      setEventGuestsMap(results);
      setLoadingEvents(false);
    };

    loadAllEventGuests();
  }, [currentEventId, events, guests]);

  // Summary stats for current event
  const stats = useMemo(() => {
    const total = guests.length;
    let attending = 0, pending = 0, declined = 0, sent = 0, notSent = 0, adults = 0, children = 0;
    for (const g of guests) {
      if (g.rsvp === 'accepted') attending++;
      else if (g.rsvp === 'declined') declined++;
      else pending++;
      if (g.invitationSent) sent++;
      else notSent++;
      if (g.ageGroup === 'child') children++;
      else adults++;
    }
    return { total, attending, pending, declined, sent, notSent, adults, children };
  }, [guests]);

  // RSVP Pie chart data
  const rsvpData = useMemo(() => [
    { name: 'Attending', value: stats.attending, color: RSVP_COLORS.accepted },
    { name: 'Pending', value: stats.pending, color: RSVP_COLORS.pending },
    { name: 'Declined', value: stats.declined, color: RSVP_COLORS.declined },
  ].filter(d => d.value > 0), [stats]);

  // Category distribution data
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const g of guests) {
      for (const tag of g.tags) {
        counts[tag] = (counts[tag] || 0) + 1;
      }
    }
    return categories
      .filter(c => counts[c.name])
      .map(c => ({
        name: c.name,
        count: counts[c.name] || 0,
        color: c.color,
      }))
      .sort((a, b) => b.count - a.count);
  }, [guests, categories]);

  // Event comparison data
  const eventComparisonData = useMemo(() => {
    return events
      .filter(e => e.permission !== 'none')
      .map(event => {
        const eventGuests = eventGuestsMap[event.id] || [];
        let accepted = 0, pending = 0, declined = 0;
        for (const g of eventGuests) {
          if (g.rsvp === 'accepted') accepted++;
          else if (g.rsvp === 'declined') declined++;
          else pending++;
        }
        return {
          name: event.name,
          total: eventGuests.length,
          accepted,
          pending,
          declined,
        };
      });
  }, [events, eventGuestsMap]);

  // Invitation progress pie
  const invitationData = useMemo(() => [
    { name: 'Sent', value: stats.sent, color: INVITATION_COLORS.sent },
    { name: 'Not Sent', value: stats.notSent, color: INVITATION_COLORS.notSent },
  ].filter(d => d.value > 0), [stats]);

  // Age group pie
  const ageData = useMemo(() => [
    { name: 'Adults', value: stats.adults, color: AGE_COLORS.adults },
    { name: 'Children', value: stats.children, color: AGE_COLORS.children },
  ].filter(d => d.value > 0), [stats]);

  const summaryCards = [
    { label: 'Total Guests', value: stats.total, icon: <PeopleIcon />, color: '#1976d2' },
    { label: 'Attending', value: stats.attending, icon: <EventAvailableIcon />, color: RSVP_COLORS.accepted },
    { label: 'Pending', value: stats.pending, icon: <HelpOutlineIcon />, color: RSVP_COLORS.pending },
    { label: 'Declined', value: stats.declined, icon: <EventBusyIcon />, color: RSVP_COLORS.declined },
    { label: 'Invitations Sent', value: stats.sent, icon: <MailIcon />, color: INVITATION_COLORS.sent },
    { label: 'Not Sent', value: stats.notSent, icon: <MailOutlineIcon />, color: INVITATION_COLORS.notSent },
  ];

  return (
    <Dialog open fullScreen onClose={onClose}>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={onClose}>
            <CloseIcon />
          </IconButton>
          <DashboardIcon sx={{ mr: 1 }} />
          <Typography variant="h6" fontWeight={600} sx={{ flexGrow: 1 }}>
            Dashboard
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3, overflow: 'auto', bgcolor: 'background.default', flex: 1 }}>
        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {summaryCards.map((card) => (
            <Grid key={card.label} size={{ xs: 6, sm: 4, md: 2 }}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Box sx={{ color: card.color, mb: 0.5 }}>{card.icon}</Box>
                <Typography variant="h4" fontWeight={700}>{card.value}</Typography>
                <Typography variant="body2" color="text.secondary">{card.label}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Charts Grid */}
        <Grid container spacing={3}>
          {/* RSVP Breakdown */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>RSVP Breakdown</Typography>
              {rsvpData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={rsvpData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {rsvpData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Typography color="text.secondary" sx={{ py: 8, textAlign: 'center' }}>No data</Typography>
              )}
            </Paper>
          </Grid>

          {/* Category Distribution */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>Category Distribution</Typography>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryData} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Guests">
                      {categoryData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Typography color="text.secondary" sx={{ py: 8, textAlign: 'center' }}>No categories</Typography>
              )}
            </Paper>
          </Grid>

          {/* Event Comparison */}
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>Event Comparison</Typography>
              {loadingEvents ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress />
                </Box>
              ) : eventComparisonData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={eventComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" name="Total" fill="#1976d2" />
                    <Bar dataKey="accepted" name="Accepted" fill={RSVP_COLORS.accepted} />
                    <Bar dataKey="pending" name="Pending" fill={RSVP_COLORS.pending} />
                    <Bar dataKey="declined" name="Declined" fill={RSVP_COLORS.declined} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Typography color="text.secondary" sx={{ py: 8, textAlign: 'center' }}>No events</Typography>
              )}
            </Paper>
          </Grid>

          {/* Invitation Progress */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>Invitation Progress</Typography>
              {invitationData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={invitationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {invitationData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Typography color="text.secondary" sx={{ py: 8, textAlign: 'center' }}>No data</Typography>
              )}
            </Paper>
          </Grid>

          {/* Age Group Breakdown */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>Age Group Breakdown</Typography>
              {ageData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={ageData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {ageData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Typography color="text.secondary" sx={{ py: 8, textAlign: 'center' }}>No data</Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Dialog>
  );
}
