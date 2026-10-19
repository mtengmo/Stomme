import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initInstall } from './lib/install';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/800.css';
import './styles/index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root is missing from index.html');
}

// Capture beforeinstallprompt before any component mounts (M6.3).
initInstall();

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
