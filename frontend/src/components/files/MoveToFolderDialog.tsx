import React, { useState, useEffect, useMemo } from 'react';
import {
  Folder as FolderIcon,
  FolderPlus,
  Home,
  Search,
  ChevronRight,
  ChevronDown,
  Check,
  Layers,
} from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { useAppStore } from '@/store/app-store';
import { moveDocument, bulkMoveDocuments, createFolder } from '@/services/file-service';
import type { Folder, DocFile } from '@/types';
import toast from 'react-hot-toast';

interface FolderNodeProps {
  folder: Folder;
  allFolders: Folder[];
  documents: DocFile[];
  selectedFolderId: string | null;
  currentFolderId: string | null;
  onSelect: (folderId: string) => void;
  searchQuery: string;
  depth?: number;
}

const FolderNode: React.FC<FolderNodeProps> = ({
  folder,
  allFolders,
  documents,
  selectedFolderId,
  currentFolderId,
  onSelect,
  searchQuery,
  depth = 0,
}) => {
  const [expanded, setExpanded] = useState(true);

  // Subfolders
  const childFolders = useMemo(
    () => allFolders.filter((f) => f.parentId === folder.id && f.isDeleted !== 1),
    [allFolders, folder.id]
  );

  // Document count inside this folder
  const fileCount = useMemo(
    () => documents.filter((d) => d.folderId === folder.id && d.isDeleted === 0).length,
    [documents, folder.id]
  );

  const isSelected = selectedFolderId === folder.id;
  const isCurrentLocation = currentFolderId === folder.id;

  // Filter check if searching
  const matchesSearch = !searchQuery || folder.name.toLowerCase().includes(searchQuery.toLowerCase());
  const hasMatchingChild = useMemo(() => {
    if (!searchQuery) return false;
    const checkChildren = (fId: string): boolean => {
      const children = allFolders.filter((f) => f.parentId === fId && f.isDeleted !== 1);
      return children.some((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || checkChildren(c.id));
    };
    return checkChildren(folder.id);
  }, [allFolders, folder.id, searchQuery]);

  if (searchQuery && !matchesSearch && !hasMatchingChild) {
    return null;
  }

  return (
    <div className="select-none">
      <div
        onClick={() => onSelect(folder.id)}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        className={`flex items-center gap-2.5 py-2.5 pr-3 rounded-xl cursor-pointer transition-all duration-150 group my-0.5
          ${
            isSelected
              ? 'bg-[var(--accent)] text-white shadow-md shadow-blue-500/20 font-medium'
              : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
          }`}
      >
        {childFolders.length > 0 ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className={`p-0.5 rounded hover:bg-black/10 transition-transform ${
              isSelected ? 'text-white' : 'text-[var(--text-tertiary)]'
            }`}
          >
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <span className="w-3.5 h-3.5" />
        )}

        <FolderIcon
          className={`w-4 h-4 flex-shrink-0 ${
            isSelected ? 'text-white' : 'text-[var(--accent)]'
          }`}
        />

        <span className="text-sm truncate flex-1">{folder.name}</span>

        {isCurrentLocation && (
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider ${
              isSelected ? 'bg-white/20 text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'
            }`}
          >
            Current
          </span>
        )}

        {fileCount > 0 && !isCurrentLocation && (
          <span
            className={`text-xs ${
              isSelected ? 'text-white/80' : 'text-[var(--text-tertiary)]'
            }`}
          >
            {fileCount} {fileCount === 1 ? 'file' : 'files'}
          </span>
        )}

        {isSelected && <Check className="w-4 h-4 text-white flex-shrink-0 ml-1" />}
      </div>

      {expanded && childFolders.length > 0 && (
        <div className="flex flex-col">
          {childFolders.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              allFolders={allFolders}
              documents={documents}
              selectedFolderId={selectedFolderId}
              currentFolderId={currentFolderId}
              onSelect={onSelect}
              searchQuery={searchQuery}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const MoveToFolderDialog: React.FC = () => {
  const moveDialogFileId = useAppStore((s) => s.moveDialogFileId);
  const moveDialogFileIds = useAppStore((s) => s.moveDialogFileIds);
  const setMoveDialogFileId = useAppStore((s) => s.setMoveDialogFileId);
  const setMoveDialogFileIds = useAppStore((s) => s.setMoveDialogFileIds);

  const documents = useAppStore((s) => s.documents);
  const folders = useAppStore((s) => s.folders);
  const clearSelection = useAppStore((s) => s.clearSelection);

  const targetFiles = useMemo(() => {
    if (moveDialogFileIds.length > 0) {
      return documents.filter((d) => moveDialogFileIds.includes(d.id));
    }
    if (moveDialogFileId) {
      const doc = documents.find((d) => d.id === moveDialogFileId);
      return doc ? [doc] : [];
    }
    return [];
  }, [moveDialogFileId, moveDialogFileIds, documents]);

  const isOpen = targetFiles.length > 0;

  // Single file current folder or common current folder
  const currentFolderId = useMemo(() => {
    if (targetFiles.length === 1) {
      return targetFiles[0].folderId;
    }
    const firstFolderId = targetFiles[0]?.folderId ?? null;
    const sameFolder = targetFiles.every((f) => f.folderId === firstFolderId);
    return sameFolder ? firstFolderId : null;
  }, [targetFiles]);

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Default selection is null (Root) or if file is already in root, null
      setSelectedFolderId(currentFolderId ?? null);
      setSearchQuery('');
      setIsCreatingFolder(false);
      setNewFolderName('');
    }
  }, [isOpen, currentFolderId]);

  const handleClose = () => {
    setMoveDialogFileId(null);
    setMoveDialogFileIds([]);
  };

  // Top-level active folders
  const rootFolders = useMemo(
    () => folders.filter((f) => f.parentId === null && f.isDeleted !== 1),
    [folders]
  );

  // Active current folder name for banner context
  const currentFolderName = useMemo(() => {
    if (!currentFolderId) return 'Root Vault';
    return folders.find((f) => f.id === currentFolderId)?.name || 'Folder';
  }, [currentFolderId, folders]);

  // Active selected target folder name
  const selectedTargetName = useMemo(() => {
    if (selectedFolderId === null) return 'Root Vault';
    return folders.find((f) => f.id === selectedFolderId)?.name || 'Folder';
  }, [selectedFolderId, folders]);

  // Create folder inline
  const handleCreateFolderInline = async () => {
    if (!newFolderName.trim()) return;
    try {
      const createdId = await createFolder(newFolderName.trim(), selectedFolderId);
      toast.success(`Created folder "${newFolderName.trim()}"`);
      setNewFolderName('');
      setIsCreatingFolder(false);
      setSelectedFolderId(createdId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create folder');
    }
  };

  // Execute Move
  const handleMove = async () => {
    if (targetFiles.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const fileIds = targetFiles.map((f) => f.id);
      if (fileIds.length === 1) {
        await moveDocument(fileIds[0], selectedFolderId);
        toast.success(`Moved "${targetFiles[0].name}" to ${selectedTargetName}`);
      } else {
        await bulkMoveDocuments(fileIds, selectedFolderId);
        toast.success(`Moved ${fileIds.length} files to ${selectedTargetName}`);
      }
      clearSelection();
      handleClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to move files');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCurrentTarget = selectedFolderId === currentFolderId;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Move to Folder" maxWidth="max-w-lg">
      <div className="space-y-4">
        {/* Source File Info Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center flex-shrink-0">
              <Layers className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[var(--text-tertiary)]">Moving:</p>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                {targetFiles.length === 1
                  ? targetFiles[0].name
                  : `${targetFiles.length} files selected`}
              </h4>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-glass-strong)] border border-[var(--border-color)] text-[var(--text-secondary)] font-medium flex-shrink-0">
            From: {currentFolderName}
          </span>
        </div>

        {/* Search bar & New Folder Action */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search folders..."
              className="input-glass w-full pl-9 text-xs py-2"
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsCreatingFolder(!isCreatingFolder)}
            icon={<FolderPlus className="w-3.5 h-3.5 text-[var(--accent)]" />}
          >
            New Folder
          </Button>
        </div>

        {/* Inline Create Folder Input */}
        {isCreatingFolder && (
          <div className="flex gap-2 p-2.5 rounded-xl bg-[var(--accent-dim)] border border-[var(--accent)]/30 animate-fade-in">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolderInline();
              }}
              placeholder={`New folder inside ${selectedTargetName}...`}
              className="input-glass flex-1 text-xs py-1.5"
              autoFocus
            />
            <Button size="sm" onClick={handleCreateFolderInline} disabled={!newFolderName.trim()}>
              Create
            </Button>
          </div>
        )}

        {/* Folder Selector Container */}
        <div className="max-h-64 overflow-y-auto pr-1 space-y-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-2">
          {/* Root option */}
          {(!searchQuery || 'root vault main'.includes(searchQuery.toLowerCase())) && (
            <div
              onClick={() => setSelectedFolderId(null)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 group
                ${
                  selectedFolderId === null
                    ? 'bg-[var(--accent)] text-white shadow-md shadow-blue-500/20 font-medium'
                    : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                }`}
            >
              <Home
                className={`w-4 h-4 flex-shrink-0 ${
                  selectedFolderId === null ? 'text-white' : 'text-[var(--accent)]'
                }`}
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm">Root Vault</span>
                <span
                  className={`text-[10px] block ${
                    selectedFolderId === null ? 'text-white/80' : 'text-[var(--text-tertiary)]'
                  }`}
                >
                  All Files (No Folder)
                </span>
              </div>

              {currentFolderId === null && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider ${
                    selectedFolderId === null
                      ? 'bg-white/20 text-white'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'
                  }`}
                >
                  Current
                </span>
              )}

              {selectedFolderId === null && <Check className="w-4 h-4 text-white flex-shrink-0" />}
            </div>
          )}

          {/* Folder Tree */}
          {rootFolders.map((folder) => (
            <FolderNode
              key={folder.id}
              folder={folder}
              allFolders={folders}
              documents={documents}
              selectedFolderId={selectedFolderId}
              currentFolderId={currentFolderId}
              onSelect={(id) => setSelectedFolderId(id)}
              searchQuery={searchQuery}
            />
          ))}

          {folders.length === 0 && (
            <div className="py-8 text-center text-xs text-[var(--text-tertiary)]">
              No custom folders created yet. Click "New Folder" above to create one.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-[var(--text-tertiary)] truncate max-w-[200px]">
            Target: <strong className="text-[var(--text-primary)]">{selectedTargetName}</strong>
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleMove}
              disabled={isCurrentTarget || isSubmitting}
              icon={<ChevronRight className="w-4 h-4" />}
            >
              {isSubmitting ? 'Moving...' : `Move to ${selectedTargetName}`}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
