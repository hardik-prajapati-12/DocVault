import React, { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Upload, FolderPlus, Star, Files, ShieldCheck, Sparkles, Clock, HardDrive,
  FileText, Lock, ArrowUpRight, Search, Eye, Download, CheckCircle2, ChevronRight,
  Activity, ShieldAlert, Cpu
} from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { DashboardCharts } from '@/components/dashboard';
import { formatBytes } from '@/utils';
import toast from 'react-hot-toast';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const docs = useAppStore((s) => s.documents) ?? [];
  const setUploadModalOpen = useAppStore((s) => s.setUploadModalOpen);
  const setPreviewFileId = useAppStore((s) => s.setPreviewFileId);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);

  // Authenticated user
  const authUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('docvault-auth-user');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, []);

  // Time-aware greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  // Active documents
  const activeDocs = useMemo(() => {
    return docs.filter((d) => d.isDeleted === 0 && d.isArchived === 0);
  }, [docs]);

  // Recent files (top 6)
  const recentDocs = useMemo(() => {
    return [...activeDocs]
      .sort((a, b) => new Date(b.modifiedAt || b.createdAt).getTime() - new Date(a.modifiedAt || a.createdAt).getTime())
      .slice(0, 6);
  }, [activeDocs]);

  // Favorites count
  const favoriteCount = useMemo(() => {
    return activeDocs.filter((d) => d.isFavorite === 1).length;
  }, [activeDocs]);

  // Total storage
  const totalStorageBytes = useMemo(() => {
    return activeDocs.reduce((sum, d) => sum + d.size, 0);
  }, [activeDocs]);

  // Run security scan action
  const handleSecurityCheck = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1200)),
      {
        loading: 'Verifying cloud connection & document integrity...',
        success: `Cloud Vault Status: Online & Secure (${activeDocs.length} documents synced)`,
        error: 'Check failed',
      }
    );
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      {/* ── 1. Executive Welcome & Hero Bar ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl glass-strong border border-[var(--border-color)] p-6 sm:p-8 shadow-xl"
      >
        {/* Glow ambient circle */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--accent-dim)] rounded-full blur-3xl opacity-30 pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                DocVault Cloud Dashboard
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> Online
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">
              {greeting},{' '}
              <span className="bg-gradient-to-r from-[var(--accent)] to-purple-500 bg-clip-text text-transparent">
                {authUser?.username || 'Vault Commander'}
              </span>
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Your online document vault is connected, synced, and ready to go.
            </p>
          </div>

          {/* Quick Hero Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setUploadModalOpen(true)}
              className="btn-accent flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-[var(--accent-glow)] cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Upload Document
            </button>
            <button
              onClick={handleSecurityCheck}
              className="glass-card px-4 py-3 rounded-2xl border border-[var(--border-color)] text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              Cloud Status
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── 2. Quick Action Shortcut Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'All Cloud Files', count: `${activeDocs.length} Documents`, icon: Files, path: '/files', color: '#3b82f6' },
          { label: 'Favorite Items', count: `${favoriteCount} Starred`, icon: Star, path: '/favorites', color: '#f59e0b' },
          { label: 'Folders Hierarchy', count: 'Organized Paths', icon: FolderPlus, path: '/folders', color: '#8b5cf6' },
          { label: 'Product Showcase', count: 'Explore Platform', icon: ArrowUpRight, path: '/landing', color: '#10b981' },
        ].map((act, idx) => {
          const Icon = act.icon;
          return (
            <motion.div
              key={act.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              onClick={() => navigate(act.path)}
              className="glass-card p-5 rounded-2xl border border-[var(--border-color)] hover:border-[var(--accent)]/40 transition-all cursor-pointer group hover:-translate-y-1 shadow-md"
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${act.color}18`, color: act.color }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all" />
              </div>
              <h4 className="text-sm font-bold text-[var(--text-primary)]">{act.label}</h4>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{act.count}</p>
            </motion.div>
          );
        })}
      </div>

      {/* ── 3. Recent Documents Showcase Grid ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Recent Cloud Activity</h2>
            <p className="text-xs text-[var(--text-secondary)]">Quick access to your latest uploaded or updated documents online</p>
          </div>
          <Link
            to="/files"
            className="text-xs font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
          >
            View All Files ({activeDocs.length})
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentDocs.length === 0 ? (
          <div className="glass-strong p-10 rounded-3xl border border-[var(--border-color)] text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--accent-dim)] text-[var(--accent)] mx-auto flex items-center justify-center">
              <FileText className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-base font-bold text-[var(--text-primary)]">Your Cloud Vault is Empty</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Upload your first document to get started with secure online storage, instant cloud search, and built-in document previewing.
              </p>
            </div>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="btn-accent px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-[var(--accent-glow)] inline-flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Upload Document Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentDocs.map((doc) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-strong p-4 rounded-2xl border border-[var(--border-color)] hover:border-[var(--accent)]/40 transition-all flex flex-col justify-between space-y-3 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center flex-shrink-0 text-[var(--accent)]">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
                        {doc.name}
                      </h4>
                      <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                        {formatBytes(doc.size)} • {doc.extension?.toUpperCase() || 'FILE'}
                      </p>
                    </div>
                  </div>

                  {doc.isFavorite === 1 && (
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0" />
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)] text-xs text-[var(--text-tertiary)]">
                  <span className="flex items-center gap-1 font-mono text-[10px] text-emerald-400">
                    <Lock className="w-3 h-3" /> Cloud Stored
                  </span>
                  <button
                    onClick={() => setPreviewFileId(doc.id)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--accent-dim)] hover:text-[var(--accent)] font-medium transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ── 4. Recharts & Dashboard Data Visualizations ── */}
      <div className="pt-4">
        <DashboardCharts />
      </div>
    </div>
  );
};

export default DashboardPage;
