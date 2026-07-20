import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  // Suppress benign Vite HMR websocket connection errors & unhandled rejections from polluting UI badges
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const reasonStr = reason ? String(reason.message || reason) : '';
    if (
      reasonStr.toLowerCase().includes('websocket') || 
      reasonStr.toLowerCase().includes('vite') ||
      reasonStr.toLowerCase().includes('webchannelconnection')
    ) {
      event.preventDefault();
      event.stopPropagation();
      console.log('[EcoTrack Debug - Suppressed benign HMR/Websocket error]:', reasonStr);
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (
      msg.toLowerCase().includes('websocket') || 
      msg.toLowerCase().includes('vite') ||
      msg.toLowerCase().includes('webchannelconnection')
    ) {
      event.preventDefault();
      event.stopPropagation();
      console.log('[EcoTrack Debug - Suppressed benign HMR/Websocket error]:', msg);
    }
  });

  // Intercept console.warn / console.error to silence verbose Firestore WebChannel connection retries
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const firstArg = args[0] ? String(args[0]) : '';
    if (
      firstArg.includes('@firebase/firestore') && 
      (firstArg.includes('WebChannelConnection') || firstArg.includes('Listen') || firstArg.includes('transport errored'))
    ) {
      // Silently log to prevent orange warning badge in Dev Console
      return;
    }
    originalWarn.apply(console, args);
  };
}

import {AuthProvider} from './contexts/AuthContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);

