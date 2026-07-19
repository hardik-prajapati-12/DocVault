import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, CheckSquare, X, Download, Archive, Trash2, Folder as FolderIcon, MoreVertical, Eye, Copy, Edit3 } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useConfirmStore } from '@/store/confirm-store';
import { FileGrid, FileList } from '@/components/files';
import { Button, ContextMenu, type ContextMenuItem, type ContextMenuRef } from '@/components/ui';
import { bulkSoftDelete, bulkArchive, bulkFavorite, getFileBlob, deleteFolder } from '@/services/file-service';
import { createZipArchive } from '@/services/compression/compression-service';
import type { Folder, DocFile, SortOption } from '@/types';
import { formatRelativeDate } from '@/utils';
import toast from 'react-hot-toast';

function sortFolders(folders: Folder[], sort: SortOption): Folder[] {
  const sorted = [...folders];
  switch (sort) {
    case 'newest':
      return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case 'oldest':
      return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    case 'recently-modified':
      return sorted.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
    case 'a-z':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'z-a':
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    default:
      return sorted;
  }
}

function sortFiles(files: DocFile[], sort: SortOption): DocFile[] {
  const sorted = [...files];
  switch (sort) {
    case 'newest':
      return sorted.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    case 'oldest':
      return sorted.sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());
    case 'largest':
      return sorted.sort((a, b) => b.size - a.size);
    case 'smallest':
      return sorted.sort((a, b) => a.size - b.size);
    case 'a-z':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'z-a':
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case 'extension':
      return sorted.sort((a, b) => a.extension.localeCompare(b.extension));
    case 'recently-modified':
      return sorted.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
    default:
      return sorted;
  }
}

export const FavoritesPage: React.FC = () => {
  const viewMode = useAppStore((s) => s.viewMode);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const sortOption = useAppStore((s) => s.sortOption);

  const navigate = useNavigate();
  const confirm = useConfirmStore();
  const folders = useAppStore((s) => s.folders) ?? [];
  const documents = useAppStore((s) => s.documents);
  const selectedIds = useAppStore((s) => s.selectedIds);
  const selectionMode = useAppStore((s) => s.selectionMode);
  const clearSelection = useAppStore((s) => s.clearSelection);
  const setSelectionMode = useAppStore((s) => s.setSelectionMode);
  const selectAll = useAppStore((s) => s.selectAll);
  const toggleSelection = useAppStore((s) => s.toggleSelection);

  // Clear selections on unmount
  React.useEffect(() => {
    return () => {
      clearSelection();
      setSelectionMode(false);
    };
  }, [clearSelection, setSelectionMode]);

  const favFolders = useMemo(() => folders.filter((f) => f.isDeleted !== 1 && f.isFavorite === 1 && f.isArchived !== 1), [folders]);
  const favFiles = useMemo(() => documents.filter((d) => d.isDeleted === 0 && d.isFavorite === 1 && d.isArchived !== 1), [documents]);

  const displayFolders = useMemo(() => {
    let filtered = favFolders;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = favFolders.filter((f) => f.name.toLowerCase().includes(q));
    }
    return sortFolders(filtered, sortOption);
  }, [favFolders, searchQuery, sortOption]);

  const displayFiles = useMemo(() => {
    let filtered = favFiles;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = favFiles.filter((f) => f.name.toLowerCase().includes(q));
    }
    return sortFiles(filtered, sortOption);
  }, [favFiles, searchQuery, sortOption]);

  const currentItems = useMemo(() => {
    return [
      ...displayFolders.map((f) => ({ id: f.id, type: 'folder' })),
      ...displayFiles.map((d) => ({ id: d.id, type: 'file' })),
    ];
  }, [displayFolders, displayFiles]);

  const loading = false;

  const getFilesFromFolder = (folderId: string): string[] => {
    const fileIds: string[] = [];
    documents.forEach((d) => {
      if (d.folderId === folderId) fileIds.push(d.id);
    });
    folders.forEach((sub) => {
      if (sub.parentId === folderId) fileIds.push(...getFilesFromFolder(sub.id));
    });
    return fileIds;
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    const selectedArray = Array.from(selectedIds);
    const fileIds = selectedArray.filter((id) => documents.some((d) => d.id === id));
    const folderIds = selectedArray.filter((id) => folders.some((f) => f.id === id));
    const totalCount = fileIds.length + folderIds.length;

    confirm.triggerConfirm({
      title: 'Move to Trash',
      message: `Are you sure you want to move ${totalCount} selected item${totalCount > 1 ? 's' : ''} to the trash?${folderIds.length > 0 ? ' All files inside the selected folders will also be moved to trash.' : ''}`,
      confirmText: 'Move to Trash',
      variant: 'danger',
      onConfirm: async () => {
        if (fileIds.length > 0) {
          await bulkSoftDelete(fileIds);
        }
        if (folderIds.length > 0) {
          await fetch('/api/folders/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: folderIds }),
          });
        }
        toast.success(`Moved selected items to trash`);
        clearSelection();
        await useAppStore.getState().fetchData();
      },
    });
  };

  const handleBulkFavorite = async () => {
    if (selectedIds.size === 0) return;
    const selectedArray = Array.from(selectedIds);
    const fileIds = selectedArray.filter((id) => documents.some((d) => d.id === id));
    const folderIds = selectedArray.filter((id) => folders.some((f) => f.id === id));

    if (fileIds.length > 0) {
      await bulkFavorite(fileIds, 0);
    }
    for (const id of folderIds) {
      await fetch(`/api/folders/${id}/favorite`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: 0 }),
      });
    }
    toast.success(`Removed selected items from favorites`);
    clearSelection();
    await useAppStore.getState().fetchData();
  };

  const handleBulkArchive = () => {
    if (selectedIds.size === 0) return;
    const selectedArray = Array.from(selectedIds);
    const fileIds = selectedArray.filter((id) => documents.some((d) => d.id === id));
    const folderIds = selectedArray.filter((id) => folders.some((f) => f.id === id));
    const totalCount = fileIds.length + folderIds.length;

    confirm.triggerConfirm({
      title: 'Archive Items',
      message: `Are you sure you want to archive ${totalCount} selected item${totalCount > 1 ? 's' : ''}?${folderIds.length > 0 ? ' All files inside the selected folders will also be archived.' : ''} They will be moved to the secure archive vault.`,
      confirmText: 'Archive',
      variant: 'primary',
      onConfirm: async () => {
        if (fileIds.length > 0) {
          await bulkArchive(fileIds, 1);
        }
        for (const id of folderIds) {
          await fetch(`/api/folders/${id}/archive`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isArchived: 1 }),
          });
        }
        toast.success(`Archived selected items`);
        clearSelection();
        await useAppStore.getState().fetchData();
      },
    });
  };

  const handleBulkDownload = async () => {
    if (selectedIds.size === 0) return;
    toast.loading('Preparing download...', { id: 'bulk-dl' });
    const fileList: { name: string; blob: Blob }[] = [];
    const selectedArray = Array.from(selectedIds);

    const allFileIds = new Set<string>();
    selectedArray.forEach((id) => {
      if (documents.some((d) => d.id === id)) {
        allFileIds.add(id);
      } else if (folders.some((f) => f.id === id)) {
        getFilesFromFolder(id).forEach((fid) => allFileIds.add(fid));
      }
    });

    for (const id of allFileIds) {
      const doc = documents.find((f) => f.id === id);
      const blob = await getFileBlob(id);
      if (doc && blob) fileList.push({ name: doc.name, blob });
    }
    if (fileList.length > 0) {
      const zip = await createZipArchive(fileList);
      const url = URL.createObjectURL(zip);
      const a = document.createElement('a');
      a.href = url;
      a.download = `docvault-favorites-${fileList.length}files.zip`;
      a.click();
      URL.revokeObjectURL(url);
    }
    toast.success(`Downloaded ${fileList.length} files`, { id: 'bulk-dl' });
    clearSelection();
  };

  const FolderCardWithContext: React.FC<{ folder: Folder }> = ({ folder }) => {
    const contextMenuRef = React.useRef<ContextMenuRef>(null);
    const isSelected = selectedIds.has(folder.id);

    const items: ContextMenuItem[] = [
      {
        label: 'Open',
        icon: <Eye className="w-4 h-4" />,
        onClick: () => navigate(`/folders/${folder.id}`),
      },
      {
        label: 'Download',
        icon: <Download className="w-4 h-4" />,
        onClick: async () => {
          const fileIds = getFilesFromFolder(folder.id);
          if (fileIds.length === 0) {
            toast.error('Folder is empty');
            return;
          }
          toast.loading('Preparing download...', { id: 'folder-dl' });
          const filesList: { name: string; blob: Blob }[] = [];
          for (const id of fileIds) {
            const doc = documents.find((f) => f.id === id);
            const blob = await getFileBlob(id);
            if (doc && blob) filesList.push({ name: doc.name, blob });
          }
          if (filesList.length > 0) {
            const zip = await createZipArchive(filesList);
            const url = URL.createObjectURL(zip);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${folder.name}.zip`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success(`Downloaded ${folder.name}`, { id: 'folder-dl' });
          } else {
            toast.error('Could not retrieve file data', { id: 'folder-dl' });
          }
        },
      },
      {
        label: 'Unfavorite',
        icon: <Star className="w-4 h-4 text-amber-400 fill-amber-400" />,
        onClick: async () => {
          await fetch(`/api/folders/${folder.id}/favorite`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isFavorite: 0 }),
          });
          toast.success('Removed from favorites');
          await useAppStore.getState().fetchData();
        },
      },
      {
        label: 'Archive',
        icon: <Archive className="w-4 h-4" />,
        onClick: () => {
          confirm.triggerConfirm({
            title: 'Archive Folder',
            message: `Are you sure you want to archive "${folder.name}"? All files and folders inside will be archived as well. They will be moved to the secure archive vault.`,
            confirmText: 'Archive',
            variant: 'primary',
            onConfirm: async () => {
              await fetch(`/api/folders/${folder.id}/archive`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isArchived: 1 }),
              });
              toast.success('Archived folder');
              await useAppStore.getState().fetchData();
            },
          });
        },
        divider: true,
      },
      {
        label: 'Move to Trash',
        icon: <Trash2 className="w-4 h-4" />,
        onClick: () => {
          confirm.triggerConfirm({
            title: 'Move to Trash',
            message: `Are you sure you want to move "${folder.name}" to the trash? All files and folders inside will be moved to the trash as well.`,
            confirmText: 'Move to Trash',
            variant: 'danger',
            onConfirm: async () => {
              await deleteFolder(folder.id);
              toast.success('Folder moved to trash');
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
        {viewMode === 'grid' ? (
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
              <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 flex items-center gap-1">
                <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" /> Favorite Folder
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClick}
            className={`flex items-center gap-4 px-4 py-3 border-b border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer group select-none
              ${isSelected ? 'bg-[var(--accent-dim)]' : ''}`}
          >
            {selectionMode && (
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors
                ${isSelected ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--text-tertiary)]'}`}
              >
                {isSelected && <span className="text-white text-xs font-bold">✓</span>}
              </div>
            )}

            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)]">
                <FolderIcon className="w-5 h-5 fill-[var(--accent)]" />
              </div>
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 absolute -top-1 -right-1 drop-shadow" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{folder.name}</p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {folders.filter((f) => f.parentId === folder.id).length} folders •{' '}
                {documents.filter((d) => d.folderId === folder.id && d.isDeleted === 0).length} files
              </p>
            </div>

            <span className="text-xs text-[var(--text-secondary)] w-20 text-right hidden sm:block">
              —
            </span>

            <span className="text-xs text-[var(--text-tertiary)] uppercase font-medium w-12 text-center hidden md:block">
              Folder
            </span>

            <span className="text-xs text-[var(--text-tertiary)] w-20 text-right hidden lg:block">
              {formatRelativeDate(folder.createdAt)}
            </span>

            {!selectionMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  contextMenuRef.current?.showMenu(e);
                }}
                className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[var(--bg-tertiary)] transition-all cursor-pointer flex-shrink-0 ml-auto"
                title="Folder actions"
              >
                <MoreVertical className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
            )}
          </motion.div>
        )}
      </ContextMenu>
    );
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
            Favorites
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {loading ? 'Loading...' : `${displayFolders.length} folders, ${displayFiles.length} files`}
          </p>
        </div>
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
              onClick={handleBulkDownload}
              icon={<Download className="w-3.5 h-3.5" />}
            >
              Download
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBulkFavorite}
              icon={<Star className="w-3.5 h-3.5 text-amber-400" />}
            >
              Remove Favorite
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBulkArchive}
              icon={<Archive className="w-3.5 h-3.5" />}
            >
              Archive
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleBulkDelete}
              icon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete
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
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {displayFolders.map((folder) => (
                <FolderCardWithContext key={folder.id} folder={folder} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col border border-[var(--border-color)] rounded-2xl overflow-hidden glass-strong divide-y divide-[var(--border-color)]">
              {displayFolders.map((folder) => (
                <FolderCardWithContext key={folder.id} folder={folder} />
              ))}
            </div>
          )}
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
          <FileGrid files={displayFiles} loading={loading} />
        ) : (
          <FileList files={displayFiles} loading={loading} />
        )}
      </div>

      {!loading && currentItems.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
            <Star className="w-10 h-10 text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No favorites yet</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Star files and folders to add them to your favorites
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default FavoritesPage;
