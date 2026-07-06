import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FolderOpen, Star, Archive, Trash2,
  Settings, ChevronLeft, ChevronRight, RefreshCw, Download,
} from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { formatBytes } from '@/utils';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/files', label: 'All Files', icon: FolderOpen },
  { path: '/favorites', label: 'Favorites', icon: Star },
  { path: '/archive', label: 'Archive', icon: Archive },
  { path: '/trash', label: 'Trash', icon: Trash2 },
  { path: '/converter', label: 'Converter', icon: RefreshCw },
];

export const Sidebar: React.FC = () => {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const location = useLocation();

  const docs = useLiveQuery(() => db.documents.toArray()) ?? [];
  const totalDocs = docs.filter((d) => d.isDeleted === 0).length;

  const [quota, setQuota] = React.useState(10 * 1024 * 1024 * 1024); // 10 GB default
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);

  React.useEffect(() => {
    navigator.storage.estimate().then((est) => {
      if (est.quota) setQuota(est.quota);
    }).catch(() => {});
  }, []);

  React.useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const usedStorage = docs.reduce((sum, doc) => sum + doc.size, 0);
  const storagePercent = quota > 0 ? (usedStorage / quota) * 100 : 0;

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 260 : 72 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="h-screen sticky top-0 flex flex-col glass-strong z-30 overflow-hidden flex-shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-[var(--border-color)]">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center flex-shrink-0 shadow-md">
          <svg className="w-5 h-5 text-white" viewBox="0 0 512 512" fill="none" stroke="currentColor" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round">
            <g transform="translate(128,96)">
              <path d="M0 40 L0 280 Q0 300 20 300 L236 300 Q256 300 256 280 L256 100 L180 0 L20 0 Q0 0 0 20 Z"/>
              <path d="M180 0 L180 80 Q180 100 200 100 L256 100"/>
              <line x1="60" y1="160" x2="196" y2="160"/>
              <line x1="60" y1="200" x2="160" y2="200"/>
              <line x1="60" y1="240" x2="196" y2="240"/>
            </g>
          </svg>
        </div>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="text-lg font-bold text-[var(--text-primary)] whitespace-nowrap overflow-hidden"
            >
              DocVault
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
                ${isActive
                  ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              title={item.label}
            >
              <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[var(--accent)]' : ''}`} />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          );
        })}
      </nav>

      {/* Storage Indicator */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-2"
          >
            <div className="text-xs text-[var(--text-tertiary)] mb-1.5 flex justify-between">
              <span>Storage</span>
              <span>{storagePercent.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden mb-1">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'var(--accent)' }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(storagePercent, 100)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-[10px] text-[var(--text-tertiary)]">
              {formatBytes(usedStorage)} / {formatBytes(quota)}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="border-t border-[var(--border-color)] p-2 flex flex-col gap-1">
        {deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] text-white shadow-md hover:brightness-110 transition-all w-full cursor-pointer h-10 mb-1"
            title="Install DocVault App"
          >
            <Download className="w-5 h-5 flex-shrink-0" />
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="whitespace-nowrap"
                >
                  Install App
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        )}
        <div className="flex items-center justify-between w-full">
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors w-full cursor-pointer"
            title="Settings"
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="whitespace-nowrap">
                  Settings
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors flex-shrink-0 cursor-pointer"
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </motion.aside>
  );
};
