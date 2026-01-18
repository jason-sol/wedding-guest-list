import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { Event, PermissionLevel } from '../types';
import { useAuth } from './AuthContext';

// Event with permission info for the current user
export interface EventWithPermission extends Event {
  permission: PermissionLevel;
}

interface EventState {
  events: EventWithPermission[];
  currentEvent: EventWithPermission | null;
  loading: boolean;
  error: string | null;
}

interface EventContextValue extends EventState {
  setCurrentEvent: (eventId: string) => void;
  refreshEvents: () => Promise<void>;
  canEdit: boolean; // Can edit guests/families in current event
  canView: boolean; // Can view current event
  isBlocked: boolean; // Access denied to current event
}

const EventContext = createContext<EventContextValue | null>(null);

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('authToken');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export function EventProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [state, setState] = useState<EventState>({
    events: [],
    currentEvent: null,
    loading: false,
    error: null,
  });

  const fetchEvents = useCallback(async (): Promise<EventWithPermission[]> => {
    const response = await fetch(`${API_BASE}/events`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch events');
    }

    const result = await response.json();
    return result.data || result;
  }, []);

  const refreshEvents = useCallback(async () => {
    if (!isAuthenticated) {
      setState({ events: [], currentEvent: null, loading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const events = await fetchEvents();
      const sortedEvents = events.sort((a, b) => a.order - b.order);

      setState(prev => {
        // Keep current event if still valid, otherwise select first
        let currentEvent = prev.currentEvent;
        if (!currentEvent || !sortedEvents.find(e => e.id === currentEvent?.id)) {
          currentEvent = sortedEvents[0] || null;
        } else {
          // Update current event with fresh data
          currentEvent = sortedEvents.find(e => e.id === currentEvent?.id) || null;
        }

        return {
          events: sortedEvents,
          currentEvent,
          loading: false,
          error: null,
        };
      });
    } catch (error) {
      console.error('Failed to load events:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load events',
      }));
    }
  }, [isAuthenticated, fetchEvents]);

  const setCurrentEvent = useCallback((eventId: string) => {
    setState(prev => {
      const event = prev.events.find(e => e.id === eventId);
      return { ...prev, currentEvent: event || null };
    });
  }, []);

  // Load events when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshEvents();
    } else {
      setState({ events: [], currentEvent: null, loading: false, error: null });
    }
  }, [isAuthenticated, refreshEvents]);

  // Computed permission values
  const permissions = useMemo(() => {
    if (!state.currentEvent) {
      return { canEdit: false, canView: false, isBlocked: true };
    }

    // Owner has full access
    if (user?.isOwner) {
      return { canEdit: true, canView: true, isBlocked: false };
    }

    const permission = state.currentEvent.permission;

    return {
      canEdit: permission === 'admin',
      canView: permission === 'admin' || permission === 'viewer',
      isBlocked: permission === 'none',
    };
  }, [state.currentEvent, user?.isOwner]);

  const value: EventContextValue = {
    ...state,
    setCurrentEvent,
    refreshEvents,
    ...permissions,
  };

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
}

export function useEvents(): EventContextValue {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvents must be used within an EventProvider');
  }
  return context;
}
