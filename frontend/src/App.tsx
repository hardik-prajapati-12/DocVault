import React from 'react';
import { Toaster } from 'react-hot-toast';
import { AppRouter } from '@/router';
import { FileUploader, DownloadDialog, RenameDialog, MoveToFolderDialog } from '@/components/files';
import { PreviewPanel } from '@/components/preview';
import { SettingsPanel } from '@/components/settings';
import { useTheme, useKeyboardShortcuts, useOnlineStatus } from '@/hooks';
import { useAppStore } from '@/store/app-store';
import { WifiOff, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

import { ErrorBoundary, ConfirmDialog } from '@/components/ui';
import { useConfirmStore } from '@/store/confirm-store';

/**
 * Full-screen offline error page shown when there is no internet connection.
 */
const OfflineScreen: React.FC = () => {
  const [isRetrying, setIsRetrying] = React.useState(false);

  const handleRetry = () => {
    setIsRetrying(true);
    // Give the browser a moment to detect connectivity
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0a0e1a] overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a]" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center text-center px-6 max-w-md"
      >
        {/* Icon container with glow effect */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
          className="relative mb-8"
        >
          <div className="absolute inset-0 w-28 h-28 bg-red-500/10 rounded-full blur-xl" />
          <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-red-500/20 to-rose-500/10 border border-red-500/20 flex items-center justify-center backdrop-blur-sm">
            <WifiOff className="w-12 h-12 text-red-400" strokeWidth={1.5} />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-3xl font-bold text-white mb-3 tracking-tight"
        >
          No Internet Connection
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-[15px] text-slate-400 mb-8 leading-relaxed"
        >
          DocVault requires an active internet connection to access your documents and manage files. Please check your network settings and try again.
        </motion.p>

        {/* Retry Button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          onClick={handleRetry}
          disabled={isRetrying}
          className="group flex items-center gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-semibold text-white
            bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500
            shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30
            transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
            disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          {isRetrying ? 'Reconnecting...' : 'Try Again'}
        </motion.button>

        {/* Subtle hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="text-xs text-slate-600 mt-6"
        >
          The page will automatically reconnect when your network is restored.
        </motion.p>
      </motion.div>
    </div>
  );
};

const App: React.FC = () => {
  useTheme();
  useKeyboardShortcuts();
  const isOnline = useOnlineStatus();
  const confirm = useConfirmStore();

  React.useEffect(() => {
    if (!isOnline) return;

    const token = localStorage.getItem('docvault-auth-token');
    if (token) {
      useAppStore.getState().fetchData().catch(console.error);

      const { syncProvider, autoSync } = useAppStore.getState();
      if (syncProvider !== 'none' && autoSync) {
        import('@/services/sync/sync-service').then(({ SyncService }) => {
          new SyncService().sync().catch(console.error);
        });
      }
    }
  }, [isOnline]);

  // Show offline error screen when there is no internet connection
  if (!isOnline) {
    return <OfflineScreen />;
  }

  return (
    <ErrorBoundary>
      <AppRouter />

      {/* Global Modals */}
      <FileUploader />
      <DownloadDialog />
      <RenameDialog />
      <MoveToFolderDialog />
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
