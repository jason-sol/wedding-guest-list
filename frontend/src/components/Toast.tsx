/**
 * Toast notification system using MUI Snackbar
 * Provides context-based toast notifications with success, error, warning, and info types
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Snackbar, Alert, AlertColor, Slide, SlideProps, IconButton } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

// Slide transition from right
function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="left" />;
}

// Map toast type to MUI Alert severity
const typeToSeverity: Record<ToastType, AlertColor> = {
  success: 'success',
  error: 'error',
  warning: 'warning',
  info: 'info',
};

// Custom icons for each type
const iconMapping = {
  success: <CheckCircleIcon fontSize="inherit" />,
  error: <ErrorIcon fontSize="inherit" />,
  warning: <WarningIcon fontSize="inherit" />,
  info: <InfoIcon fontSize="inherit" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const showSuccess = useCallback((message: string) => showToast(message, 'success'), [showToast]);
  const showError = useCallback((message: string) => showToast(message, 'error'), [showToast]);
  const showWarning = useCallback((message: string) => showToast(message, 'warning'), [showToast]);
  const showInfo = useCallback((message: string) => showToast(message, 'info'), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
      {children}
      {toasts.map((toast, index) => (
        <Snackbar
          key={toast.id}
          open
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          TransitionComponent={SlideTransition}
          sx={{
            top: `${24 + index * 64}px !important`,
            zIndex: 10000,
          }}
        >
          <Alert
            severity={typeToSeverity[toast.type]}
            variant="filled"
            iconMapping={iconMapping}
            action={
              <IconButton
                size="small"
                color="inherit"
                onClick={() => removeToast(toast.id)}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            }
            sx={{
              minWidth: 280,
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              '& .MuiAlert-icon': {
                fontSize: '1.25rem',
              },
              '& .MuiAlert-message': {
                fontSize: '0.875rem',
                fontWeight: 500,
              },
            }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      ))}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
