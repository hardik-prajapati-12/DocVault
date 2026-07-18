import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Moon, Sun, Monitor, Palette, Grid3X3, List, Download, Upload,
  Trash2, Database, RefreshCw, HardDrive, Cloud,
} from 'lucide-react';
import { Modal, Button, ConfirmDialog } from '@/components/ui';
import { useAppStore } from '@/store/app-store';
import { db } from '@/db/db';
import { clearAllFiles, getStorageEstimate } from '@/services/storage/opfs-storage';
import { getFileBlob } from '@/services/file-service';
import { formatBytes } from '@/utils';
import { createZipArchive } from '@/services/compression/compression-service';
import type { ThemeMode, AccentColor, ViewMode } from '@/types';
import toast from 'react-hot-toast';

const themes: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { value: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
  { value: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
  { value: 'system', label: 'System', icon: <Monitor className="w-4 h-4" /> },
];

const accents: { value: AccentColor; color: string }[] = [
  { value: 'blue', color: '#3b82f6' },
  { value: 'purple', color: '#8b5cf6' },
  { value: 'teal', color: '#14b8a6' },
  { value: 'rose', color: '#f43f5e' },
  { value: 'amber', color: '#f59e0b' },
  { value: 'emerald', color: '#10b981' },
  { value: 'indigo', color: '#6366f1' },
  { value: 'orange', color: '#f97316' },
];

export const SettingsPanel: React.FC = () => {
  const isOpen = useAppStore((s) => s.settingsOpen);
  const setOpen = useAppStore((s) => s.setSettingsOpen);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const accentColor = useAppStore((s) => s.accentColor);
  const setAccentColor = useAppStore((s) => s.setAccentColor);
  const viewMode = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const syncProvider = useAppStore((s) => s.syncProvider);
  const webdavUrl = useAppStore((s) => s.webdavUrl);
  const webdavUsername = useAppStore((s) => s.webdavUsername);
  const webdavPassword = useAppStore((s) => s.webdavPassword);
  const autoSync = useAppStore((s) => s.autoSync);
  const lastSyncedAt = useAppStore((s) => s.lastSyncedAt);
  const setSyncSettings = useAppStore((s) => s.setSyncSettings);

  const [resetConfirm, setResetConfirm] = useState(false);
  const [storage, setStorage] = useState({ used: 0, total: 0 });

  const [provider, setProvider] = useState(syncProvider);
  const [url, setUrl] = useState(webdavUrl);
  const [username, setUsername] = useState(webdavUsername);
  const [password, setPassword] = useState(webdavPassword);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(autoSync);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  React.useEffect(() => {
    setProvider(syncProvider);
    setUrl(webdavUrl);
    setUsername(webdavUsername);
    setPassword(webdavPassword);
    setAutoSyncEnabled(autoSync);
  }, [syncProvider, webdavUrl, webdavUsername, webdavPassword, autoSync]);

  React.useEffect(() => {
    if (isOpen) getStorageEstimate().then(setStorage);
  }, [isOpen]);

  const handleExportDB = async () => {
    try {
      const docs = useAppStore.getState().documents;
      const folders = useAppStore.getState().folders;
      const data = JSON.stringify({ documents: docs, folders }, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `docvault-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Database exported');
    } catch {
      toast.error('Export failed');
    }
  };

  const handleImportDB = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (data.folders && data.folders.length > 0) {
          const res = await fetch('/api/folders/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folders: data.folders }),
          });
          if (!res.ok) throw new Error('Folder import failed');
        }

        if (data.documents && data.documents.length > 0) {
          const res = await fetch('/api/documents/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documents: data.documents }),
          });
          if (!res.ok) throw new Error('Document import failed');
        }

        await useAppStore.getState().fetchData();
        toast.success('Database imported');
      } catch (error) {
        console.error(error);
        toast.error('Invalid import file or server error');
      }
    };
    input.click();
  };

  const handleFullBackup = async () => {
    try {
      toast.loading('Creating backup...', { id: 'backup' });
      const docs = useAppStore.getState().documents;
      const folders = useAppStore.getState().folders;
      const metaBlob = new Blob(
        [JSON.stringify({ documents: docs, folders }, null, 2)],
        { type: 'application/json' }
      );

      const files: { name: string; blob: Blob }[] = [
        { name: 'metadata.json', blob: metaBlob },
      ];

      for (const doc of docs) {
        const blob = await getFileBlob(doc.id);
        if (blob) {
          files.push({ name: `files/${doc.name}`, blob });
        }
      }

      const zipBlob = await createZipArchive(files);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `docvault-backup-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup created', { id: 'backup' });
    } catch (error) {
      console.error(error);
      toast.error('Backup failed', { id: 'backup' });
    }
  };

  const handleReset = async () => {
    try {
      await clearAllFiles();
      await db.documents.clear();
      await db.folders.clear();
      await db.settings.clear();

      await fetch('/api/documents/clear-all', { method: 'POST' });
      await fetch('/api/folders/clear-all', { method: 'POST' });

      localStorage.clear();
      toast.success('Application reset');
      setResetConfirm(false);
      setOpen(false);
      window.location.reload();
    } catch (error) {
      console.error(error);
      toast.error('Reset failed');
    }
  };

  const handleClearCache = async () => {
    try {
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
      }
      toast.success('Cache cleared');
    } catch {
      toast.error('Failed to clear cache');
    }
  };

  const handleTestConnection = async () => {
    if (!url || !username || !password) {
      toast.error('Please fill in all connection details');
      return;
    }
    setIsTesting(true);
    const { WebDAVClient } = await import('@/services/sync/webdav-client');
    const client = new WebDAVClient(url, username, password);
    const ok = await client.testConnection();
    setIsTesting(false);
    if (ok) {
      toast.success('Connection successful!');
    } else {
      toast.error('Connection failed. Please check credentials and CORS settings.');
    }
  };

  const handleSaveSyncSettings = () => {
    setSyncSettings({
      syncProvider: provider,
      webdavUrl: url.trim(),
      webdavUsername: username.trim(),
      webdavPassword: password,
      autoSync: autoSyncEnabled,
    });
    toast.success('Sync settings saved');
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    const { SyncService } = await import('@/services/sync/sync-service');
    await new SyncService().sync();
    setIsSyncing(false);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={() => setOpen(false)} title="Settings" maxWidth="max-w-lg">
        <div className="space-y-6">
          {/* Theme */}
          <section>
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Moon className="w-4 h-4" /> Theme
            </h4>
            <div className="flex gap-2">
              {themes.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer
                    ${theme === t.value
                      ? 'bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent)]'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)]'
                    }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </section>

          {/* Accent Color */}
          <section>
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Palette className="w-4 h-4" /> Accent Color
            </h4>
            <div className="flex gap-2 flex-wrap">
              {accents.map((a) => (
                <button
                  key={a.value}
                  onClick={() => setAccentColor(a.value)}
                  className={`w-9 h-9 rounded-xl transition-all cursor-pointer ${
                    accentColor === a.value ? 'ring-2 ring-white/50 scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: a.color }}
                  title={a.value}
                />
              ))}
            </div>
          </section>

          {/* Default View */}
          <section>
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Grid3X3 className="w-4 h-4" /> Default View
            </h4>
            <div className="flex gap-2">
              {(['grid', 'list'] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer capitalize
                    ${viewMode === v
                      ? 'bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent)]'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                    }`}
                >
                  {v === 'grid' ? <Grid3X3 className="w-4 h-4" /> : <List className="w-4 h-4" />}
                  {v}
                </button>
              ))}
            </div>
          </section>

          {/* Storage */}
          <section>
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <HardDrive className="w-4 h-4" /> Storage
            </h4>
            <div className="p-3 rounded-xl bg-[var(--bg-tertiary)] space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Used</span>
                <span className="text-[var(--text-primary)] font-medium">{formatBytes(storage.used)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Available</span>
                <span className="text-[var(--text-primary)] font-medium">{formatBytes(storage.total - storage.used)}</span>
              </div>
              <div className="h-1.5 bg-[var(--bg-input)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${storage.total > 0 ? (storage.used / storage.total) * 100 : 0}%`,
                    background: 'var(--accent)',
                  }}
                />
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-2 w-full"
              onClick={handleClearCache}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Clear Cache
            </Button>
          </section>

          {/* Data Management */}
          <section>
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Database className="w-4 h-4" /> Data Management
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" size="sm" onClick={handleExportDB} icon={<Download className="w-3.5 h-3.5" />}>
                Export DB
              </Button>
              <Button variant="secondary" size="sm" onClick={handleImportDB} icon={<Upload className="w-3.5 h-3.5" />}>
                Import DB
              </Button>
              <Button variant="secondary" size="sm" onClick={handleFullBackup} icon={<Download className="w-3.5 h-3.5" />}>
                Full Backup
              </Button>
              <Button variant="danger" size="sm" onClick={() => setResetConfirm(true)} icon={<Trash2 className="w-3.5 h-3.5" />}>
                Reset App
              </Button>
            </div>
          </section>

          {/* Cloud Sync */}
          <section className="border-t border-[var(--border-color)] pt-5">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Cloud className="w-4 h-4 text-[var(--accent)]" /> Cloud Sync
            </h4>
            <div className="space-y-4">
              {/* Provider Selection */}
              <div>
                <label className="text-xs text-[var(--text-secondary)] font-medium mb-1.5 block">Sync Provider</label>
                <div className="flex gap-2">
                  {(['none', 'webdav'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setProvider(p)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer capitalize
                        ${provider === p
                          ? 'bg-[var(--accent-dim)] border-[var(--accent)] text-[var(--accent)]'
                          : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
                        }`}
                    >
                      {p === 'none' ? 'Disabled' : 'WebDAV'}
                    </button>
                  ))}
                </div>
              </div>

              {provider === 'webdav' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-3 overflow-hidden"
                >
                  {/* WebDAV URL */}
                  <div>
                    <label className="text-xs text-[var(--text-secondary)] font-medium mb-1 block">Server URL</label>
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="e.g. https://example.com/remote.php/dav/files/user/"
                      className="input-glass w-full text-xs"
                    />
                  </div>

                  {/* Username & Password */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[var(--text-secondary)] font-medium mb-1 block">Username</label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="WebDAV Username"
                        className="input-glass w-full text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-secondary)] font-medium mb-1 block">App Password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="input-glass w-full text-xs"
                      />
                    </div>
                  </div>

                  {/* Auto Sync Toggle */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-tertiary)]">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">Auto Sync</span>
                      <span className="text-[10px] text-[var(--text-tertiary)]">Sync automatically on file upload/edit</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                      className={`w-9 h-5 rounded-full transition-colors flex items-center p-0.5 cursor-pointer
                        ${autoSyncEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--border-color)]'}`}
                    >
                      <motion.div
                        layout
                        className="w-4 h-4 bg-white rounded-full shadow"
                        animate={{ x: autoSyncEnabled ? 16 : 0 }}
                      />
                    </button>
                  </div>

                  {/* Settings Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={handleTestConnection}
                      loading={isTesting}
                    >
                      Test Connection
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={handleSaveSyncSettings}
                    >
                      Save Settings
                    </Button>
                  </div>

                  {/* Last Synced & Sync Now */}
                  {syncProvider === 'webdav' && (
                    <div className="flex items-center justify-between border-t border-[var(--border-color)] pt-3 text-xs">
                      <span className="text-[var(--text-secondary)]">
                        {lastSyncedAt
                          ? `Last synced: ${new Date(lastSyncedAt).toLocaleTimeString()}`
                          : 'Never synced'}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs py-1.5 px-3"
                        onClick={handleForceSync}
                        loading={isSyncing}
                        icon={<RefreshCw className="w-3.5 h-3.5" />}
                      >
                        Sync Now
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </section>

          {/* Keyboard Shortcuts */}
          <section>
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Keyboard Shortcuts</h4>
            <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
              {[
                ['Ctrl + U', 'Upload files'],
                ['Ctrl + ,', 'Settings'],
                ['/ or Ctrl + K', 'Focus search'],
                ['Escape', 'Close / Clear'],
                ['← →', 'Navigate preview'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between py-1">
                  <span>{desc}</span>
                  <kbd className="px-2 py-0.5 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] font-mono text-[10px]">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </section>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={resetConfirm}
        onClose={() => setResetConfirm(false)}
        onConfirm={handleReset}
        title="Reset Application"
        message="This will permanently delete all files, documents, and settings. This action cannot be undone."
        confirmText="Reset Everything"
        variant="danger"
      />
    </>
  );
};
