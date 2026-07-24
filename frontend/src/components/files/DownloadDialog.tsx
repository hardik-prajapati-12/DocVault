import React, { useState, useEffect, useRef } from 'react';
import { Download, Loader2, Settings, ShieldAlert, CheckCircle, RefreshCw, XCircle } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { useAppStore } from '@/store/app-store';
import { getFileBlob } from '@/services/file-service';
import { CompressionEngine, CancellationToken } from '@/services/compression/compression-engine';
import { formatBytes, isImageExtension, isPdfExtension } from '@/utils';
import { ImageCompressor } from '@/services/compression/image-compressor';
import type { CompressionResult } from '@/types';
import type { CompressionOptions, CompressionStats, CompressionProgress } from '@/services/compression/types';
import toast from 'react-hot-toast';

type CompressionProfile = 'low' | 'balanced' | 'high' | 'max' | 'custom';

export const DownloadDialog: React.FC = () => {
  const fileId = useAppStore((s) => s.downloadDialogFileId);
  const setFileId = useAppStore((s) => s.setDownloadDialogFileId);
  const file = useAppStore((s) => s.documents.find((d) => d.id === fileId));

  const isPdf = file ? isPdfExtension(file.extension) : false;
  const isImage = file ? isImageExtension(file.extension) : false;
  const canCompress = isPdf || isImage;

  const [profile, setProfile] = useState<CompressionProfile>('balanced');
  
  // Compression parameters
  const [quality, setQuality] = useState(75);
  const [resolutionScale, setResolutionScale] = useState(70);
  const [targetDpi, setTargetDpi] = useState(200);
  const [colorMode, setColorMode] = useState<'color' | 'grayscale'>('color');
  const [removeMetadata, setRemoveMetadata] = useState(true);
  const [flattenAnnotations, setFlattenAnnotations] = useState(false);
  const [removeThumbnails, setRemoveThumbnails] = useState(true);
  const [optimizeObjectStreams, setOptimizeObjectStreams] = useState(true);

  // Engine state
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState<CompressionProgress | null>(null);
  const [stats, setStats] = useState<CompressionStats | null>(null);
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);

  const cancellationTokenRef = useRef<CancellationToken | null>(null);

  const isOpen = !!fileId;

  // Track profile changes and sync parameters
  useEffect(() => {
    if (profile === 'low') {
      setQuality(90);
      setTargetDpi(300);
      setResolutionScale(100);
      setColorMode('color');
      setRemoveMetadata(false);
      setFlattenAnnotations(false);
    } else if (profile === 'balanced') {
      setQuality(75);
      setTargetDpi(200);
      setResolutionScale(70);
      setColorMode('color');
      setRemoveMetadata(true);
      setFlattenAnnotations(false);
    } else if (profile === 'high') {
      setQuality(60);
      setTargetDpi(150);
      setResolutionScale(50);
      setColorMode('color');
      setRemoveMetadata(true);
      setFlattenAnnotations(true);
    } else if (profile === 'max') {
      setQuality(45);
      setTargetDpi(96);
      setResolutionScale(35);
      setColorMode('grayscale');
      setRemoveMetadata(true);
      setFlattenAnnotations(true);
    }
  }, [profile]);

  const onClose = () => {
    handleCancel();
    setFileId(null);
    setStats(null);
    setCompressedBlob(null);
    setProgress(null);
    setIsCompressing(false);
    setProfile('balanced');
  };

  const handleCancel = () => {
    if (cancellationTokenRef.current) {
      cancellationTokenRef.current.abort();
      cancellationTokenRef.current = null;
    }
    setIsCompressing(false);
    setProgress(null);
  };

  const handleStartCompression = async () => {
    if (!file || !fileId) return;

    setIsCompressing(true);
    setStats(null);
    setCompressedBlob(null);

    const token = new CancellationToken();
    cancellationTokenRef.current = token;

    try {
      const blob = await getFileBlob(fileId);
      if (!blob) throw new Error('File not found in local vault.');

      if (isPdf) {
        const options: CompressionOptions = {
          quality,
          colorMode,
          removeMetadata,
          removeThumbnails,
          flattenAnnotations,
          optimizeObjectStreams,
          ...(profile === 'custom'
            ? { resolutionScale }
            : { targetDpi }),
        };

        const result = await CompressionEngine.compress(
          blob,
          options,
          (p) => setProgress(p),
          token
        );

        setCompressedBlob(result.blob);
        setStats(result.stats);
      } else if (isImage) {
        setProgress({ step: 'optimizing', percentage: 50, statusText: 'Optimizing image...' });
        
        await new Promise((resolve) => setTimeout(resolve, 100));

        const result = await ImageCompressor.compress(blob, {
          quality,
          resolutionScale: profile === 'custom' ? resolutionScale : (profile === 'low' ? 100 : (profile === 'balanced' ? 70 : (profile === 'high' ? 50 : 35))),
          colorMode
        });

        const savedBytes = Math.max(0, result.originalSize - result.compressedSize);
        const savedPercent = result.originalSize > 0 ? Math.round((savedBytes / result.originalSize) * 100) : 0;

        setCompressedBlob(result.blob);
        setStats({
          originalSize: result.originalSize,
          compressedSize: result.compressedSize,
          savedBytes,
          savedPercent,
          compressionRatio: result.originalSize > 0 ? result.compressedSize / result.originalSize : 1,
          imagesOptimized: 1,
          avgDpiBefore: 0,
          avgDpiAfter: 0,
          metadataRemoved: false,
          fontsOptimized: false,
          warnings: []
        });
      }
    } catch (error: any) {
      if (error.message !== 'Compression cancelled by user') {
        console.error('Compression failed:', error);
        alert(`Compression failed: ${error.message}`);
      }
    } finally {
      setIsCompressing(false);
      setProgress(null);
      cancellationTokenRef.current = null;
    }
  };

  const handleDownload = () => {
    if (!file || !compressedBlob) return;
    const url = URL.createObjectURL(compressedBlob);
    const a = document.createElement('a');
    a.href = url;
    
    const ext = isImage ? 'jpg' : file.extension;
    const rawBaseName = file.name.includes('.') ? file.name.substring(0, file.name.lastIndexOf('.')) : file.name;

    a.download = `compressed_${rawBaseName}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
    onClose();
  };

  const handleDownloadOriginal = async () => {
    if (!file) return;

    // Tier 1: Primary fetch via server endpoint with authentication token
    try {
      const token = localStorage.getItem('docvault-auth-token');
      const res = await fetch(`/api/documents/${file.id}/file?download=true`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => {
            URL.revokeObjectURL(url);
          }, 1000);
          onClose();
          return;
        }
      }
    } catch (err) {
      console.warn('Backend download endpoint failed, trying getFileBlob fallback:', err);
    }

    // Tier 2: Call file service helper getFileBlob
    try {
      const blob = await getFileBlob(file.id);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);
        onClose();
        return;
      }
    } catch (err) {
      console.warn('getFileBlob fallback failed, trying direct URL:', err);
    }

    // Tier 3: Direct URL window fallback
    const directUrl = file.cloudinaryUrl || file.localUrl;
    if (directUrl) {
      window.open(directUrl, '_blank');
      onClose();
      return;
    }

    toast.error('Failed to download file from server or cloud storage.');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Compress" maxWidth="max-w-md">
      {file && (
        <div className="space-y-5">
          {/* Section A: Original Details & Active Size Display */}
          <div className="flex items-center justify-between text-sm p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Active Document</p>
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{file.name}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-[var(--text-tertiary)]">Original Size</p>
              <p className="text-sm font-semibold text-[var(--accent)]">{formatBytes(file.size)}</p>
            </div>
          </div>

          {!isCompressing && !stats && (
            <>
              {/* Section B: Compression Preset Profiles */}
              {canCompress ? (
                <>
                  <div>
                    <label className="text-sm font-semibold text-[var(--text-primary)] mb-2 block">Compression Level</label>
                    <div className="grid grid-cols-5 gap-1.5 p-1 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs font-medium">
                      {(['low', 'balanced', 'high', 'max', 'custom'] as CompressionProfile[]).map((p) => (
                        <button
                          key={p}
                          onClick={() => setProfile(p)}
                          className={`py-2 rounded-lg capitalize transition-all cursor-pointer ${
                            profile === p
                              ? 'bg-[var(--accent)] text-white shadow-sm'
                              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {p === 'max' ? 'Max' : p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preset details info */}
                  {profile !== 'custom' && (
                    <div className="p-3 rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-color)]/30 text-xs text-[var(--text-secondary)] space-y-1">
                      {isPdf && (
                        <div className="flex justify-between">
                          <span>Target Resolution:</span>
                          <span className="font-semibold text-[var(--text-primary)]">{targetDpi} DPI</span>
                        </div>
                      )}
                      {isImage && (
                        <div className="flex justify-between">
                          <span>Target Resolution Scale:</span>
                          <span className="font-semibold text-[var(--text-primary)]">
                            {profile === 'low' ? 100 : (profile === 'balanced' ? 70 : (profile === 'high' ? 50 : 35))}%
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>JPEG Quality:</span>
                        <span className="font-semibold text-[var(--text-primary)]">{quality}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Color Profile:</span>
                        <span className="font-semibold text-[var(--text-primary)] capitalize">{colorMode}</span>
                      </div>
                      {isPdf && (
                        <div className="flex justify-between">
                          <span>Metadata Pruning:</span>
                          <span className="font-semibold text-[var(--text-primary)]">{removeMetadata ? 'Enabled' : 'Disabled'}</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="p-3 rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-color)] border-dashed text-xs text-[var(--text-secondary)] text-center py-6">
                  Compression is not supported for .{file.extension.toUpperCase()} files.
                  <br />
                  <span className="text-[10px] text-[var(--text-tertiary)] mt-1 block">
                    You can download the original file directly below.
                  </span>
                </div>
              )}

              {/* Section C: Custom Options Drawer */}
              {profile === 'custom' && canCompress && (
                <div className="space-y-4 border-t border-[var(--border-color)] pt-4">
                  {/* Slider 1: Document Quality */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-semibold text-[var(--text-primary)]">
                      <span>Document Quality</span>
                      <span className="text-[var(--accent)]">{quality}%</span>
                    </div>
                    <div className="relative flex items-center h-5">
                      <input
                        type="range"
                        min={1}
                        max={100}
                        value={quality}
                        onChange={(e) => setQuality(Number(e.target.value))}
                        className="w-full h-1 bg-[var(--bg-tertiary)] rounded-full appearance-none cursor-pointer z-10"
                        style={{
                          background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${quality}%, var(--bg-tertiary) ${quality}%, var(--bg-tertiary) 100%)`,
                        }}
                      />
                      <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full flex justify-between px-0.5 pointer-events-none">
                        <div className="w-2.5 h-2.5 rounded-full border-2 border-[var(--border-color)] bg-[var(--bg-primary)]" />
                        <div className="w-2.5 h-2.5 rounded-full border-2 border-[var(--border-color)] bg-[var(--bg-primary)] absolute left-1/2 -translate-x-1/2" />
                        <div className="w-2.5 h-2.5 rounded-full border-2 border-[var(--border-color)] bg-[var(--bg-primary)]" />
                      </div>
                    </div>
                  </div>

                  {/* Slider 2: Resolution Scale */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-semibold text-[var(--text-primary)]">
                      <span>Resolution Scale</span>
                      <span className="text-[var(--accent)]">{resolutionScale}%</span>
                    </div>
                    <div className="relative flex items-center h-5">
                      <input
                        type="range"
                        min={5}
                        max={100}
                        value={resolutionScale}
                        onChange={(e) => setResolutionScale(Number(e.target.value))}
                        className="w-full h-1 bg-[var(--bg-tertiary)] rounded-full appearance-none cursor-pointer z-10"
                        style={{
                          background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${resolutionScale}%, var(--bg-tertiary) ${resolutionScale}%, var(--bg-tertiary) 100%)`,
                        }}
                      />
                      <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full flex justify-between px-0.5 pointer-events-none">
                        <div className="w-2.5 h-2.5 rounded-full border-2 border-[var(--border-color)] bg-[var(--bg-primary)]" />
                        <div className="w-2.5 h-2.5 rounded-full border-2 border-[var(--border-color)] bg-[var(--bg-primary)] absolute left-1/2 -translate-x-1/2" />
                        <div className="w-2.5 h-2.5 rounded-full border-2 border-[var(--border-color)] bg-[var(--bg-primary)]" />
                      </div>
                    </div>
                  </div>

                  {/* Settings Switches */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <label className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-tertiary)] cursor-pointer">
                      <span>Grayscale</span>
                      <input
                        type="checkbox"
                        checked={colorMode === 'grayscale'}
                        onChange={(e) => setColorMode(e.target.checked ? 'grayscale' : 'color')}
                        className="rounded border-[var(--border-color)] text-[var(--accent)] focus:ring-[var(--accent)]"
                      />
                    </label>

                    {isPdf && (
                      <>
                        <label className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-tertiary)] cursor-pointer">
                          <span>Prune Metadata</span>
                          <input
                            type="checkbox"
                            checked={removeMetadata}
                            onChange={(e) => setRemoveMetadata(e.target.checked)}
                            className="rounded border-[var(--border-color)] text-[var(--accent)] focus:ring-[var(--accent)]"
                          />
                        </label>

                        <label className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-tertiary)] cursor-pointer">
                          <span>Flatten Annotations</span>
                          <input
                            type="checkbox"
                            checked={flattenAnnotations}
                            onChange={(e) => setFlattenAnnotations(e.target.checked)}
                            className="rounded border-[var(--border-color)] text-[var(--accent)] focus:ring-[var(--accent)]"
                          />
                        </label>

                        <label className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-tertiary)] cursor-pointer">
                          <span>Object Stream Opt</span>
                          <input
                            type="checkbox"
                            checked={optimizeObjectStreams}
                            onChange={(e) => setOptimizeObjectStreams(e.target.checked)}
                            className="rounded border-[var(--border-color)] text-[var(--accent)] focus:ring-[var(--accent)]"
                          />
                        </label>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Actions: Start Compression */}
              <div className="flex gap-2.5 pt-3">
                {canCompress && (
                  <Button className="flex-1" onClick={handleStartCompression} icon={<RefreshCw className="w-4 h-4" />}>
                    Run Compression
                  </Button>
                )}
                <Button variant="secondary" className={!canCompress ? 'flex-1' : ''} onClick={handleDownloadOriginal}>
                  {!canCompress ? 'Download Original File' : 'Original'}
                </Button>
              </div>
            </>
          )}

          {/* Section D: Active Progress Bar & Cancellation */}
          {isCompressing && progress && (
            <div className="space-y-4 py-3 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)] mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{progress.statusText}</p>
                <p className="text-xs text-[var(--text-tertiary)]">Step progress: {progress.percentage}%</p>
              </div>
              <div className="w-full h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              <Button variant="secondary" onClick={handleCancel} icon={<XCircle className="w-4 h-4" />}>
                Cancel Optimization
              </Button>
            </div>
          )}

          {/* Section E: Adobe Acrobat-like Detailed Report View */}
          {stats && compressedBlob && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-semibold">PDF Optimizations Completed Successfully!</span>
              </div>

              {/* Comparison Statistics */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                  <p className="text-xs text-[var(--text-tertiary)]">Original Size</p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">{formatBytes(stats.originalSize)}</p>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                  <p className="text-xs text-[var(--text-tertiary)]">Compressed Size</p>
                  <p className="text-lg font-bold text-[var(--accent)]">{formatBytes(stats.compressedSize)}</p>
                </div>
              </div>

              {/* Progress Summary Info Card */}
              <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] text-xs text-[var(--text-secondary)] space-y-2.5">
                <div className="flex justify-between border-b border-[var(--border-color)] pb-2">
                  <span className="font-semibold text-[var(--text-primary)] text-sm">Detailed Audit Log</span>
                  <span className="text-emerald-400 font-bold text-sm">-{stats.savedPercent}% Saved</span>
                </div>
                {isPdf && (
                  <>
                    <div className="flex justify-between">
                      <span>Images Optimized:</span>
                      <span className="font-medium text-[var(--text-primary)]">{stats.imagesOptimized} / {stats.imagesOptimized + stats.warnings.length}</span>
                    </div>
                    {stats.avgDpiBefore > 0 && (
                      <div className="flex justify-between">
                        <span>DPI Target Scale:</span>
                        <span className="font-medium text-[var(--text-primary)]">
                          {stats.avgDpiBefore} → {stats.avgDpiAfter} DPI
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Metadata Dictionaries Pruned:</span>
                      <span className="font-medium text-[var(--text-primary)]">{stats.metadataRemoved ? 'Yes' : 'No'}</span>
                    </div>
                  </>
                )}
                {isImage && (
                  <div className="flex justify-between">
                    <span>Optimization Quality:</span>
                    <span className="font-medium text-[var(--text-primary)]">{quality}% Quality</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Compression Ratio:</span>
                  <span className="font-medium text-[var(--text-primary)]">{(stats.compressionRatio * 100).toFixed(1)}% of original</span>
                </div>
              </div>

              {/* Warning Log Drawer (if any files skipped) */}
              {stats.warnings.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-[10px] text-amber-400 space-y-1 max-h-24 overflow-y-auto">
                  <p className="font-semibold flex items-center gap-1 mb-1 text-xs">
                    <ShieldAlert className="w-3.5 h-3.5" /> Compression Warnings
                  </p>
                  {stats.warnings.map((w, idx) => (
                    <p key={idx}>• {w}</p>
                  ))}
                </div>
              )}

              {/* Download / Reset Actions */}
              <div className="flex gap-2.5 pt-2">
                <Button className="flex-1" onClick={handleDownload} icon={<Download className="w-4 h-4" />}>
                  Download Compressed PDF
                </Button>
                <Button variant="secondary" onClick={() => { setStats(null); setCompressedBlob(null); }}>
                  Configure Again
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
