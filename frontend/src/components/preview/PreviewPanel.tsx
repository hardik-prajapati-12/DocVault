import React, { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ChevronLeft, ChevronRight, Maximize2, Star, Edit3, Trash2, FileWarning } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { getFileBlob, getFileUrl, toggleFavorite, softDeleteDocument } from '@/services/file-service';
import { formatBytes, formatRelativeDate, isImageExtension, isVideoExtension, isAudioExtension, isTextExtension, isPdfExtension, isOfficeExtension, getLanguageForExtension, lazyWithRetry } from '@/utils';
import { FileIcon } from '@/components/files/FileIcon';
import toast from 'react-hot-toast';
import { useConfirmStore } from '@/store/confirm-store';

// Lazy-load heavy preview components with reload retry logic
const SyntaxHighlighter = lazyWithRetry(() =>
  import('react-syntax-highlighter').then((mod) => ({ default: mod.Light }))
);
const ReactMarkdown = lazyWithRetry(() => import('react-markdown'));


export const PreviewPanel: React.FC = () => {
  const fileId = useAppStore((s) => s.previewFileId);
  const setFileId = useAppStore((s) => s.setPreviewFileId);
  const setDownloadDialogFileId = useAppStore((s) => s.setDownloadDialogFileId);
  const setRenameDialogFileId = useAppStore((s) => s.setRenameDialogFileId);
  const confirm = useConfirmStore();

  const file = useAppStore((s) => s.documents.find((d) => d.id === fileId));
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!fileId || !file) {
      setObjectUrl(null);
      setTextContent(null);
      setLoading(false);
      return;
    }

    const isText = isTextExtension(file.extension) || 
                   file.extension.toLowerCase() === 'md' || 
                   file.extension.toLowerCase() === 'csv' || 
                   file.extension.toLowerCase() === 'html';

    const isPdf = file.extension.toLowerCase() === 'pdf';
    const isOffice = isOfficeExtension(file.extension);

    let fileUrl = getFileUrl(file);
    if (isOffice) {
      const publicUrl = file.cloudinaryUrl || (file.localUrl && !file.localUrl.includes('localhost') ? file.localUrl : '');
      fileUrl = publicUrl ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(publicUrl)}` : '';
    }

    if (isText || isPdf) {
      setLoading(true);
      getFileBlob(fileId).then((blob) => {
        if (!blob) {
          setLoading(false);
          setTextContent(null);
          setObjectUrl(null);
          return;
        }

        const url = URL.createObjectURL(blob);
        setObjectUrl(url);

        if (isText) {
          blob.text()
            .then((text) => {
              setTextContent(text);
              setLoading(false);
            })
            .catch(() => {
              setTextContent(null);
              setLoading(false);
            });
        } else {
          setLoading(false);
        }
      });
    } else {
      // Direct URL preview bypasses CORS/fetch constraints for images, videos, audio, and Office documents
      setObjectUrl(fileUrl);
      setLoading(false);
    }

    return () => {
      if (objectUrl && objectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [fileId, file]);

  const isOpen = !!fileId && !!file;

  const documents = useAppStore((s) => s.documents);
  const allFiles = React.useMemo(() => documents.filter((d) => d.isDeleted === 0), [documents]) ?? [];

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
    if (loading || !file) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
        </div>
      );
    }

    const isText = isTextExtension(file.extension) || 
                   file.extension.toLowerCase() === 'md' || 
                   file.extension.toLowerCase() === 'csv' || 
                   file.extension.toLowerCase() === 'html';

    if (isText && textContent === null) {
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
          <img src={objectUrl || ''} alt={file.name} className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      );
    }

    // Videos
    if (isVideoExtension(file.extension)) {
      return (
        <div className="flex items-center justify-center h-full p-4">
          <video src={objectUrl || ''} controls className="max-w-full max-h-full rounded-lg">
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
          <audio src={objectUrl || ''} controls className="w-full max-w-md" />
        </div>
      );
    }

    // PDF
    if (isPdfExtension(file.extension)) {
      if (!objectUrl) {
        return (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
            <FileWarning className="w-16 h-16 text-[var(--text-tertiary)]" />
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Failed to load PDF</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                The PDF file could not be retrieved from the server.
              </p>
            </div>
          </div>
        );
      }
      return (
        <iframe
          src={objectUrl}
          className="w-full h-full border-0 rounded-lg"
          title={file.name}
        />
      );
    }

    // Office Documents (Word, Excel, PowerPoint)
    if (isOfficeExtension(file.extension)) {
      if (!objectUrl) {
        return (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
            <FileWarning className="w-16 h-16 text-[var(--text-tertiary)]" />
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Preview Unavailable</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Office document previews require a public cloud URL.
              </p>
              <p className="text-xs text-[var(--text-tertiary)] mt-2">
                You can download this file to open it.
              </p>
            </div>
          </div>
        );
      }
      return (
        <iframe
          src={objectUrl}
          className="w-full h-full border-0 rounded-lg bg-white"
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

            <div className="p-3 border-t border-[var(--border-color)] flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
              <span>Type: {file.mimeType}</span>
              <span>Created: {new Date(file.createdAt).toLocaleDateString()}</span>
              <span>Modified: {new Date(file.modifiedAt).toLocaleDateString()}</span>
              <span>Uploaded: {new Date(file.uploadedAt).toLocaleDateString()}</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
