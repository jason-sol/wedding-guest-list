import { ThemeProvider, createTheme } from '@mui/material';
import { ReactNode } from 'react';

const theme = createTheme();

export function TestWrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
