/**
 * Theme Context Provider
 * Provides light/dark mode toggle with system preference detection and localStorage persistence
 */

import { createContext, useContext, useState, useMemo, ReactNode, useEffect } from 'react';
import { ThemeProvider as MUIThemeProvider, CssBaseline, PaletteMode } from '@mui/material';
import { lightTheme, darkTheme } from './theme';

interface ThemeContextValue {
  mode: PaletteMode;
  toggleTheme: () => void;
  setMode: (mode: PaletteMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setMode] = useState<PaletteMode>(() => {
    // Check localStorage first
    const saved = localStorage.getItem('themeMode');
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    // Fall back to system preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  // Persist theme preference to localStorage
  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      // Only update if user hasn't explicitly set a preference
      const saved = localStorage.getItem('themeMode');
      if (!saved) {
        setMode(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const theme = useMemo(() => (mode === 'light' ? lightTheme : darkTheme), [mode]);

  const contextValue = useMemo(
    () => ({ mode, toggleTheme, setMode }),
    [mode]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme mode and toggle function
 */
export function useThemeMode(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within a ThemeProvider');
  }
  return context;
}
