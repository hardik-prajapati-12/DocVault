import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in DocVault:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.clear();
      // Try deleting IndexedDB
      const req = indexedDB.deleteDatabase('DocVaultDB');
      req.onsuccess = () => {
        window.location.reload();
      };
      req.onerror = () => {
        window.location.reload();
      };
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6 text-center">
          <div className="glass-card max-w-md p-8 rounded-2xl border border-[var(--border-color)] space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto text-red-500">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Application Error</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-2">
                DocVault encountered a critical initialization error. This is usually caused by database version conflicts in your browser.
              </p>
            </div>

            {this.state.error && (
              <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-left">
                <p className="text-xs font-mono text-red-400 break-all overflow-x-auto max-h-32">
                  {this.state.error.name}: {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1 text-sm cursor-pointer"
                onClick={() => window.location.reload()}
                icon={<RotateCcw className="w-4 h-4" />}
              >
                Reload Page
              </Button>
              <Button
                variant="danger"
                className="flex-1 text-sm cursor-pointer"
                onClick={this.handleReset}
                icon={<Trash2 className="w-4 h-4" />}
              >
                Reset Database
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
