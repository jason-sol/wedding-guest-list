/**
 * Material UI Theme Configuration
 * Implements Material Design 3 styling with elegant blue/coral color scheme
 */

import { createTheme, ThemeOptions, PaletteMode } from '@mui/material/styles';

// Color palette
const primaryBlue = {
  main: '#3B82F6',
  light: '#60A5FA',
  dark: '#2563EB',
  contrastText: '#FFFFFF',
};

const secondaryCoral = {
  main: '#F97316',
  light: '#FB923C',
  dark: '#EA580C',
  contrastText: '#FFFFFF',
};

/**
 * Generate theme options for light or dark mode
 */
const getDesignTokens = (mode: PaletteMode): ThemeOptions => ({
  palette: {
    mode,
    primary: primaryBlue,
    secondary: secondaryCoral,
    success: {
      main: '#10B981',
      light: '#34D399',
      dark: '#059669',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#EF4444',
      light: '#F87171',
      dark: '#DC2626',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#F59E0B',
      light: '#FBBF24',
      dark: '#D97706',
      contrastText: '#FFFFFF',
    },
    info: {
      main: '#3B82F6',
      light: '#60A5FA',
      dark: '#2563EB',
      contrastText: '#FFFFFF',
    },
    background: {
      default: mode === 'light' ? '#F8FAFC' : '#0F172A',
      paper: mode === 'light' ? '#FFFFFF' : '#1E293B',
    },
    text: {
      primary: mode === 'light' ? '#1E293B' : '#F1F5F9',
      secondary: mode === 'light' ? '#64748B' : '#94A3B8',
    },
    divider: mode === 'light' ? '#E2E8F0' : '#334155',
  },

  // Material Design 3 - Expressive shapes
  shape: {
    borderRadius: 12,
  },

  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '1rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '0.875rem',
      fontWeight: 600,
    },
    button: {
      textTransform: 'none' as const,
      fontWeight: 500,
    },
  },

  // Component overrides for MD3 styling
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          padding: '8px 20px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          },
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${primaryBlue.main} 0%, ${primaryBlue.dark} 100%)`,
          '&:hover': {
            background: `linear-gradient(135deg, ${primaryBlue.light} 0%, ${primaryBlue.main} 100%)`,
          },
        },
        containedSecondary: {
          background: `linear-gradient(135deg, ${secondaryCoral.main} 0%, ${secondaryCoral.dark} 100%)`,
          '&:hover': {
            background: `linear-gradient(135deg, ${secondaryCoral.light} 0%, ${secondaryCoral.main} 100%)`,
          },
        },
        outlined: {
          borderWidth: 1.5,
          '&:hover': {
            borderWidth: 1.5,
          },
        },
      },
      defaultProps: {
        disableElevation: true,
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: mode === 'light'
            ? '0 2px 12px rgba(0,0,0,0.08)'
            : '0 2px 12px rgba(0,0,0,0.3)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
        elevation1: {
          boxShadow: mode === 'light'
            ? '0 1px 8px rgba(0,0,0,0.08)'
            : '0 1px 8px rgba(0,0,0,0.3)',
        },
        elevation2: {
          boxShadow: mode === 'light'
            ? '0 2px 12px rgba(0,0,0,0.1)'
            : '0 2px 12px rgba(0,0,0,0.35)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
        sizeSmall: {
          height: 24,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 24,
          boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          minWidth: 100,
          padding: '12px 20px',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: '3px 3px 0 0',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          '&:before': {
            display: 'none',
          },
          '&.Mui-expanded': {
            margin: '8px 0',
          },
          '&:first-of-type': {
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
          },
          '&:last-of-type': {
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
          },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          '&.Mui-expanded': {
            minHeight: 48,
          },
        },
        content: {
          '&.Mui-expanded': {
            margin: '12px 0',
          },
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
        standardSuccess: {
          backgroundColor: mode === 'light' ? '#ECFDF5' : '#064E3B',
        },
        standardError: {
          backgroundColor: mode === 'light' ? '#FEF2F2' : '#7F1D1D',
        },
        standardWarning: {
          backgroundColor: mode === 'light' ? '#FFFBEB' : '#78350F',
        },
        standardInfo: {
          backgroundColor: mode === 'light' ? '#EFF6FF' : '#1E3A5F',
        },
      },
    },
    MuiSnackbarContent: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          backgroundColor: mode === 'light' ? '#F1F5F9' : '#1E293B',
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 8px',
          padding: '8px 12px',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: mode === 'light'
            ? '0 1px 3px rgba(0,0,0,0.08)'
            : '0 1px 3px rgba(0,0,0,0.3)',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 8,
          fontSize: '0.75rem',
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
        },
      },
    },
  },
});

export const lightTheme = createTheme(getDesignTokens('light'));
export const darkTheme = createTheme(getDesignTokens('dark'));

export { getDesignTokens };
