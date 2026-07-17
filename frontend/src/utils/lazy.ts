import React from 'react';

/**
 * A wrapper around React.lazy that automatically retries the dynamic import
 * if it fails due to chunk loading/network errors (usually from new deployments).
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.error('Dynamic import failed, attempting reload:', error);

      // Check if this error is likely a chunk loading error
      const isChunkError =
        error instanceof Error &&
        (error.message.includes('Failed to fetch dynamically imported module') ||
         error.message.includes('Importing a module script failed') ||
         error.message.includes('chunk') ||
         error.message.includes('dynamic'));

      if (isChunkError) {
        // Prevent infinite reload loops by checking sessionStorage
        const hasReloaded = sessionStorage.getItem('chunk-reload-failed');
        if (!hasReloaded) {
          sessionStorage.setItem('chunk-reload-failed', 'true');
          window.location.reload();
          // Return a dummy promise to keep React from crashing before reload completes
          return new Promise<{ default: T }>(() => {});
        }
      }
      throw error;
    }
  });
}
