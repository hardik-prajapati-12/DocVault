/**
 * Global application store using Zustand.
 * Manages UI state, search, filters, sort, selections, and settings.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ViewMode, ThemeMode, AccentColor, SortOption, FilterOption, DocFile, Folder } from '@/types';

interface AppState {
  // UI
  sidebarOpen: boolean;
  viewMode: ViewMode;
  theme: ThemeMode;
  accentColor: AccentColor;

  // Search & Filters
  searchQuery: string;
  activeFilter: FilterOption;
  sortOption: SortOption;

  // Selection
  selectedIds: Set<string>;
  selectionMode: boolean;

  // Online status
  isOnline: boolean;

  // Modals
  uploadModalOpen: boolean;
  previewFileId: string | null;
  downloadDialogFileId: string | null;
  settingsOpen: boolean;
  renameDialogFileId: string | null;
  moveDialogFileId: string | null;
  moveDialogFileIds: string[];
  moveDialogFolderId: string | null;
  moveDialogFolderIds: string[];
  activeFolderId: string | null;

  // Cloud Sync
  syncProvider: 'none' | 'webdav';
  webdavUrl: string;
  webdavUsername: string;
  webdavPassword: string;
  autoSync: boolean;
  lastSyncedAt: number | null;

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  setTheme: (theme: ThemeMode) => void;
  setAccentColor: (color: AccentColor) => void;
  setSearchQuery: (query: string) => void;
  setActiveFilter: (filter: FilterOption) => void;
  setSortOption: (sort: SortOption) => void;
  toggleSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  setSelectionMode: (mode: boolean) => void;
  setOnline: (online: boolean) => void;
  setUploadModalOpen: (open: boolean) => void;
  setPreviewFileId: (id: string | null) => void;
  setDownloadDialogFileId: (id: string | null) => void;
  setSettingsOpen: (open: boolean) => void;
  setRenameDialogFileId: (id: string | null) => void;
  setMoveDialogFileId: (id: string | null) => void;
  setMoveDialogFileIds: (ids: string[]) => void;
  setMoveDialogFolderId: (id: string | null) => void;
  setMoveDialogFolderIds: (ids: string[]) => void;
  setMoveDialogItems: (fileIds: string[], folderIds: string[]) => void;
  clearMoveDialog: () => void;
  setSyncSettings: (settings: {
    syncProvider: 'none' | 'webdav';
    webdavUrl: string;
    webdavUsername: string;
    webdavPassword: string;
    autoSync: boolean;
  }) => void;
  setLastSyncedAt: (timestamp: number | null) => void;
  setActiveFolderId: (id: string | null) => void;

  // MongoDB Server-side Data
  documents: DocFile[];
  folders: Folder[];
  setDocuments: (docs: DocFile[]) => void;
  setFolders: (folders: Folder[]) => void;
  fetchData: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      sidebarOpen: true,
      viewMode: 'grid',
      theme: 'dark',
      accentColor: 'blue',
      searchQuery: '',
      activeFilter: 'all',
      sortOption: 'newest',
      selectedIds: new Set(),
      selectionMode: false,
      isOnline: navigator.onLine,
      uploadModalOpen: false,
      previewFileId: null,
      downloadDialogFileId: null,
      settingsOpen: false,
      renameDialogFileId: null,
      moveDialogFileId: null,
      moveDialogFileIds: [],
      moveDialogFolderId: null,
      moveDialogFolderIds: [],
      syncProvider: 'none',
      webdavUrl: '',
      webdavUsername: '',
      webdavPassword: '',
      autoSync: false,
      lastSyncedAt: null,
      activeFolderId: null,

      documents: [],
      folders: [],

      // Actions
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setTheme: (theme) => set({ theme }),
      setAccentColor: (color) => set({ accentColor: color }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setActiveFilter: (filter) => set({ activeFilter: filter }),
      setSortOption: (sort) => set({ sortOption: sort }),
      toggleSelection: (id) =>
        set((s) => {
          const next = new Set(s.selectedIds);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return { selectedIds: next, selectionMode: next.size > 0 };
        }),
      selectAll: (ids) => set({ selectedIds: new Set(ids), selectionMode: ids.length > 0 }),
      clearSelection: () => set({ selectedIds: new Set(), selectionMode: false }),
      setSelectionMode: (mode) =>
        set({ selectionMode: mode, selectedIds: mode ? new Set() : new Set() }),
      setOnline: (online) => set({ isOnline: online }),
      setUploadModalOpen: (open) => set({ uploadModalOpen: open }),
      setPreviewFileId: (id) => set({ previewFileId: id }),
      setDownloadDialogFileId: (id) => set({ downloadDialogFileId: id }),
      setSettingsOpen: (open) => set({ settingsOpen: open }),
      setRenameDialogFileId: (id) => set({ renameDialogFileId: id }),
      setMoveDialogFileId: (id) => set({ moveDialogFileId: id, moveDialogFileIds: id ? [id] : [], moveDialogFolderId: null, moveDialogFolderIds: [] }),
      setMoveDialogFileIds: (ids) => set({ moveDialogFileIds: ids, moveDialogFileId: ids.length === 1 ? ids[0] : null, moveDialogFolderId: null, moveDialogFolderIds: [] }),
      setMoveDialogFolderId: (id) => set({ moveDialogFolderId: id, moveDialogFolderIds: id ? [id] : [], moveDialogFileId: null, moveDialogFileIds: [] }),
      setMoveDialogFolderIds: (ids) => set({ moveDialogFolderIds: ids, moveDialogFolderId: ids.length === 1 ? ids[0] : null, moveDialogFileId: null, moveDialogFileIds: [] }),
      setMoveDialogItems: (fileIds, folderIds) => set({
        moveDialogFileIds: fileIds,
        moveDialogFileId: fileIds.length === 1 ? fileIds[0] : null,
        moveDialogFolderIds: folderIds,
        moveDialogFolderId: folderIds.length === 1 ? folderIds[0] : null,
      }),
      clearMoveDialog: () => set({ moveDialogFileId: null, moveDialogFileIds: [], moveDialogFolderId: null, moveDialogFolderIds: [] }),


      setSyncSettings: (settings) => set({ ...settings }),
      setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
      setActiveFolderId: (activeFolderId) => set({ activeFolderId }),
      setDocuments: (documents) => set({ documents }),
      setFolders: (folders) => set({ folders }),
      fetchData: async () => {
        const token = localStorage.getItem('docvault-auth-token');
        if (!token) return;
        const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
        try {
          const [docsRes, foldersRes] = await Promise.all([
            fetch('/api/documents', { headers }),
            fetch('/api/folders', { headers }),
          ]);
          if (docsRes.ok && foldersRes.ok) {
            const rawDocs = await docsRes.json();
            const rawFolders = await foldersRes.json();

            const documents = rawDocs.map((doc: any) => ({
              ...doc,
              createdAt: new Date(doc.createdAt),
              modifiedAt: new Date(doc.modifiedAt),
              uploadedAt: new Date(doc.uploadedAt),
              deletedAt: doc.deletedAt ? new Date(doc.deletedAt) : null,
            }));

            const folders = rawFolders.map((f: any) => ({
              ...f,
              createdAt: new Date(f.createdAt),
              modifiedAt: new Date(f.modifiedAt),
              deletedAt: f.deletedAt ? new Date(f.deletedAt) : null,
              isFavorite: f.isFavorite || 0,
              isArchived: f.isArchived || 0,
            }));

            set({ documents, folders });
          }
        } catch (error) {
          console.error('Failed to fetch data from MERN backend:', error);
        }
      },
    }),
    {
      name: 'docvault-app-store',
      partialize: (state) => ({
        viewMode: state.viewMode,
        theme: state.theme,
        accentColor: state.accentColor,
        sidebarOpen: state.sidebarOpen,
        sortOption: state.sortOption,
        syncProvider: state.syncProvider,
        webdavUrl: state.webdavUrl,
        webdavUsername: state.webdavUsername,
        webdavPassword: state.webdavPassword,
        autoSync: state.autoSync,
        lastSyncedAt: state.lastSyncedAt,
      }),
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          return str ? JSON.parse(str) : null;
        },
        setItem: (name, value) => localStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);
