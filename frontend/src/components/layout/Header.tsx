import React from 'react';
import {
  Search, Grid3X3, List, SortAsc, Upload,
  ArrowDownAZ, ArrowUpAZ, Clock, ArrowDown, ArrowUp, FileText,
  LogOut, UserCircle, Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/app-store';
import type { SortOption, FilterOption } from '@/types';

const sortOptions: { value: SortOption; label: string; icon: React.ReactNode }[] = [
  { value: 'newest', label: 'Newest First', icon: <Clock className="w-4 h-4" /> },
  { value: 'oldest', label: 'Oldest First', icon: <Clock className="w-4 h-4" /> },
  { value: 'largest', label: 'Largest First', icon: <ArrowDown className="w-4 h-4" /> },
  { value: 'smallest', label: 'Smallest First', icon: <ArrowUp className="w-4 h-4" /> },
  { value: 'a-z', label: 'A → Z', icon: <ArrowDownAZ className="w-4 h-4" /> },
  { value: 'z-a', label: 'Z → A', icon: <ArrowUpAZ className="w-4 h-4" /> },
  { value: 'extension', label: 'Extension', icon: <FileText className="w-4 h-4" /> },
  { value: 'recently-modified', label: 'Recently Modified', icon: <Clock className="w-4 h-4" /> },
];

const filterOptions: { value: FilterOption; label: string }[] = [
  { value: 'all', label: 'All Files' },
  { value: 'images', label: 'Images' },
  { value: 'videos', label: 'Videos' },
  { value: 'audio', label: 'Audio' },
  { value: 'pdf', label: 'PDF' },
  { value: 'documents', label: 'Documents' },
  { value: 'archives', label: 'Archives' },
  { value: 'code', label: 'Code' },
  { value: 'executables', label: 'Executables' },
  { value: 'favorites', label: 'Favorites' },
  { value: 'large', label: 'Large (>100MB)' },
  { value: 'small', label: 'Small (<1MB)' },
];

export const Header: React.FC = () => {
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const viewMode = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const sortOption = useAppStore((s) => s.sortOption);
  const setSortOption = useAppStore((s) => s.setSortOption);
  const activeFilter = useAppStore((s) => s.activeFilter);
  const setActiveFilter = useAppStore((s) => s.setActiveFilter);
  const setUploadModalOpen = useAppStore((s) => s.setUploadModalOpen);

  const [sortOpen, setSortOpen] = React.useState(false);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);

  // Get the logged-in user info
  const authUser = React.useMemo(() => {
    try {
      const raw = localStorage.getItem('docvault-auth-user');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('docvault-auth-token');
    localStorage.removeItem('docvault-auth-user');
    window.location.href = '/login';
  };

  return (
    <header className="sticky top-0 z-20 glass-strong border-b border-[var(--border-color)]">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Search */}
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            id="search-input"
            type="text"
            placeholder="Search files... (/ to focus)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-glass w-full !pl-10 pr-4 py-2.5 text-sm"
          />
        </div>

        {/* Filter Dropdown */}
        <div className="relative">
          <button
            onClick={() => { setFilterOpen(!filterOpen); setSortOpen(false); }}
            className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all border cursor-pointer
              ${activeFilter !== 'all'
                ? 'bg-[var(--accent-dim)] border-[var(--accent)] text-[var(--accent)]'
                : 'bg-[var(--bg-input)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
          >
            {filterOptions.find((f) => f.value === activeFilter)?.label || 'Filter'}
          </button>
          {filterOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute right-0 mt-2 py-1.5 glass-strong rounded-xl shadow-2xl min-w-[180px] max-h-[300px] overflow-y-auto"
            >
              {filterOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setActiveFilter(opt.value); setFilterOpen(false); }}
                  className={`w-full text-left px-3.5 py-2 text-sm transition-colors cursor-pointer
                    ${activeFilter === opt.value
                      ? 'text-[var(--accent)] bg-[var(--accent-dim)]'
                      : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </motion.div>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="relative">
          <button
            onClick={() => { setSortOpen(!sortOpen); setFilterOpen(false); }}
            className="p-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="Sort"
          >
            <SortAsc className="w-4 h-4" />
          </button>
          {sortOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute right-0 mt-2 py-1.5 glass-strong rounded-xl shadow-2xl min-w-[200px]"
            >
              {sortOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setSortOption(opt.value); setSortOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors cursor-pointer
                    ${sortOption === opt.value
                      ? 'text-[var(--accent)] bg-[var(--accent-dim)]'
                      : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                    }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </motion.div>
          )}
        </div>

        {/* View Toggle */}
        <div className="flex rounded-xl overflow-hidden border border-[var(--border-color)]">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2.5 transition-colors cursor-pointer ${
              viewMode === 'grid' ? 'bg-[var(--accent-dim)] text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title="Grid view"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2.5 transition-colors cursor-pointer ${
              viewMode === 'list' ? 'bg-[var(--accent-dim)] text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title="List view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {/* Upload Button */}
        <button
          onClick={() => setUploadModalOpen(true)}
          className="btn-accent flex items-center gap-2 px-4 py-2.5 text-sm cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">Upload</span>
        </button>

        {/* User Profile / Logout */}
        <div className="relative">
          <button
            onClick={() => { setProfileOpen(!profileOpen); setSortOpen(false); setFilterOpen(false); }}
            className="flex items-center gap-2 p-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="Account"
          >
            <UserCircle className="w-5 h-5" />
            {authUser?.username && (
              <span className="hidden md:inline text-sm font-medium max-w-[100px] truncate">{authUser.username}</span>
            )}
          </button>
          {profileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute right-0 mt-2 py-1.5 glass-strong rounded-xl shadow-2xl min-w-[160px]"
            >
              {authUser?.username && (
                <div className="px-3.5 py-2 text-xs text-[var(--text-tertiary)] border-b border-[var(--border-color)]">
                  Signed in as <strong className="text-[var(--text-primary)]">{authUser.username}</strong>
                </div>
              )}
              <a
                href="/landing"
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer border-b border-[var(--border-color)]"
              >
                <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                Home Showcase
              </a>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </header>
  );
};
