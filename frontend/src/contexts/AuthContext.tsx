import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AuthUser } from '../types';

interface AuthState {
  isAuthenticated: boolean | null; // null = checking
  user: AuthUser | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const API_BASE = '/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: null,
    user: null,
    loading: true,
  });

  const checkAuth = useCallback(async (): Promise<boolean> => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setState({ isAuthenticated: false, user: null, loading: false });
      return false;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/check`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        localStorage.removeItem('authToken');
        setState({ isAuthenticated: false, user: null, loading: false });
        return false;
      }

      const result = await response.json();
      const data = result.data || result;

      setState({
        isAuthenticated: true,
        user: {
          username: data.username,
          userId: data.userId,
          isOwner: data.isOwner,
        },
        loading: false,
      });
      return true;
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('authToken');
      setState({ isAuthenticated: false, user: null, loading: false });
      return false;
    }
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Invalid username or password' }));
      throw new Error(error.error || 'Invalid username or password');
    }

    const result = await response.json();
    const data = result.data || result;

    if (data.token) {
      localStorage.setItem('authToken', data.token);
    }

    setState({
      isAuthenticated: true,
      user: {
        username: data.username,
        userId: data.userId,
        isOwner: data.isOwner,
      },
      loading: false,
    });
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    localStorage.removeItem('authToken');
    setState({ isAuthenticated: false, user: null, loading: false });
  }, []);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
