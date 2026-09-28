import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Local variable fonts (no CDN dependency at runtime).
import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/jetbrains-mono';

import '@/styles/index.css';
import { App } from './App';

const container = document.getElementById('root');
if (!container) throw new Error('Root container is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
