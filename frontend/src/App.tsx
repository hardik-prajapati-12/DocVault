import React from 'react';
import { Toaster } from 'react-hot-toast';
import { AppRouter } from '@/router';
import { FileUploader, DownloadDialog, RenameDialog } from '@/components/files';
import { PreviewPanel } from '@/components/preview';
import { SettingsPanel } from '@/components/settings';
import { useTheme, useKeyboardShortcuts } from '@/hooks';
import { useAppStore } from '@/store/app-store';

import { ErrorBoundary, ConfirmDialog } from '@/components/ui';
import { useConfirmStore } from '@/store/confirm-store';

const App: React.FC = () => {
  useTheme();
  useKeyboardShortcuts();
  const confirm = useConfirmStore();

  React.useEffect(() => {
    useAppStore.getState().fetchData().catch(console.error);

    const { syncProvider, autoSync } = useAppStore.getState();
    if (syncProvider !== 'none' && autoSync) {
      import('@/services/sync/sync-service').then(({ SyncService }) => {
        new SyncService().sync().catch(console.error);
      });
    }
  }, []);

  return (
    <ErrorBoundary>
      <AppRouter />

      {/* Global Modals */}
      <FileUploader />
      <DownloadDialog />
      <RenameDialog />
      <PreviewPanel />
      <SettingsPanel />

      {/* Global Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirm.isOpen}
        onClose={confirm.closeConfirm}
        onConfirm={() => {
          if (confirm.onConfirmCallback) {
            confirm.onConfirmCallback();
          }
          confirm.closeConfirm();
        }}
        title={confirm.title}
        message={confirm.message}
        confirmText={confirm.confirmText}
        variant={confirm.variant}
      />

      {/* Toast Notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--bg-glass-strong)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            backdropFilter: 'blur(16px)',
            borderRadius: '12px',
            fontSize: '14px',
            fontFamily: 'var(--font-sans)',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: 'white' },
          },
          error: {
            iconTheme: { primary: '#f43f5e', secondary: 'white' },
          },
        }}
      />
    </ErrorBoundary>
  );
};

export default App;
