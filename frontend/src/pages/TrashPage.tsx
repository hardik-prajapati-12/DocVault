import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trash2, CheckSquare, RotateCcw, X, Folder as FolderIcon, MoreVertical } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { FileGrid, FileList } from '@/components/files';
import { Button, ConfirmDialog, ContextMenu, type ContextMenuItem, type ContextMenuRef } from '@/components/ui';
import { useConfirmStore } from '@/store/confirm-store';
import { emptyTrash, bulkRestore, bulkPermanentDelete } from '@/services/file-service';
import type { Folder } from '@/types';
import toast from 'react-hot-toast';

const TrashPage: React.FC = () => {
  const navigate = useNavigate();
  const confirm = useConfirmStore();
  const viewMode = useAppStore((s) => s.viewMode);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const folders = useAppStore((s) => s.folders) ?? [];
  const documents = useAppStore((s) => s.documents);

  const selectedIds = useAppStore((s) => s.selectedIds);
  const selectionMode = useAppStore((s) => s.selectionMode);
  const clearSelection = useAppStore((s) => s.clearSelection);
  const setSelectionMode = useAppStore((s) => s.setSelectionMode);
  const selectAll = useAppStore((s) => s.selectAll);
  const toggleSelection = useAppStore((s) => s.toggleSelection);

  // Clear selections on transition
  React.useEffect(() => {
    return () => {
      clearSelection();
      setSelectionMode(false);
    };
  }, [clearSelection, setSelectionMode]);

  // Compute root level deleted folders and files (hiding nested deleted folder contents)
  const trashedFolders = useMemo(() => {
    const list = folders.filter((f) => f.isDeleted === 1);
    return list.filter((f) => {
      if (f.parentId) {
        const parentFolder = folders.find((pf) => pf.id === f.parentId);
        if (parentFolder && parentFolder.isDeleted === 1) {
          return false;
        }
      }
      return true;
    });
  }, [folders]);

  const trashedFiles = useMemo(() => {
    const list = documents.filter((d) => d.isDeleted === 1);
    return list.filter((d) => {
      if (d.folderId) {
        const parentFolder = folders.find((pf) => pf.id === d.folderId);
        if (parentFolder && parentFolder.isDeleted === 1) {
          return false;
        }
      }
      return true;
    });
  }, [documents, folders]);

  // Apply search query filters
  const displayFolders = useMemo(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return trashedFolders.filter((f) => f.name.toLowerCase().includes(q));
    }
    return trashedFolders;
  }, [trashedFolders, searchQuery]);

  const displayFiles = useMemo(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return trashedFiles.filter((f) => f.name.toLowerCase().includes(q));
    }
    return trashedFiles;
  }, [trashedFiles, searchQuery]);

  const currentItems = useMemo(() => {
    return [
      ...displayFolders.map((f) => ({ id: f.id, type: 'folder' })),
      ...displayFiles.map((d) => ({ id: d.id, type: 'file' })),
    ];
  }, [displayFolders, displayFiles]);

  const loading = false;

  const handleEmptyTrash = async () => {
    await emptyTrash();
    toast.success('Trash emptied');
    setConfirmEmpty(false);
    await useAppStore.getState().fetchData();
  };

  const handleBulkRestore = async () => {
    if (selectedIds.size === 0) return;
    const selectedArray = Array.from(selectedIds);
    const fileIds = selectedArray.filter((id) => documents.some((d) => d.id === id));
    const folderIds = selectedArray.filter((id) => folders.some((f) => f.id === id));

    if (fileIds.length > 0) {
      await bulkRestore(fileIds);
    }
    if (folderIds.length > 0) {
      await fetch('/api/folders/bulk-restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: folderIds }),
      });
    }
    toast.success(`Restored selected items`);
    clearSelection();
    await useAppStore.getState().fetchData();
  };

  const handleBulkPermanentDelete = async () => {
    if (selectedIds.size === 0) return;
    const selectedArray = Array.from(selectedIds);
    const fileIds = selectedArray.filter((id) => documents.some((d) => d.id === id));
    const folderIds = selectedArray.filter((id) => folders.some((f) => f.id === id));

    if (fileIds.length > 0) {
      await bulkPermanentDelete(fileIds);
    }
    if (folderIds.length > 0) {
      await fetch('/api/folders/bulk-delete-permanent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: folderIds }),
      });
    }
    toast.success(`Permanently deleted selected items`);
    clearSelection();
    await useAppStore.getState().fetchData();
  };

  // Context Menu builder helper
  const FolderCardWithContext: React.FC<{ folder: Folder }> = ({ folder }) => {
    const contextMenuRef = React.useRef<ContextMenuRef>(null);
    const isSelected = selectedIds.has(folder.id);

    const items: ContextMenuItem[] = [
      {
        label: 'Restore',
        icon: <RotateCcw className="w-4 h-4" />,
        onClick: async () => {
          await fetch('/api/folders/bulk-restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: [folder.id] }),
          });
          toast.success('Folder restored');
          await useAppStore.getState().fetchData();
        },
      },
      {
        label: 'Delete Permanently',
        icon: <Trash2 className="w-4 h-4" />,
        onClick: () => {
          confirm.triggerConfirm({
            title: 'Permanently Delete Folder',
            message: `Are you sure you want to permanently delete "${folder.name}" and all of its contents? This action cannot be undone.`,
            confirmText: 'Delete Permanently',
            variant: 'danger',
            onConfirm: async () => {
              await fetch('/api/folders/bulk-delete-permanent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [folder.id] }),
              });
              toast.success('Folder permanently deleted');
              await useAppStore.getState().fetchData();
            },
          });
        },
        variant: 'danger',
      },
    ];

    const handleClick = (e: React.MouseEvent) => {
      if (selectionMode) {
        e.preventDefault();
        toggleSelection(folder.id);
      } else {
        navigate(`/folders/${folder.id}`);
      }
    };

    return (
      <ContextMenu ref={contextMenuRef} items={items}>
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          onClick={handleClick}
          className={`glass-card p-4 cursor-pointer group relative flex flex-col justify-between h-32 select-none hover:ring-2 hover:ring-[var(--accent)] transition-all
            ${isSelected ? 'ring-2 ring-[var(--accent)] bg-[var(--accent-dim)]' : ''}`}
        >
          <div className="flex items-start justify-between">
            {selectionMode ? (
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors
                ${isSelected ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--text-tertiary)]'}`}
              >
                {isSelected && <span className="text-white text-xs font-bold">✓</span>}
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)]">
                <FolderIcon className="w-5 h-5 fill-[var(--accent)]" />
              </div>
            )}
            {!selectionMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  contextMenuRef.current?.showMenu(e);
                }}
                className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[var(--bg-tertiary)] transition-all cursor-pointer"
                title="Folder actions"
              >
                <MoreVertical className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
            )}
          </div>
          <div className="mt-2 min-w-0">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate" title={folder.name}>
              {folder.name}
            </h4>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
              Deleted Folder
            </p>
          </div>
        </motion.div>
      </ContextMenu>
    );
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Trash2 className="w-6 h-6 text-red-400" />
            Trash
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {loading ? 'Loading...' : `${displayFolders.length} folders, ${displayFiles.length} files`}
          </p>
        </div>
        <div className="flex gap-2.5">
          {currentItems.length > 0 && (
            <Button
              variant={selectionMode ? 'ghost' : 'secondary'}
              size="sm"
              onClick={() => {
                if (selectionMode) {
                  clearSelection();
                  setSelectionMode(false);
                } else {
                  setSelectionMode(true);
                }
              }}
              icon={selectionMode ? <X className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
            >
              {selectionMode ? 'Close Selection' : 'Select Items'}
            </Button>
          )}
          {currentItems.length > 0 && !selectionMode && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmEmpty(true)}
              icon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Empty Trash
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectionMode && selectedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-4 p-3 rounded-xl glass-strong"
        >
          <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
          <span className="text-sm text-[var(--text-primary)] font-medium">
            {selectedIds.size} selected
          </span>
          <div className="flex gap-2 ml-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => selectAll(currentItems.map((item) => item.id))}
            >
              Select All
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBulkRestore}
              icon={<RotateCcw className="w-3.5 h-3.5 text-emerald-400" />}
            >
              Restore
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleBulkPermanentDelete}
              icon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete Permanently
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { clearSelection(); setSelectionMode(false); }}
              icon={<X className="w-3.5 h-3.5" />}
            >
              Cancel
            </Button>
          </div>
        </motion.div>
      )}

      {/* Folders Section */}
      {displayFolders.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">
            Folders ({displayFolders.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {displayFolders.map((folder) => (
              <FolderCardWithContext key={folder.id} folder={folder} />
            ))}
          </div>
        </div>
      )}

      {/* Files Section */}
      <div>
        {displayFolders.length > 0 && displayFiles.length > 0 && (
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">
            Files ({displayFiles.length})
          </h3>
        )}
        {viewMode === 'grid' ? (
          <FileGrid files={displayFiles} loading={loading} isTrash />
        ) : (
          <FileList files={displayFiles} loading={loading} isTrash />
        )}
      </div>

      {!loading && currentItems.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
            <Trash2 className="w-10 h-10 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Trash is empty</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Deleted files and folders will appear here
          </p>
        </motion.div>
      )}

      <ConfirmDialog
        isOpen={confirmEmpty}
        onClose={() => setConfirmEmpty(false)}
        onConfirm={handleEmptyTrash}
        title="Empty Trash"
        message="This will permanently delete all files and folders in the trash. This action cannot be undone."
        confirmText="Empty Trash"
        variant="danger"
      />
    </div>
  );
};

export default TrashPage;
