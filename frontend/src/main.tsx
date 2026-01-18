import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ThemeProvider } from './theme/ThemeContext.tsx'
import { ToastProvider } from './components/Toast.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { EventProvider } from './contexts/EventContext.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <EventProvider>
            <App />
          </EventProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
