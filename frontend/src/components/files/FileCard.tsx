import React, { useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Star, Download, Trash2, Copy, Edit3, Eye,
  MoreVertical, Archive, RotateCcw, FolderInput,
} from 'lucide-react';
import { ContextMenu, type ContextMenuItem, type ContextMenuRef } from '@/components/ui';
import { FileIcon } from './FileIcon';
import { useAppStore } from '@/store/app-store';
import { formatBytes, formatRelativeDate } from '@/utils';
import { toggleFavorite, softDeleteDocument, duplicateDocument, permanentDeleteDocument, restoreDocument, archiveDocument, unarchiveDocument } from '@/services/file-service';
import type { DocFile } from '@/types';
import toast from 'react-hot-toast';
import { useConfirmStore } from '@/store/confirm-store';
interface FileCardProps {
  file: DocFile;
  isTrash?: boolean;
}

export const FileCard: React.FC<FileCardProps> = ({ file, isTrash = false }) => {
  const setPreviewFileId = useAppStore((s) => s.setPreviewFileId);
  const setDownloadDialogFileId = useAppStore((s) => s.setDownloadDialogFileId);
  const setRenameDialogFileId = useAppStore((s) => s.setRenameDialogFileId);
  const selectedIds = useAppStore((s) => s.selectedIds);
  const selectionMode = useAppStore((s) => s.selectionMode);
  const toggleSelection = useAppStore((s) => s.toggleSelection);

  const isSelected = selectedIds.has(file.id);
  const contextMenuRef = useRef<ContextMenuRef>(null);
  const confirm = useConfirmStore();

  const handleRestore = async () => {
    await restoreDocument(file.id);
    toast.success('Restored file');
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
      { label: file.isFavorite === 1 ? 'Unfavorite' : 'Favorite', icon: <Star />, onClick: () => { toggleFavorite(file.id); toast.success(file.isFavorite === 1 ? 'Removed from favorites' : 'Added to favorites'); } },
      { label: file.isArchived === 1 ? 'Unarchive' : 'Archive', icon: <Archive />, onClick: handleArchiveToggle },
      { label: 'Move to Trash', icon: <Trash2 />, onClick: handleSoftDelete, variant: 'danger', divider: true },
    ];
  }, [file, isTrash, setPreviewFileId, setDownloadDialogFileId, setRenameDialogFileId]);

  const handleClick = (e: React.MouseEvent) => {
    if (selectionMode) {
      e.preventDefault();
      toggleSelection(file.id);
    } else {
      setPreviewFileId(file.id);
    }
  };

  return (
    <ContextMenu ref={contextMenuRef} items={contextMenuItems}>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        onClick={handleClick}
        className={`glass-card p-4 cursor-pointer group relative select-none
          ${isSelected ? 'ring-2 ring-[var(--accent)] bg-[var(--accent-dim)]' : ''}`}
      >
        {/* Selection Checkbox */}
        {selectionMode && (
          <div className={`absolute top-3 left-3 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors
            ${isSelected ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--text-tertiary)]'}`}
          >
            {isSelected && <span className="text-white text-xs font-bold">✓</span>}
          </div>
        )}

        {/* Favorite Star */}
        {file.isFavorite === 1 && (
          <Star className="absolute top-3 right-3 w-4 h-4 text-amber-400 fill-amber-400" />
        )}

        {/* Thumbnail or Icon */}
        <div className="flex items-center justify-center h-28 mb-3 rounded-xl overflow-hidden bg-[var(--bg-tertiary)]">
          {file.thumbnailDataUrl ? (
            <img
              src={file.thumbnailDataUrl}
              alt={file.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <FileIcon extension={file.extension} size={32} />
          )}
        </div>

        {/* File Info */}
        <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate mb-0.5" title={file.name}>
          {file.name}
        </h4>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-tertiary)]">{formatBytes(file.size)}</span>
          <span className="text-xs text-[var(--text-tertiary)] uppercase font-medium">
            {file.extension || 'FILE'}
          </span>
        </div>
        <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
          {formatRelativeDate(file.uploadedAt)}
        </p>

        {/* Hover Actions */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          {!isTrash ? (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setDownloadDialogFileId(file.id); }}
                className="p-1.5 rounded-lg bg-[var(--bg-glass-strong)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                title="Download"
              >
                <Download className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); contextMenuRef.current?.showMenu(e); }}
                className="p-1.5 rounded-lg bg-[var(--bg-glass-strong)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                title="More"
              >
                <MoreVertical className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); handleRestore(); }}
                className="p-1.5 rounded-lg bg-[var(--bg-glass-strong)] hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                title="Restore File"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handlePermanentDelete(); }}
                className="p-1.5 rounded-lg bg-[var(--bg-glass-strong)] hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                title="Delete Permanently"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </motion.div>
    </ContextMenu>
  );
};
