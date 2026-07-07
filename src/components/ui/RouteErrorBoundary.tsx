import React from 'react';
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { AlertTriangle, RotateCcw, Home, ArrowLeft } from 'lucide-react';
import { Button } from './Button';

export const RouteErrorBoundary: React.FC = () => {
  const error = useRouteError();
  const navigate = useNavigate();

  console.error('Route boundary caught error:', error);

  // Check for chunk loading / dynamic import errors and try reloading the page automatically once.
  const isChunkError = React.useMemo(() => {
    if (!error) return false;
    const msg = error instanceof Error ? error.message : String(error);
    return (
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Importing a module script failed') ||
      msg.includes('chunk') ||
      msg.includes('dynamic')
    );
  }, [error]);

  React.useEffect(() => {
    if (isChunkError) {
      const hasReloaded = sessionStorage.getItem('chunk-reload-failed');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk-reload-failed', 'true');
        window.location.reload();
      }
    }
  }, [isChunkError]);

  if (isChunkError) {
    // Show a loading/reload state since reload is in progress
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[var(--text-secondary)]">Updating application to the latest version...</p>
      </div>
    );
  }

  // Handle standard 404 or other route error responses
  const is404 = isRouteErrorResponse(error) && error.status === 404;
  const title = is404 ? 'Page Not Found' : 'Application Error';
  const description = is404
    ? "The page you are looking for doesn't exist or has been moved."
    : 'An unexpected error occurred while rendering this page.';

  const errorMessage = error instanceof Error
    ? error.message
    : isRouteErrorResponse(error)
      ? `${error.status} ${error.statusText}`
      : String(error);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6 text-center">
      <div className="glass-card max-w-md w-full p-8 rounded-2xl border border-[var(--border-color)] space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto text-red-500">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">{title}</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-2">{description}</p>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-left">
            <p className="text-xs font-mono text-red-400 break-all overflow-x-auto max-h-32">
              {errorMessage}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1 text-sm cursor-pointer justify-center"
            onClick={() => navigate(-1)}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Go Back
          </Button>
          <Button
            variant="primary"
            className="flex-1 text-sm cursor-pointer justify-center"
            onClick={() => navigate('/')}
            icon={<Home className="w-4 h-4 text-[var(--text-inverse)]" />}
          >
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
};
