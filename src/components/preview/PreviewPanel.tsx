import React, { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ChevronLeft, ChevronRight, Maximize2, Star, Edit3, Trash2, FileWarning } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { getFileBlob, toggleFavorite, softDeleteDocument } from '@/services/file-service';
import { formatBytes, formatRelativeDate, isImageExtension, isVideoExtension, isAudioExtension, isTextExtension, isPdfExtension, getLanguageForExtension } from '@/utils';
import { FileIcon } from '@/components/files/FileIcon';
import toast from 'react-hot-toast';
import { useConfirmStore } from '@/store/confirm-store';

// Lazy-load heavy preview components
const SyntaxHighlighter = React.lazy(() =>
  import('react-syntax-highlighter').then((mod) => ({ default: mod.Light }))
);
const ReactMarkdown = React.lazy(() => import('react-markdown'));

export const PreviewPanel: React.FC = () => {
  const fileId = useAppStore((s) => s.previewFileId);
  const setFileId = useAppStore((s) => s.setPreviewFileId);
  const setDownloadDialogFileId = useAppStore((s) => s.setDownloadDialogFileId);
  const setRenameDialogFileId = useAppStore((s) => s.setRenameDialogFileId);
  const confirm = useConfirmStore();

  const file = useLiveQuery(() => (fileId ? db.documents.get(fileId) : undefined), [fileId]);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!fileId) {
      setObjectUrl(null);
      setTextContent(null);
      return;
    }

    setLoading(true);
    getFileBlob(fileId).then((blob) => {
      if (!blob) { setLoading(false); return; }

      const url = URL.createObjectURL(blob);
      setObjectUrl(url);

      // Load text content for text-based files
      if (file && (isTextExtension(file.extension) || file.extension === 'md' || file.extension === 'csv')) {
        blob.text().then(setTextContent).catch(() => setTextContent(null));
      }

      setLoading(false);
    });

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId, file?.extension]);

  const isOpen = !!fileId && !!file;

  // Get all non-deleted files for prev/next navigation
  const allFiles = useLiveQuery(() =>
    db.documents.where('isDeleted').equals(0).toArray()
  ) ?? [];

  const currentIndex = allFiles.findIndex((f) => f.id === fileId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allFiles.length - 1;

  const goToPrev = () => { if (hasPrev) setFileId(allFiles[currentIndex - 1].id); };
  const goToNext = () => { if (hasNext) setFileId(allFiles[currentIndex + 1].id); };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'Escape') setFileId(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, currentIndex, allFiles.length]);

  const renderPreview = () => {
    if (loading || !file || !objectUrl) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
        </div>
      );
    }

    // Images
    if (isImageExtension(file.extension)) {
      return (
        <div className="flex items-center justify-center h-full p-4">
          <img src={objectUrl} alt={file.name} className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      );
    }

    // Videos
    if (isVideoExtension(file.extension)) {
      return (
        <div className="flex items-center justify-center h-full p-4">
          <video src={objectUrl} controls className="max-w-full max-h-full rounded-lg">
            Your browser does not support video playback.
          </video>
        </div>
      );
    }

    // Audio
    if (isAudioExtension(file.extension)) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
          <FileIcon extension={file.extension} size={64} />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">{file.name}</h3>
          <audio src={objectUrl} controls className="w-full max-w-md" />
        </div>
      );
    }

    // PDF
    if (isPdfExtension(file.extension)) {
      return (
        <iframe
          src={objectUrl}
          className="w-full h-full border-0 rounded-lg"
          title={file.name}
        />
      );
    }

    // Markdown
    if (file.extension === 'md' && textContent !== null) {
      return (
        <div className="p-6 prose prose-invert max-w-none overflow-y-auto h-full">
          <Suspense fallback={<div className="text-[var(--text-tertiary)]">Loading preview...</div>}>
            <ReactMarkdown>{textContent}</ReactMarkdown>
          </Suspense>
        </div>
      );
    }

    // Text & Code
    if (isTextExtension(file.extension) && textContent !== null) {
      const lang = getLanguageForExtension(file.extension);
      return (
        <div className="p-4 overflow-auto h-full">
          <Suspense fallback={<pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{textContent}</pre>}>
            <SyntaxHighlighter
              language={lang}
              customStyle={{
                background: 'transparent',
                padding: '1rem',
                fontSize: '13px',
                lineHeight: '1.6',
              }}
            >
              {textContent}
            </SyntaxHighlighter>
          </Suspense>
        </div>
      );
    }

    // HTML Preview (sandboxed)
    if (file.extension === 'html' && textContent !== null) {
      return (
        <iframe
          srcDoc={textContent}
          sandbox="allow-scripts"
          className="w-full h-full border-0 rounded-lg bg-white"
          title={file.name}
        />
      );
    }

    // No Preview
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
        <FileWarning className="w-16 h-16 text-[var(--text-tertiary)]" />
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No Preview Available</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Preview is not supported for .{file.extension.toUpperCase()} files.
          </p>
          <p className="text-xs text-[var(--text-tertiary)] mt-2">
            You can download this file to open it in a compatible application.
          </p>
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && file && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setFileId(null)}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative ml-auto w-full max-w-4xl h-full glass-strong flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-3 min-w-0">
                <FileIcon extension={file.extension} size={18} />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">{file.name}</h3>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {formatBytes(file.size)} · {file.extension.toUpperCase()} · {formatRelativeDate(file.uploadedAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => { toggleFavorite(file.id); toast.success(file.isFavorite === 1 ? 'Unfavorited' : 'Favorited'); }}
                  className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                  title="Favorite"
                >
                  <Star className={`w-4 h-4 ${file.isFavorite === 1 ? 'text-amber-400 fill-amber-400' : 'text-[var(--text-secondary)]'}`} />
                </button>
                <button
                  onClick={() => setRenameDialogFileId(file.id)}
                  className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                  title="Rename"
                >
                  <Edit3 className="w-4 h-4 text-[var(--text-secondary)]" />
                </button>
                <button
                  onClick={() => { setDownloadDialogFileId(file.id); }}
                  className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                  title="Download"
                >
                  <Download className="w-4 h-4 text-[var(--text-secondary)]" />
                </button>
                
                <button
                  onClick={() => {
                    confirm.triggerConfirm({
                      title: 'Move to Trash',
                      message: `Are you sure you want to move "${file.name}" to the trash?`,
                      confirmText: 'Move to Trash',
                      variant: 'danger',
                      onConfirm: async () => {
                        await softDeleteDocument(file.id);
                        setFileId(null);
                        toast.success('Moved to trash');
                      },
                    });
                  }}
                  className="p-2 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4 text-[var(--text-secondary)]" />
                </button>
                <button
                  onClick={() => setFileId(null)}
                  className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer ml-2"
                  title="Close"
                >
                  <X className="w-5 h-5 text-[var(--text-secondary)]" />
                </button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-hidden relative">
              {renderPreview()}

              {/* Prev/Next Navigation */}
              {hasPrev && (
                <button
                  onClick={goToPrev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-xl glass-strong hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5 text-[var(--text-primary)]" />
                </button>
              )}
              {hasNext && (
                <button
                  onClick={goToNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl glass-strong hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5 text-[var(--text-primary)]" />
                </button>
              )}
            </div>

            {/* File Details Footer */}
            <div className="p-3 border-t border-[var(--border-color)] flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
              <span>Type: {file.mimeType}</span>
              <span>Created: {file.createdAt.toLocaleDateString()}</span>
              <span>Modified: {file.modifiedAt.toLocaleDateString()}</span>
              <span>Uploaded: {file.uploadedAt.toLocaleDateString()}</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
