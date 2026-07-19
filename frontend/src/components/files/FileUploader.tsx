import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileUp, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui';
import { uploadFiles } from '@/services/file-service';
import { useAppStore } from '@/store/app-store';
import { formatBytes, formatSpeed, formatDuration } from '@/utils';
import type { UploadProgress } from '@/types';

export const FileUploader: React.FC = () => {
  const isOpen = useAppStore((s) => s.uploadModalOpen);
  const setOpen = useAppStore((s) => s.setUploadModalOpen);
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleProgress = useCallback((progress: UploadProgress) => {
    setUploads((prev) => {
      const idx = prev.findIndex((u) => u.fileId === progress.fileId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = progress;
        return next;
      }
      return [...prev, progress];
    });
  }, []);

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setIsUploading(true);
    setUploads([]);
    await uploadFiles(files, null, handleProgress);
    setIsUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const items = e.dataTransfer.items;
    const files: File[] = [];

    // Handle folder drops
    const processEntry = async (entry: FileSystemEntry, currentPath: string = ''): Promise<void> => {
      const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
      if (entry.isFile) {
        const file = await new Promise<File>((resolve) => {
          (entry as FileSystemFileEntry).file(resolve);
        });
        Object.defineProperty(file, 'webkitRelativePath', {
          value: entryPath,
          writable: true,
          enumerable: true,
          configurable: true,
        });
        files.push(file);
      } else if (entry.isDirectory) {
        const reader = (entry as FileSystemDirectoryEntry).createReader();
        const entries = await new Promise<FileSystemEntry[]>((resolve) => {
          reader.readEntries(resolve);
        });
        for (const e of entries) {
          await processEntry(e, entryPath);
        }
      }
    };

    if (items) {
      const entries = Array.from(items)
        .map((item) => item.webkitGetAsEntry?.())
        .filter(Boolean) as FileSystemEntry[];

      if (entries.length > 0) {
        Promise.all(entries.map((entry) => processEntry(entry))).then(() => processFiles(files));
        return;
      }
    }

    processFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
  };

  const completedCount = uploads.filter((u) => u.status === 'complete').length;
  const errorCount = uploads.filter((u) => u.status === 'error').length;

  return (
    <Modal isOpen={isOpen} onClose={() => setOpen(false)} title="Upload Files" maxWidth="max-w-2xl">
      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 cursor-pointer
          ${isDragging
            ? 'border-[var(--accent)] bg-[var(--accent-dim)] scale-[1.02]'
            : 'border-[var(--border-color)] hover:border-[var(--border-color-hover)] hover:bg-[var(--bg-tertiary)]'
          }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <motion.div
          animate={{ y: isDragging ? -5 : 0 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'}`} />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
            {isDragging ? 'Drop files here' : 'Drag & drop files here'}
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            or click to browse — supports any file type
          </p>
        </motion.div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Folder Upload Button */}
      <div className="flex gap-3 mt-4">
        <button
          onClick={() => folderInputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[var(--border-color)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          <FileUp className="w-4 h-4" />
          Upload Folder
        </button>
        <input
          ref={folderInputRef}
          type="file"
          // @ts-expect-error webkitdirectory is a non-standard attribute
          webkitdirectory=""
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Upload Progress */}
      <AnimatePresence>
        {uploads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-2 max-h-64 overflow-y-auto"
          >
            {/* Summary */}
            {uploads.length > 1 && (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--bg-tertiary)] text-xs text-[var(--text-secondary)]">
                <span>{completedCount}/{uploads.length} files uploaded</span>
                {errorCount > 0 && <span className="text-red-400">{errorCount} failed</span>}
              </div>
            )}

            {uploads.map((upload) => (
              <motion.div
                key={upload.fileId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[var(--bg-tertiary)]"
              >
                {upload.status === 'complete' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                {upload.status === 'error' && <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                {upload.status === 'uploading' && <Loader2 className="w-4 h-4 text-[var(--accent)] animate-spin flex-shrink-0" />}
                {upload.status === 'pending' && <div className="w-4 h-4 rounded-full border-2 border-[var(--text-tertiary)] flex-shrink-0" />}

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-primary)] truncate">{upload.fileName}</p>
                  <div className="flex items-center gap-3 text-[10px] text-[var(--text-tertiary)]">
                    <span>{formatBytes(upload.fileSize)}</span>
                    {upload.status === 'uploading' && (
                      <>
                        <span>{formatSpeed(upload.speed)}</span>
                        <span>ETA: {formatDuration(upload.remainingTime)}</span>
                      </>
                    )}
                    {upload.status === 'error' && (
                      <span className="text-red-400">{upload.error}</span>
                    )}
                  </div>
                </div>

                {upload.status === 'uploading' && (
                  <div className="w-16">
                    <div className="h-1 bg-[var(--bg-input)] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: 'var(--accent)' }}
                        animate={{ width: `${upload.percentage}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-[var(--text-tertiary)] text-right mt-0.5">
                      {upload.percentage}%
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Close when done */}
      {uploads.length > 0 && !isUploading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex justify-end">
          <button
            onClick={() => { setOpen(false); setUploads([]); }}
            className="btn-accent px-5 py-2 text-sm cursor-pointer"
          >
            Done
          </button>
        </motion.div>
      )}
    </Modal>
  );
};
