/**
 * Scroll to top button using MUI Fab
 * Shows when user scrolls down, smoothly animates with Zoom transition
 */

import { useState, useEffect } from 'react';
import { Fab, Zoom, useTheme } from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <Zoom in={isVisible}>
      <Fab
        color="primary"
        size="medium"
        onClick={scrollToTop}
        aria-label="Scroll to top"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1000,
          boxShadow: theme.shadows[8],
          '&:hover': {
            boxShadow: theme.shadows[12],
            transform: 'scale(1.05)',
          },
          transition: 'all 0.2s ease-in-out',
        }}
      >
        <KeyboardArrowUpIcon />
      </Fab>
    </Zoom>
  );
}
