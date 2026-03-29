import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { initSyncEngine } from './sync/engine';

// Register the service worker for offline caching
registerSW({ immediate: true });

// Boot the background sync engine — starts immediately if online
initSyncEngine();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
