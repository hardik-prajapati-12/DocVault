import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Files, CheckSquare, Trash2, Download, X } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { FileGrid, FileList, FloatingActionButton } from '@/components/files';
import { Button } from '@/components/ui';
import { bulkSoftDelete } from '@/services/file-service';
import { getFileBlob } from '@/services/file-service';
import { createZipArchive } from '@/services/compression/compression-service';
import { getFileTypeCategory, FILE_CATEGORIES } from '@/types';
import type { DocFile, SortOption, FilterOption } from '@/types';
import toast from 'react-hot-toast';

function filterFiles(files: DocFile[], filter: FilterOption): DocFile[] {
  if (filter === 'all') return files;
  if (filter === 'favorites') return files.filter((f) => f.isFavorite === 1);
  if (filter === 'large') return files.filter((f) => f.size > 100 * 1024 * 1024);
  if (filter === 'small') return files.filter((f) => f.size < 1024 * 1024);

  const categoryMap: Record<string, string> = {
    images: 'images',
    videos: 'videos',
    audio: 'audio',
    pdf: 'pdf',
    documents: 'documents',
    archives: 'archives',
    code: 'code',
    executables: 'executables',
  };
  const cat = categoryMap[filter];
  if (cat) {
    const exts = FILE_CATEGORIES[cat]?.extensions || [];
    return files.filter((f) => exts.includes(f.extension.toLowerCase()));
  }
  return files;
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

function searchFiles(files: DocFile[], query: string): DocFile[] {
  if (!query.trim()) return files;
  const lower = query.toLowerCase();
  return files.filter(
    (f) =>
      f.name.toLowerCase().includes(lower) ||
      f.extension.toLowerCase().includes(lower) ||
      f.mimeType.toLowerCase().includes(lower) ||
      f.tags.some((t) => t.toLowerCase().includes(lower))
  );
}

const FilesPage: React.FC = () => {
  const viewMode = useAppStore((s) => s.viewMode);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const activeFilter = useAppStore((s) => s.activeFilter);
  const sortOption = useAppStore((s) => s.sortOption);
  const selectedIds = useAppStore((s) => s.selectedIds);
  const selectionMode = useAppStore((s) => s.selectionMode);
  const clearSelection = useAppStore((s) => s.clearSelection);
  const setSelectionMode = useAppStore((s) => s.setSelectionMode);
  const selectAll = useAppStore((s) => s.selectAll);
  const setUploadModalOpen = useAppStore((s) => s.setUploadModalOpen);

  const documents = useAppStore((s) => s.documents);
  const allFiles = useMemo(() => documents.filter((d) => d.isDeleted === 0 && d.isArchived === 0 && !d.folderId), [documents]);

  const processedFiles = useMemo(() => {
    if (!allFiles) return [];
    let result = allFiles;
    result = searchFiles(result, searchQuery);
    result = filterFiles(result, activeFilter);
    result = sortFiles(result, sortOption);
    return result;
  }, [allFiles, searchQuery, activeFilter, sortOption]);

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    await bulkSoftDelete(Array.from(selectedIds));
    toast.success(`${selectedIds.size} files moved to trash`);
    clearSelection();
  };

  const handleBulkDownload = async () => {
    if (selectedIds.size === 0) return;
    toast.loading('Preparing download...', { id: 'bulk-dl' });
    const files: { name: string; blob: Blob }[] = [];
    for (const id of selectedIds) {
      const doc = allFiles?.find((f) => f.id === id);
      const blob = await getFileBlob(id);
      if (doc && blob) files.push({ name: doc.name, blob });
    }
    if (files.length > 0) {
      const zip = await createZipArchive(files);
      const url = URL.createObjectURL(zip);
      const a = document.createElement('a');
      a.href = url;
      a.download = `docvault-${files.length}files.zip`;
      a.click();
      URL.revokeObjectURL(url);
    }
    toast.success(`Downloaded ${files.length} files`, { id: 'bulk-dl' });
    clearSelection();
  };

  const loading = allFiles === undefined;

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Files className="w-6 h-6 text-[var(--accent)]" />
            All Files
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {loading ? 'Loading...' : `${processedFiles.length} files`}
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
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
              onClick={() => selectAll(processedFiles.map((f) => f.id))}
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

      {/* File View */}
      {viewMode === 'grid' ? (
        <FileGrid files={processedFiles} loading={loading} />
      ) : (
        <FileList files={processedFiles} loading={loading} />
      )}

      {/* Empty State */}
      {!loading && processedFiles.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-[var(--accent-dim)] flex items-center justify-center mb-4">
            <Files className="w-10 h-10 text-[var(--accent)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
            {searchQuery ? 'No files found' : 'No files yet'}
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            {searchQuery
              ? 'Try a different search term or filter'
              : 'Upload your first files to get started'}
          </p>
          {!searchQuery && (
            <Button onClick={() => setUploadModalOpen(true)}>
              Upload Files
            </Button>
          )}
        </motion.div>
      )}

      <FloatingActionButton />
    </div>
  );
};

export default FilesPage;
