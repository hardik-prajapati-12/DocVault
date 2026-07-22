import React, { useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Virtuoso } from 'react-virtuoso';
import {
  Star, Download, Trash2, MoreVertical, Archive, FolderInput, Eye, Edit3, Copy, RotateCcw
} from 'lucide-react';
import { FileIcon } from './FileIcon';
import { FileListSkeleton, ContextMenu, type ContextMenuItem, type ContextMenuRef } from '@/components/ui';
import { useAppStore } from '@/store/app-store';
import { formatBytes, formatRelativeDate } from '@/utils';
import { toggleFavorite, softDeleteDocument, restoreDocument, permanentDeleteDocument, archiveDocument, unarchiveDocument, duplicateDocument } from '@/services/file-service';
import type { DocFile } from '@/types';
import toast from 'react-hot-toast';
import { useConfirmStore } from '@/store/confirm-store';

interface FileListProps {
  files: DocFile[];
  loading?: boolean;
  isTrash?: boolean;
}

const FileListRow: React.FC<{ file: DocFile; isTrash: boolean }> = ({ file, isTrash }) => {
  const setPreviewFileId = useAppStore((s) => s.setPreviewFileId);
  const setDownloadDialogFileId = useAppStore((s) => s.setDownloadDialogFileId);
  const setRenameDialogFileId = useAppStore((s) => s.setRenameDialogFileId);
  const setMoveDialogFileId = useAppStore((s) => s.setMoveDialogFileId);
  const selectedIds = useAppStore((s) => s.selectedIds);
  const selectionMode = useAppStore((s) => s.selectionMode);
  const toggleSelection = useAppStore((s) => s.toggleSelection);
  const confirm = useConfirmStore();
  const contextMenuRef = useRef<ContextMenuRef>(null);

  const handleRestore = () => {
    confirm.triggerConfirm({
      title: 'Recover Document',
      message: `Are you sure you want to recover "${file.name}" from the trash?`,
      confirmText: 'Recover',
      variant: 'success',
      onConfirm: async () => {
        await restoreDocument(file.id);
        toast.success('Document recovered');
      },
    });
  };

  const handleSoftDelete = () => {
    confirm.triggerConfirm({
      title: 'Move to Trash',
      message: `Are you sure you want to move "${file.name}" to the trash?`,
      confirmText: 'Move to Trash',
      variant: 'danger',
      onConfirm: async () => {
        await softDeleteDocument(file.id);
        toast.success('Moved to trash');
      },
    });
  };

  const handlePermanentDelete = () => {
    confirm.triggerConfirm({
      title: 'Delete Permanently',
      message: `Are you sure you want to permanently delete "${file.name}"? This action cannot be undone.`,
      confirmText: 'Delete Permanently',
      variant: 'danger',
      onConfirm: async () => {
        await permanentDeleteDocument(file.id);
        toast.success('Permanently deleted');
      },
    });
  };

  const handleArchiveToggle = () => {
    const isArchived = file.isArchived === 1;
    confirm.triggerConfirm({
      title: isArchived ? 'Unarchive File' : 'Archive File',
      message: `Are you sure you want to ${isArchived ? 'unarchive' : 'archive'} "${file.name}"?${!isArchived ? ' It will be moved to the secure archive vault.' : ' It will be moved back to the main view.'}`,
      confirmText: isArchived ? 'Unarchive' : 'Archive',
      variant: 'primary',
      onConfirm: async () => {
        if (isArchived) {
          await unarchiveDocument(file.id);
          toast.success('Unarchived');
        } else {
          await archiveDocument(file.id);
          toast.success('Archived');
        }
      },
    });
  };

  const contextMenuItems = useMemo<ContextMenuItem[]>(() => {
    if (isTrash) {
      return [
        { label: 'Restore', icon: <RotateCcw />, onClick: handleRestore },
        { label: 'Delete Permanently', icon: <Trash2 />, onClick: handlePermanentDelete, variant: 'danger', divider: true },
      ];
    }
    return [
      { label: 'Preview', icon: <Eye />, onClick: () => setPreviewFileId(file.id) },
      { label: 'Download', icon: <Download />, onClick: () => setDownloadDialogFileId(file.id) },
      { label: 'Rename', icon: <Edit3 />, onClick: () => setRenameDialogFileId(file.id), divider: true },
      { label: 'Duplicate', icon: <Copy />, onClick: async () => { await duplicateDocument(file.id); toast.success('Duplicated'); } },
      { label: 'Move to Folder', icon: <FolderInput />, onClick: () => setMoveDialogFileId(file.id) },
      { label: file.isFavorite === 1 ? 'Unfavorite' : 'Favorite', icon: <Star />, onClick: () => { toggleFavorite(file.id); toast.success(file.isFavorite === 1 ? 'Removed from favorites' : 'Added to favorites'); } },
      { label: file.isArchived === 1 ? 'Unarchive' : 'Archive', icon: <Archive />, onClick: handleArchiveToggle },
      { label: 'Move to Trash', icon: <Trash2 />, onClick: handleSoftDelete, variant: 'danger', divider: true },
    ];
  }, [file, isTrash, setPreviewFileId, setDownloadDialogFileId, setRenameDialogFileId, setMoveDialogFileId]);

  const isSelected = selectedIds.has(file.id);

  const handleClick = () => {
    if (selectionMode) {
      toggleSelection(file.id);
    } else {
      setPreviewFileId(file.id);
    }
  };

  return (
    <ContextMenu ref={contextMenuRef} items={contextMenuItems}>
      <motion.div
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClick}
        className={`flex items-center gap-4 px-4 py-3 border-b border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer group
          ${isSelected ? 'bg-[var(--accent-dim)]' : ''}`}
      >
        {/* Selection */}
        {selectionMode && (
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0
            ${isSelected ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--text-tertiary)]'}`}
          >
            {isSelected && <span className="text-white text-xs font-bold">✓</span>}
          </div>
        )}

        {/* Icon */}
        <FileIcon extension={file.extension} size={18} />

        {/* Name */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{file.name}</p>
          <p className="text-xs text-[var(--text-tertiary)]">{file.mimeType}</p>
        </div>

        {/* Size */}
        <span className="text-xs text-[var(--text-secondary)] w-20 text-right hidden sm:block">
          {formatBytes(file.size)}
        </span>

        {/* Extension */}
        <span className="text-xs text-[var(--text-tertiary)] uppercase font-medium w-12 text-center hidden md:block">
          {file.extension || '—'}
        </span>

        {/* Date */}
        <span className="text-xs text-[var(--text-tertiary)] w-20 text-right hidden lg:block">
          {formatRelativeDate(file.uploadedAt)}
        </span>

        {/* Favorite */}
        {file.isFavorite === 1 && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />}

        {/* Actions */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {!isTrash ? (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setDownloadDialogFileId(file.id); }}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                title="Download"
              >
                <Download className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setMoveDialogFileId(file.id); }}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                title="Move to Folder"
              >
                <FolderInput className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); toggleFavorite(file.id); toast.success(file.isFavorite === 1 ? 'Unfavorited' : 'Favorited'); }}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                title="Favorite"
              >
                <Star className={`w-3.5 h-3.5 ${file.isFavorite === 1 ? 'text-amber-400 fill-amber-400' : 'text-[var(--text-secondary)]'}`} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleArchiveToggle(); }}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                title={file.isArchived === 1 ? 'Unarchive' : 'Archive'}
              >
                <Archive className={`w-3.5 h-3.5 ${file.isArchived === 1 ? 'text-[var(--accent)] fill-[var(--accent-dim)]' : 'text-[var(--text-secondary)]'}`} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); contextMenuRef.current?.showMenu(e); }}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                title="More"
              >
                <MoreVertical className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); handleRestore(); }}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-xs text-emerald-400 cursor-pointer"
              >
                Restore
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handlePermanentDelete(); }}
                className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </button>
            </>
          )}
        </div>
      </motion.div>
    </ContextMenu>
  );
};

export const FileList: React.FC<FileListProps> = ({ files, loading = false, isTrash = false }) => {
  const itemContent = useCallback(
    (index: number) => <FileListRow key={files[index].id} file={files[index]} isTrash={isTrash} />,
    [files, isTrash]
  );

  if (loading) {
    return (
      <div className="glass-card rounded-2xl overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => <FileListSkeleton key={i} />)}
      </div>
    );
  }

  if (files.length === 0) return null;

  if (files.length > 50) {
    return (
      <div className="glass-card rounded-2xl overflow-hidden">
        <Virtuoso
          totalCount={files.length}
          itemContent={itemContent}
          style={{ height: 'calc(100vh - 200px)' }}
          overscan={100}
        />
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <AnimatePresence>
        {files.map((file) => (
          <FileListRow key={file.id} file={file} isTrash={isTrash} />
        ))}
      </AnimatePresence>
    </div>
  );
};
