import JSZip from 'jszip';
if (typeof window !== 'undefined') {
  (window as any).JSZip = JSZip;

  // Clear stale service workers from previous version
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then((success) => {
          if (success) {
            console.log('Unregistered stale service worker');
            window.location.reload();
          }
        });
      }
    });
  }

  // Clear Cache Storage to prevent caching of old HTML/JS bundles
  if ('caches' in window) {
    caches.keys().then((keys) => {
      keys.forEach((key) => {
        caches.delete(key);
      });
    });
  }
}

// Global fetch interceptor: auto-attach JWT token and handle 401 redirects
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
    const isApiCall = url.startsWith('/api/') || url.includes('/api/');
    const isAuthRoute = url.includes('/api/auth/');

    if (isApiCall && !isAuthRoute) {
      const token = localStorage.getItem('docvault-auth-token');
      if (token) {
        init = init || {};
        const headers = new Headers(init.headers || {});
        headers.set('Authorization', `Bearer ${token}`);
        init.headers = headers;
      }
    }

    const response = await originalFetch.call(window, input, init);

    // Auto-redirect to login on 401 (expired/invalid token)
    if (response.status === 401 && isApiCall && !isAuthRoute) {
      const isFileEndpoint = url.includes('/file');
      if (isFileEndpoint) {
        try {
          const clone = response.clone();
          const data = await clone.json();
          if (data?.error === 'Invalid token.' || data?.error === 'Access denied. No token provided.') {
            localStorage.removeItem('docvault-auth-token');
            localStorage.removeItem('docvault-auth-user');
            if (!window.location.pathname.startsWith('/login')) {
              window.location.href = '/login';
            }
          }
        } catch {
          // If response body is not JSON or cannot be read, do not nuke auth token for file stream requests
        }
      } else {
        localStorage.removeItem('docvault-auth-token');
        localStorage.removeItem('docvault-auth-user');
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    }

    return response;
  };
}

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
