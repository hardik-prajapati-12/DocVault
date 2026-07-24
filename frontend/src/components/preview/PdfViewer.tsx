import React, { useState, useEffect, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Download, FileWarning, Loader2 } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Import local PDF.js worker asset via Vite URL import
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

if (!pdfjs.GlobalWorkerOptions.workerPort && !pdfjs.GlobalWorkerOptions.workerSrc) {
  if (typeof window !== 'undefined' && 'Worker' in window) {
    try {
      pdfjs.GlobalWorkerOptions.workerPort = new Worker(
        new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url),
        { type: 'module' }
      );
    } catch {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version || '5.4.296'}/build/pdf.worker.min.mjs`;
    }
  } else {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
  }
}

interface PdfViewerProps {
  fileData: Blob | ArrayBuffer | Uint8Array | string | null;
  fileName: string;
  onDownload?: () => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ fileData, fileName, onDownload }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  // Reset state when fileData changes
  useEffect(() => {
    setLoading(true);
    setError(false);
    setNumPages(null);
    setPageNumber(1);
  }, [fileData]);

  const documentProp = useMemo(() => {
    if (!fileData) return null;
    if (typeof fileData === 'string') {
      const token = localStorage.getItem('docvault-auth-token');
      return {
        url: fileData,
        withCredentials: true,
        httpHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      };
    }
    return fileData;
  }, [fileData]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
    setLoading(false);
    setError(false);
  }

  function onDocumentLoadError(err: Error) {
    console.error('PdfViewer load error:', err);
    setLoading(false);
    setError(true);
  }

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.2, 3.0));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.2, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  return (
    <div className="flex flex-col h-full w-full bg-[var(--bg-secondary)] rounded-lg overflow-hidden select-none">
      {/* Controls Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-color)] bg-[var(--bg-tertiary)] text-xs text-[var(--text-secondary)] z-10 flex-wrap gap-2">
        {/* Pagination */}
        <div className="flex items-center gap-2">
          <button
            disabled={!numPages || pageNumber <= 1}
            onClick={() => setPageNumber((p) => Math.max(p - 1, 1))}
            className="p-1.5 rounded hover:bg-[var(--bg-card-hover)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs">
            Page <span className="font-medium text-[var(--text-primary)]">{numPages ? pageNumber : '-'}</span> of{' '}
            <span className="font-medium text-[var(--text-primary)]">{numPages || '-'}</span>
          </span>
          <button
            disabled={!numPages || pageNumber >= numPages}
            onClick={() => setPageNumber((p) => Math.min(p + 1, numPages || 1))}
            className="p-1.5 rounded hover:bg-[var(--bg-card-hover)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom & Rotation Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded hover:bg-[var(--bg-card-hover)] cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="font-medium text-[var(--text-primary)] w-12 text-center text-xs">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded hover:bg-[var(--bg-card-hover)] cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-[var(--border-color)] mx-1" />
          <button
            onClick={handleRotate}
            className="p-1.5 rounded hover:bg-[var(--bg-card-hover)] cursor-pointer"
            title="Rotate Clockwise"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PDF View Container */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 min-h-0 bg-[#18181b]">
        {documentProp && !error ? (
          <Document
            file={documentProp as any}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex flex-col items-center gap-3 text-[var(--text-secondary)] py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
                <span className="text-sm">Loading PDF document...</span>
              </div>
            }
            error={null}
          >
            {numPages && (
              <div className="shadow-2xl rounded border border-gray-700/50 overflow-hidden my-auto">
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  rotate={rotation}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </div>
            )}
          </Document>
        ) : null}

        {/* Error Fallback */}
        {(error || !fileData) && (
          <div className="flex flex-col items-center justify-center gap-4 text-center p-8">
            <FileWarning className="w-14 h-14 text-amber-400" />
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                Unable to preview PDF document
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mb-4">
                The file content could not be rendered inline. You can download the PDF file to open it.
              </p>
              {onDownload && (
                <button
                  onClick={onDownload}
                  className="px-4 py-2 bg-[var(--accent)] text-white text-xs font-medium rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 mx-auto cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
