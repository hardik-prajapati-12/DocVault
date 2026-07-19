import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, CheckSquare, RotateCcw, X } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { FileGrid, FileList } from '@/components/files';
import { Button, ConfirmDialog } from '@/components/ui';
import { emptyTrash, bulkRestore, bulkPermanentDelete } from '@/services/file-service';
import toast from 'react-hot-toast';

const TrashPage: React.FC = () => {
  const viewMode = useAppStore((s) => s.viewMode);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const selectedIds = useAppStore((s) => s.selectedIds);
  const selectionMode = useAppStore((s) => s.selectionMode);
  const clearSelection = useAppStore((s) => s.clearSelection);
  const setSelectionMode = useAppStore((s) => s.setSelectionMode);
  const selectAll = useAppStore((s) => s.selectAll);

  // Clear selections on transition
  React.useEffect(() => {
    return () => {
      clearSelection();
      setSelectionMode(false);
    };
  }, [clearSelection, setSelectionMode]);

  const documents = useAppStore((s) => s.documents);
  const trashedFiles = useMemo(() => documents.filter((d) => d.isDeleted === 1), [documents]);

  const files = useMemo(() => {
    if (!trashedFiles) return [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return trashedFiles.filter((f) => f.name.toLowerCase().includes(q));
    }
    return trashedFiles;
  }, [trashedFiles, searchQuery]);

  const loading = false;

  const handleEmptyTrash = async () => {
    await emptyTrash();
    toast.success('Trash emptied');
    setConfirmEmpty(false);
  };

  const handleBulkRestore = async () => {
    if (selectedIds.size === 0) return;
    await bulkRestore(Array.from(selectedIds));
    toast.success(`Restored ${selectedIds.size} files`);
    clearSelection();
  };

  const handleBulkPermanentDelete = async () => {
    if (selectedIds.size === 0) return;
    await bulkPermanentDelete(Array.from(selectedIds));
    toast.success(`Permanently deleted ${selectedIds.size} files`);
    clearSelection();
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
            {loading ? 'Loading...' : `${files.length} deleted files`}
          </p>
        </div>
        <div className="flex gap-2.5">
          {files.length > 0 && (
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
              {selectionMode ? 'Close Selection' : 'Select Files'}
            </Button>
          )}
          {files.length > 0 && !selectionMode && (
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
              onClick={() => selectAll(files.map((f) => f.id))}
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

      {viewMode === 'grid' ? (
        <FileGrid files={files} loading={loading} isTrash />
      ) : (
        <FileList files={files} loading={loading} isTrash />
      )}

      {!loading && files.length === 0 && (
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
            Deleted files will appear here
          </p>
        </motion.div>
      )}

      <ConfirmDialog
        isOpen={confirmEmpty}
        onClose={() => setConfirmEmpty(false)}
        onConfirm={handleEmptyTrash}
        title="Empty Trash"
        message="This will permanently delete all files in the trash. This action cannot be undone."
        confirmText="Empty Trash"
        variant="danger"
      />
    </div>
  );
};

export default TrashPage;
