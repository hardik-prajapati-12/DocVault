/**
 * Custom hook to manage theme (dark/light/system) and apply it to the DOM.
 */

import { useEffect } from 'react';
import { useAppStore } from '@/store/app-store';

export function useTheme() {
  const theme = useAppStore((s) => s.theme);
  const accentColor = useAppStore((s) => s.accentColor);

  useEffect(() => {
    const root = document.documentElement;

    // Determine effective theme
    let effectiveTheme: 'dark' | 'light';
    if (theme === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    } else {
      effectiveTheme = theme;
    }

    root.classList.remove('dark', 'light');
    root.classList.add(effectiveTheme);
    root.setAttribute('data-accent', accentColor);

    // Update meta theme-color
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', effectiveTheme === 'dark' ? '#0a0e1a' : '#f8fafc');
    }

    // Listen for system theme changes
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        root.classList.remove('dark', 'light');
        root.classList.add(e.matches ? 'dark' : 'light');
      };
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [theme, accentColor]);
}
