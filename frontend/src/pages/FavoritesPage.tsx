import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Star, CheckSquare, X, Download, Archive, Trash2 } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { FileGrid, FileList } from '@/components/files';
import { Button } from '@/components/ui';
import { bulkSoftDelete, bulkArchive, bulkFavorite, getFileBlob } from '@/services/file-service';
import { createZipArchive } from '@/services/compression/compression-service';
import toast from 'react-hot-toast';

const FavoritesPage: React.FC = () => {
  const viewMode = useAppStore((s) => s.viewMode);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const sortOption = useAppStore((s) => s.sortOption);

  const selectedIds = useAppStore((s) => s.selectedIds);
  const selectionMode = useAppStore((s) => s.selectionMode);
  const clearSelection = useAppStore((s) => s.clearSelection);
  const setSelectionMode = useAppStore((s) => s.setSelectionMode);
  const selectAll = useAppStore((s) => s.selectAll);

  // Clear selections on unmount
  React.useEffect(() => {
    return () => {
      clearSelection();
      setSelectionMode(false);
    };
  }, [clearSelection, setSelectionMode]);

  const documents = useAppStore((s) => s.documents);
  const favorites = useMemo(() => documents.filter((d) => d.isDeleted === 0 && d.isFavorite === 1), [documents]);

  const files = useMemo(() => {
    if (!favorites) return [];
    let result = favorites;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(q));
    }
    return result;
  }, [favorites, searchQuery, sortOption]);

  const loading = false;

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    await bulkSoftDelete(Array.from(selectedIds));
    toast.success(`${selectedIds.size} files moved to trash`);
    clearSelection();
  };

  const handleBulkFavorite = async () => {
    if (selectedIds.size === 0) return;
    await bulkFavorite(Array.from(selectedIds), 0);
    toast.success(`Removed ${selectedIds.size} files from favorites`);
    clearSelection();
  };

  const handleBulkArchive = async () => {
    if (selectedIds.size === 0) return;
    await bulkArchive(Array.from(selectedIds), 1);
    toast.success(`Archived ${selectedIds.size} files`);
    clearSelection();
  };

  const handleBulkDownload = async () => {
    if (selectedIds.size === 0) return;
    toast.loading('Preparing download...', { id: 'bulk-dl' });
    const fileList: { name: string; blob: Blob }[] = [];
    for (const id of selectedIds) {
      const doc = documents.find((f) => f.id === id);
      const blob = await getFileBlob(id);
      if (doc && blob) fileList.push({ name: doc.name, blob });
    }
    if (fileList.length > 0) {
      const zip = await createZipArchive(fileList);
      const url = URL.createObjectURL(zip);
      const a = document.createElement('a');
      a.href = url;
      a.download = `docvault-${fileList.length}files.zip`;
      a.click();
      URL.revokeObjectURL(url);
    }
    toast.success(`Downloaded ${fileList.length} files`, { id: 'bulk-dl' });
    clearSelection();
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
            {loading ? 'Loading...' : `${files.length} favorite files`}
          </p>
        </div>
        {files.length > 0 && !selectionMode && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectionMode(true)}
            icon={<CheckSquare className="w-3.5 h-3.5" />}
          >
            Select Files
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
              onClick={() => selectAll(files.map((f) => f.id))}
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

      {viewMode === 'grid' ? (
        <FileGrid files={files} loading={loading} />
      ) : (
        <FileList files={files} loading={loading} />
      )}

      {!loading && files.length === 0 && (
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
            Star files to add them to your favorites
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default FavoritesPage;
