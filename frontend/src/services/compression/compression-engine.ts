import { PdfLoader } from './pdf-loader';
import { PageAnalyzer } from './page-analyzer';
import { ImageExtractor } from './image-extractor';
import { ImageOptimizer } from './image-optimizer';
import { PdfBuilder } from './pdf-builder';
import type { CompressionOptions, CompressionStats, CompressionProgress } from './types';

export class CancellationToken {
  public cancelled: boolean = false;
  public abort() {
    this.cancelled = true;
  }
}

export class CompressionEngine {
  static async compress(
    blob: Blob,
    options: CompressionOptions,
    onProgress?: (progress: CompressionProgress) => void,
    cancellationToken?: CancellationToken
  ): Promise<{ blob: Blob; stats: CompressionStats }> {
    
    const checkCancellation = () => {
      if (cancellationToken?.cancelled) {
        throw new Error('Compression cancelled by user');
      }
    };

    const yieldToEventLoop = () => new Promise((resolve) => setTimeout(resolve, 0));

    // Step 1: Loader
    onProgress?.({ step: 'loading', percentage: 10, statusText: 'Loading PDF document...' });
    await yieldToEventLoop();
    checkCancellation();
    const loadedPdf = await PdfLoader.load(blob);

    // Step 2: Analyzer
    onProgress?.({ step: 'analyzing', percentage: 25, statusText: 'Analyzing page dimensions & contents...' });
    await yieldToEventLoop();
    checkCancellation();
    const pageMetas = await PageAnalyzer.analyze(loadedPdf.pdfjsDoc);

    // Step 3: Extract Images
    onProgress?.({ step: 'extracting', percentage: 40, statusText: 'Extracting PDF image streams...' });
    await yieldToEventLoop();
    checkCancellation();
    const extractedImages = await ImageExtractor.extractAll(loadedPdf.pdfLibDoc);

    // Step 4: Optimize Images
    onProgress?.({ step: 'optimizing', percentage: 55, statusText: `Optimizing ${extractedImages.length} images...` });
    await yieldToEventLoop();
    checkCancellation();

    const optimizedImages: {
      ref: any;
      blob: Blob;
      width: number;
      height: number;
      filter: string;
    }[] = [];

    let imagesOptimizedCount = 0;
    let dpiSumBefore = 0;
    let dpiSumAfter = 0;
    const warnings: string[] = [];

    for (let i = 0; i < extractedImages.length; i++) {
      checkCancellation();
      const img = extractedImages[i];
      
      onProgress?.({
        step: 'optimizing',
        percentage: 55 + Math.round((i / extractedImages.length) * 25),
        statusText: `Optimizing image ${i + 1} of ${extractedImages.length}...`,
      });

      // Compress
      const opt = await ImageOptimizer.optimize(img, options);
      
      // Calculate DPI change (using width as proxy for DPI proportional scaling)
      const estimatedOriginalDpi = 150; // default assumption
      const scaleFactor = opt.width / img.width;
      const estimatedAfterDpi = Math.round(estimatedOriginalDpi * scaleFactor);

      dpiSumBefore += estimatedOriginalDpi;
      dpiSumAfter += estimatedAfterDpi;

      if (opt.blob.size < img.blob.size) {
        imagesOptimizedCount++;
      } else {
        warnings.push(`Image ${i + 1} (${img.width}x${img.height}) was already optimized. Skip re-compressing.`);
      }

      optimizedImages.push({
        ref: img.ref,
        blob: opt.blob,
        width: opt.width,
        height: opt.height,
        filter: opt.filter,
      });

      // Yield event loop to prevent UI thread lock
      await yieldToEventLoop();
    }

    // Step 5: Rebuild PDF
    onProgress?.({ step: 'building', percentage: 85, statusText: 'Reassembling PDF binary tree...' });
    await yieldToEventLoop();
    checkCancellation();

    const resultBytes = await PdfBuilder.rebuild(loadedPdf.pdfLibDoc, optimizedImages, options);
    checkCancellation();

    // Complete statistics
    const originalSize = blob.size;
    const compressedSize = resultBytes.length;
    const savedBytes = Math.max(0, originalSize - compressedSize);
    const savedPercent = originalSize > 0 ? Math.round((savedBytes / originalSize) * 100) : 0;
    
    const avgDpiBefore = extractedImages.length > 0 ? Math.round(dpiSumBefore / extractedImages.length) : 0;
    const avgDpiAfter = extractedImages.length > 0 ? Math.round(dpiSumAfter / extractedImages.length) : 0;

    const stats: CompressionStats = {
      originalSize,
      compressedSize,
      savedBytes,
      savedPercent,
      compressionRatio: originalSize > 0 ? compressedSize / originalSize : 1,
      imagesOptimized: imagesOptimizedCount,
      avgDpiBefore,
      avgDpiAfter,
      metadataRemoved: options.removeMetadata ?? false,
      fontsOptimized: options.optimizeFonts ?? false,
      warnings,
    };

    onProgress?.({ step: 'complete', percentage: 100, statusText: 'Compression finished!' });
    
    const compressedBlob = new Blob([resultBytes.buffer as ArrayBuffer], { type: 'application/pdf' });

    return {
      blob: compressedBlob,
      stats,
    };
  }
}
export type { CompressionOptions, CompressionStats, CompressionProgress };
