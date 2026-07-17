import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Clear chunk reload failed flag once the app is loaded/reloaded successfully
try {
  sessionStorage.removeItem('chunk-reload-failed');
} catch (e) {
  console.error('Failed to clear session storage:', e);
}

// Set initial theme before first render to avoid flash
const stored = localStorage.getItem('docvault-app-store');
if (stored) {
  try {
    const parsed = JSON.parse(stored);
    const theme = parsed?.state?.theme || 'dark';
    if (theme === 'system') {
      document.documentElement.classList.add(
        window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      );
    } else {
      document.documentElement.classList.add(theme);
    }
    const accent = parsed?.state?.accentColor || 'blue';
    document.documentElement.setAttribute('data-accent', accent);
  } catch {
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-accent', 'blue');
  }
} else {
  document.documentElement.classList.add('dark');
  document.documentElement.setAttribute('data-accent', 'blue');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
