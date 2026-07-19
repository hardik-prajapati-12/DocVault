import React, { useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder as FolderIcon,
  FolderPlus,
  ChevronRight,
  Trash2,
  Edit3,
  MoreVertical,
  FolderOpen,
  Upload
} from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useConfirmStore } from '@/store/confirm-store';
import { createFolder, renameFolder, deleteFolder } from '@/services/file-service';
import { FileGrid, FileList, FloatingActionButton } from '@/components/files';
import { Button, Modal, ContextMenu, type ContextMenuItem, type ContextMenuRef } from '@/components/ui';
import type { Folder, DocFile } from '@/types';
import toast from 'react-hot-toast';

export const FoldersPage: React.FC = () => {
  const { folderId } = useParams<{ folderId?: string }>();
  const navigate = useNavigate();
  const confirm = useConfirmStore();
  const setActiveFolderId = useAppStore((s) => s.setActiveFolderId);
  const setUploadModalOpen = useAppStore((s) => s.setUploadModalOpen);

  const folders = useAppStore((s) => s.folders) ?? [];
  const documents = useAppStore((s) => s.documents) ?? [];
  const viewMode = useAppStore((s) => s.viewMode);

  // Sync active folder with store for global file uploads
  React.useEffect(() => {
    setActiveFolderId(folderId || null);
    return () => setActiveFolderId(null);
  }, [folderId, setActiveFolderId]);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameFolderName, setRenameFolderName] = useState('');
  const [folderToRename, setFolderToRename] = useState<Folder | null>(null);

  const currentParentId = folderId || null;

  // Filter folders and files matching active parent
  const currentFolders = useMemo(() => {
    return folders.filter((f) => f.parentId === currentParentId);
  }, [folders, currentParentId]);

  const currentFiles = useMemo(() => {
    // Only display files inside a folder. Do not display files at root Folders view.
    if (!folderId) return [];
    return documents.filter(
      (d) => d.folderId === currentParentId && d.isDeleted === 0 && d.isArchived === 0
    );
  }, [documents, currentParentId, folderId]);

  // Active folder details
  const currentFolder = useMemo(() => {
    if (!currentParentId) return null;
    return folders.find((f) => f.id === currentParentId) || null;
  }, [folders, currentParentId]);

  // Breadcrumbs calculation
  const breadcrumbs = useMemo(() => {
    const list: Folder[] = [];
    let curr = currentFolder;
    while (curr) {
      list.unshift(curr);
      curr = curr.parentId ? (folders.find((f) => f.id === curr!.parentId) || null) : null;
    }
    return list;
  }, [folders, currentFolder]);

  // Create Folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const newId = await createFolder(newFolderName.trim(), currentParentId);
      toast.success('Folder created');
      setNewFolderName('');
      setIsCreateOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create folder');
    }
  };

  // Rename Folder
  const handleRenameFolder = async () => {
    if (!folderToRename || !renameFolderName.trim()) return;
    try {
      await renameFolder(folderToRename.id, renameFolderName.trim());
      toast.success('Folder renamed');
      setFolderToRename(null);
      setRenameFolderName('');
      setIsRenameOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to rename folder');
    }
  };

  // Delete Folder (Files inside folder will be moved to root)
  const handleDeleteFolder = (folder: Folder) => {
    confirm.triggerConfirm({
      title: 'Delete Folder',
      message: `Are you sure you want to delete "${folder.name}"? The files inside this folder will be moved to the root files tab.`,
      confirmText: 'Delete Folder',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteFolder(folder.id);
          toast.success('Folder deleted');
          if (folderId === folder.id) {
            navigate('/folders');
          }
        } catch (err: any) {
          toast.error(err.message || 'Failed to delete folder');
        }
      },
    });
  };

  // Context Menu builder helper
  const FolderCardWithContext: React.FC<{ folder: Folder }> = ({ folder }) => {
    const contextMenuRef = useRef<ContextMenuRef>(null);

    const items: ContextMenuItem[] = [
      {
        label: 'Rename',
        icon: <Edit3 className="w-4 h-4" />,
        onClick: () => {
          setFolderToRename(folder);
          setRenameFolderName(folder.name);
          setIsRenameOpen(true);
        },
      },
      {
        label: 'Delete',
        icon: <Trash2 className="w-4 h-4" />,
        onClick: () => handleDeleteFolder(folder),
        variant: 'danger',
      },
    ];

    return (
      <ContextMenu ref={contextMenuRef} items={items}>
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          onClick={() => navigate(`/folders/${folder.id}`)}
          className="glass-card p-4 cursor-pointer group relative flex flex-col justify-between h-32 select-none hover:ring-2 hover:ring-[var(--accent)] transition-all"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)]">
              <FolderIcon className="w-5 h-5 fill-[var(--accent)]" />
            </div>
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
          </div>
          <div className="mt-2 min-w-0">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate" title={folder.name}>
              {folder.name}
            </h4>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
              {folders.filter((f) => f.parentId === folder.id).length} folders •{' '}
              {documents.filter((d) => d.folderId === folder.id && d.isDeleted === 0).length} files
            </p>
          </div>
        </motion.div>
      </ContextMenu>
    );
  };

  const isEmpty = currentFolders.length === 0 && currentFiles.length === 0;

  return (
    <div className="animate-fade-in pb-16">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-sm font-medium">
          <Link
            to="/folders"
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors whitespace-nowrap"
          >
            <FolderOpen className="w-4 h-4 text-[var(--accent)]" />
            Folders
          </Link>

          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.id}>
              <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
              {idx === breadcrumbs.length - 1 ? (
                <span className="text-[var(--text-primary)] font-semibold truncate max-w-[120px] sm:max-w-[200px]">
                  {crumb.name}
                </span>
              ) : (
                <Link
                  to={`/folders/${crumb.id}`}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors truncate max-w-[100px]"
                >
                  {crumb.name}
                </Link>
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="flex gap-2.5 self-start sm:self-auto">
          {folderId && (
            <Button
              onClick={() => setUploadModalOpen(true)}
              icon={<Upload className="w-4 h-4" />}
              variant="secondary"
            >
              Upload Files
            </Button>
          )}
          <Button
            onClick={() => setIsCreateOpen(true)}
            icon={<FolderPlus className="w-4 h-4" />}
          >
            New Folder
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      {isEmpty ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-[var(--accent-dim)] flex items-center justify-center mb-4">
            <FolderIcon className="w-10 h-10 text-[var(--accent)] fill-[var(--accent)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
            {currentFolder ? 'Folder is empty' : 'No folders yet'}
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-sm">
            {currentFolder
              ? 'Upload files or drag folders here to add them to this directory.'
              : 'Create a new folder or drag directories directly onto this page to start organizing.'}
          </p>
          {currentFolder ? (
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => setIsCreateOpen(true)}
                icon={<FolderPlus className="w-4 h-4" />}
                variant="secondary"
              >
                Create Folder
              </Button>
              <Button
                onClick={() => setUploadModalOpen(true)}
                icon={<Upload className="w-4 h-4" />}
              >
                Upload Files
              </Button>
            </div>
          ) : (
            <Button onClick={() => setIsCreateOpen(true)} icon={<FolderPlus className="w-4 h-4" />}>
              Create Folder
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-8">
          {/* Folders Section */}
          {currentFolders.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">
                Folders ({currentFolders.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                <AnimatePresence mode="popLayout">
                  {currentFolders.map((folder) => (
                    <FolderCardWithContext key={folder.id} folder={folder} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Files Section */}
          {currentFiles.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">
                Files ({currentFiles.length})
              </h3>
              {viewMode === 'grid' ? (
                <FileGrid files={currentFiles} loading={false} />
              ) : (
                <FileList files={currentFiles} loading={false} />
              )}
            </div>
          )}
        </div>
      )}

      {/* Create Folder Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => { setIsCreateOpen(false); setNewFolderName(''); }} title="New Folder" maxWidth="max-w-sm">
        <div className="space-y-4">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFolder();
            }}
            className="input-glass w-full"
            autoFocus
            placeholder="Folder Name"
          />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => { setIsCreateOpen(false); setNewFolderName(''); }}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create
            </Button>
          </div>
        </div>
      </Modal>

      {/* Rename Folder Modal */}
      <Modal isOpen={isRenameOpen} onClose={() => { setIsRenameOpen(false); setFolderToRename(null); setRenameFolderName(''); }} title="Rename Folder" maxWidth="max-w-sm">
        <div className="space-y-4">
          <input
            type="text"
            value={renameFolderName}
            onChange={(e) => setRenameFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameFolder();
            }}
            className="input-glass w-full"
            autoFocus
            placeholder="Folder Name"
          />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => { setIsRenameOpen(false); setFolderToRename(null); setRenameFolderName(''); }}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleRenameFolder} disabled={!renameFolderName.trim()}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <FloatingActionButton />
    </div>
  );
};

export default FoldersPage;
