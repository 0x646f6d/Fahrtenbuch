import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import { App } from './App';
import { initTracking } from './gps/service';
import { initRoute } from './route/active';

void navigator.storage?.persist?.();
void initTracking();
void initRoute();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
