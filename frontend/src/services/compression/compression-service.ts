/**
 * Compression Service — Handles ZIP, image, PDF, and text compression in the browser.
 *
 * For images: uses browser-image-compression with iterative quality reduction.
 * For PDFs: renders pages to canvas at progressively lower quality/resolution
 *           to meet the target file size, then reassembles into a new PDF.
 * For text: uses gzip or ZIP (lossless — target size is best-effort).
 * For other files: ZIP compression (lossless — target size is best-effort).
 */

import { zipSync, strToU8 } from 'fflate';
import type { Zippable } from 'fflate';
import imageCompression from 'browser-image-compression';
import type { CompressionResult } from '@/types';
import * as pdfjsLib from 'pdfjs-dist';

// @ts-ignore
import PDFWorker from 'pdfjs-dist/build/pdf.worker.mjs?worker';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerPort = new PDFWorker();
}

/**
 * Compress a file to a target size (in bytes).
 * Returns the best compression result achievable.
 */
export interface CompressionOptions {
  quality: number;
  resolutionScale?: number;
  colorMode?: 'color' | 'grayscale';
}

export async function compressFile(
  blob: Blob,
  fileName: string,
  targetSizeBytes: number,
  mimeType: string,
  qualityOverride?: number | CompressionOptions
): Promise<CompressionResult> {
  const startTime = performance.now();
  const originalSize = blob.size;

  let result: Blob;
  let quality = 100;

  // Handle direct quality override if provided
  if (qualityOverride !== undefined) {
    const options: CompressionOptions = typeof qualityOverride === 'number'
      ? { quality: qualityOverride, resolutionScale: qualityOverride, colorMode: 'color' }
      : {
          quality: qualityOverride.quality,
          resolutionScale: qualityOverride.resolutionScale ?? qualityOverride.quality,
          colorMode: qualityOverride.colorMode ?? 'color'
        };

    if (mimeType.startsWith('image/') && !mimeType.includes('svg')) {
      const compressed = await compressImageAtQuality(blob, options, mimeType);
      result = compressed.blob;
      quality = compressed.quality;
    } else if (mimeType === 'application/pdf') {
      const compressed = await compressPdfAtQuality(blob, options);
      result = compressed.blob;
      quality = compressed.quality;
    } else if (isTextMimeType(mimeType)) {
      result = await compressText(blob);
      quality = 100;
    } else if (mimeType.includes('svg')) {
      result = await optimizeSvg(blob);
      quality = 100;
    } else {
      result = await compressAsZip(blob, fileName);
      quality = 100;
    }
  } else {
    // If target is larger than or equal to original, return original
    if (targetSizeBytes >= originalSize) {
      return {
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1,
        spaceSaved: 0,
        estimatedQuality: 100,
        compressionTime: performance.now() - startTime,
        blob,
        mimeType,
        fileName,
      };
    }

    // Try image compression for image types
    if (mimeType.startsWith('image/') && !mimeType.includes('svg')) {
      const compressed = await compressImage(blob, targetSizeBytes, mimeType);
      result = compressed.blob;
      quality = compressed.quality;
    }
    // PDF compression: render pages to images at reduced quality
    else if (mimeType === 'application/pdf') {
      const compressed = await compressPdf(blob, targetSizeBytes);
      result = compressed.blob;
      quality = compressed.quality;
    }
    // Try text-based compression
    else if (isTextMimeType(mimeType)) {
      result = await compressText(blob);
      quality = 100; // Lossless
    }
    // SVG optimization
    else if (mimeType.includes('svg')) {
      result = await optimizeSvg(blob);
      quality = 100;
    }
    // For everything else, try ZIP compression
    else {
      result = await compressAsZip(blob, fileName);
      quality = 100;
    }
  }

  const compressionTime = performance.now() - startTime;
  const compressedSize = result.size;

  return {
    originalSize,
    compressedSize,
    compressionRatio: originalSize > 0 ? compressedSize / originalSize : 1,
    spaceSaved: originalSize - compressedSize,
    estimatedQuality: quality,
    compressionTime,
    blob: result,
    mimeType: result.type || mimeType,
    fileName: getCompressedFileName(fileName, mimeType, result.type),
  };
}

/**
 * Compress an image to a target size using iterative quality reduction.
 */
async function compressImage(
  blob: Blob,
  targetSizeBytes: number,
  mimeType: string
): Promise<{ blob: Blob; quality: number }> {
  const file = new File([blob], 'image', { type: mimeType });
  const targetSizeMB = targetSizeBytes / (1024 * 1024);

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: Math.max(targetSizeMB, 0.001),
      maxWidthOrHeight: 4096,
      useWebWorker: true,
      fileType: mimeType === 'image/png' ? 'image/webp' : mimeType,
      initialQuality: 0.8,
    });

    const quality = Math.round((1 - (blob.size - compressed.size) / blob.size) * 100);
    return { blob: compressed, quality: Math.max(quality, 10) };
  } catch {
    // If compression fails, return original
    return { blob, quality: 100 };
  }
}

/**
 * Compress a PDF by rendering each page to a JPEG image at reduced quality,
 * then packaging the images into a new lightweight PDF.
 *
 * Uses pdf.js to render pages → canvas → JPEG blobs, then iteratively
 * adjusts JPEG quality and resolution scale until the total size fits
 * within the target.
 */
async function compressPdf(
  blob: Blob,
  targetSizeBytes: number
): Promise<{ blob: Blob; quality: number }> {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const numPages = pdf.numPages;

    // Calculate target size per page (leave ~200 bytes overhead per page for PDF wrapper)
    const pdfOverhead = 600 + numPages * 200;
    const availableBytes = Math.max(targetSizeBytes - pdfOverhead, numPages * 100);
    const targetPerPage = availableBytes / numPages;

    // Binary search for the right JPEG quality + scale combination
    let bestPages: Blob[] = [];
    let bestQuality = 100;
    let bestTotalSize = Infinity;

    // Try quality levels from high to low
    const qualityLevels = [0.95, 0.8, 0.6, 0.45, 0.3, 0.15, 0.08, 0.03, 0.01];
    const scaleLevels = [2.0, 1.5, 1.2, 1.0, 0.8, 0.6, 0.4, 0.25, 0.15, 0.1, 0.05];

    for (const scale of scaleLevels) {
      for (const jpegQuality of qualityLevels) {
        const pageBlobs: Blob[] = [];
        let totalSize = pdfOverhead;

        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(viewport.width, 1);
          canvas.height = Math.max(viewport.height, 1);
          const ctx = canvas.getContext('2d')!;

          await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

          const pageBlob = await new Promise<Blob>((resolve) => {
            canvas.toBlob(
              (b) => resolve(b || new Blob()),
              'image/jpeg',
              jpegQuality
            );
          });

          pageBlobs.push(pageBlob);
          totalSize += pageBlob.size;
        }

        if (totalSize <= targetSizeBytes) {
          // Found a combination that fits!
          bestPages = pageBlobs;
          bestQuality = Math.round(jpegQuality * 100);
          bestTotalSize = totalSize;
          break;
        }

        // Track best result so far (closest to target)
        if (totalSize < bestTotalSize) {
          bestPages = pageBlobs;
          bestQuality = Math.round(jpegQuality * 100);
          bestTotalSize = totalSize;
        }
      }

      // If we already fit, stop trying lower scales
      if (bestTotalSize <= targetSizeBytes) break;
    }

    // If even the lowest quality+scale doesn't fit, try extreme cropping
    if (bestTotalSize > targetSizeBytes && bestPages.length > 0) {
      // Already at minimum quality — just use what we have
    }

    // Build a simple PDF from JPEG images
    const pdfBytes = await buildPdfFromImages(bestPages, pdf);
    const resultBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });

    return { blob: resultBlob, quality: bestQuality };
  } catch (err) {
    console.error('PDF compression failed, falling back to ZIP:', err);
    // Fallback: ZIP compress the original
    const zipBlob = await compressAsZip(blob, 'document.pdf');
    return { blob: zipBlob, quality: 100 };
  }
}

/**
 * Build a minimal PDF file from a set of JPEG page images.
 * Creates a standards-compliant PDF 1.4 with embedded JPEG images.
 */
async function buildPdfFromImages(
  pageBlobs: Blob[],
  originalPdf: any
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let currentOffset = 0;

  const write = (text: string) => {
    const bytes = encoder.encode(text);
    parts.push(bytes);
    currentOffset += bytes.length;
  };

  const writeBinary = (data: Uint8Array) => {
    parts.push(data);
    currentOffset += data.length;
  };

  // PDF Header
  write('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  // Collect image data and page dimensions
  const imageDataList: { data: Uint8Array; width: number; height: number }[] = [];

  for (let i = 0; i < pageBlobs.length; i++) {
    const arrayBuf = await pageBlobs[i].arrayBuffer();
    const data = new Uint8Array(arrayBuf);

    // Parse JPEG dimensions from the SOF marker
    const dims = getJpegDimensions(data);
    imageDataList.push({
      data,
      width: dims.width,
      height: dims.height,
    });
  }

  const numPages = imageDataList.length;

  // Object numbering:
  // 1 = Catalog
  // 2 = Pages
  // For each page i (0-indexed):
  //   3 + i*3 = Page
  //   4 + i*3 = Image XObject
  //   5 + i*3 = Content stream
  const totalObjects = 2 + numPages * 3;

  // Obj 1: Catalog
  offsets.push(currentOffset);
  write('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // Obj 2: Pages
  offsets.push(currentOffset);
  const kidsRefs = Array.from({ length: numPages }, (_, i) => `${3 + i * 3} 0 R`).join(' ');
  write(`2 0 obj\n<< /Type /Pages /Kids [${kidsRefs}] /Count ${numPages} >>\nendobj\n`);

  for (let i = 0; i < numPages; i++) {
    const imgInfo = imageDataList[i];
    const pageObjNum = 3 + i * 3;
    const imgObjNum = 4 + i * 3;
    const contentObjNum = 5 + i * 3;

    // Get original page dimensions for the PDF coordinate system
    let pageWidth = imgInfo.width;
    let pageHeight = imgInfo.height;
    try {
      const origPage = await originalPdf.getPage(i + 1);
      const vp = origPage.getViewport({ scale: 1.0 });
      pageWidth = vp.width;
      pageHeight = vp.height;
    } catch { /* use image dims */ }

    // Page object
    offsets.push(currentOffset);
    write(`${pageObjNum} 0 obj\n`);
    write(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}] `);
    write(`/Contents ${contentObjNum} 0 R /Resources << /XObject << /Img${i} ${imgObjNum} 0 R >> >> >>\n`);
    write('endobj\n');

    // Image XObject
    offsets.push(currentOffset);
    write(`${imgObjNum} 0 obj\n`);
    write(`<< /Type /XObject /Subtype /Image /Width ${imgInfo.width} /Height ${imgInfo.height} `);
    write(`/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgInfo.data.length} >>\n`);
    write('stream\n');
    writeBinary(imgInfo.data);
    write('\nendstream\nendobj\n');

    // Content stream: draw image scaled to page size
    const contentStr = `q ${pageWidth.toFixed(2)} 0 0 ${pageHeight.toFixed(2)} 0 0 cm /Img${i} Do Q\n`;
    offsets.push(currentOffset);
    write(`${contentObjNum} 0 obj\n<< /Length ${contentStr.length} >>\nstream\n${contentStr}endstream\nendobj\n`);
  }

  // Cross-reference table
  const xrefOffset = currentOffset;
  write('xref\n');
  write(`0 ${totalObjects + 1}\n`);
  write('0000000000 65535 f \n');
  for (const offset of offsets) {
    write(`${offset.toString().padStart(10, '0')} 00000 n \n`);
  }

  // Trailer
  write('trailer\n');
  write(`<< /Size ${totalObjects + 1} /Root 1 0 R >>\n`);
  write('startxref\n');
  write(`${xrefOffset}\n`);
  write('%%EOF\n');

  // Merge all parts
  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const part of parts) {
    result.set(part, pos);
    pos += part.length;
  }

  return result;
}

/**
 * Extract JPEG dimensions from the SOF0/SOF2 marker.
 */
function getJpegDimensions(data: Uint8Array): { width: number; height: number } {
  let offset = 0;
  // Skip SOI marker
  if (data[0] === 0xff && data[1] === 0xd8) {
    offset = 2;
  }
  while (offset < data.length - 1) {
    if (data[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = data[offset + 1];
    // SOF0 (0xC0) or SOF2 (0xC2) contain dimensions
    if (marker === 0xc0 || marker === 0xc2) {
      const height = (data[offset + 5] << 8) | data[offset + 6];
      const width = (data[offset + 7] << 8) | data[offset + 8];
      return { width, height };
    }
    // Skip to next marker
    const length = (data[offset + 2] << 8) | data[offset + 3];
    offset += 2 + length;
  }
  // Fallback
  return { width: 595, height: 842 }; // A4 size in points
}

/**
 * Compress text content using the Compression Streams API (gzip).
 */
async function compressText(blob: Blob): Promise<Blob> {
  try {
    if (typeof CompressionStream !== 'undefined') {
      const cs = new CompressionStream('gzip');
      const compressed = blob.stream().pipeThrough(cs);
      return new Response(compressed).blob();
    }
    // Fallback: use fflate
    const text = await blob.text();
    const data = strToU8(text);
    const zipped = zipSync({ 'data.txt': data }, { level: 9 });
    return new Blob([zipped], { type: 'application/zip' });
  } catch {
    return blob;
  }
}

/**
 * Optimize SVG by stripping comments, unnecessary whitespace, and metadata.
 */
async function optimizeSvg(blob: Blob): Promise<Blob> {
  try {
    let text = await blob.text();
    // Remove comments
    text = text.replace(/<!--[\s\S]*?-->/g, '');
    // Remove unnecessary whitespace
    text = text.replace(/\s+/g, ' ');
    // Remove metadata elements
    text = text.replace(/<metadata[\s\S]*?<\/metadata>/gi, '');
    // Trim attributes whitespace
    text = text.replace(/\s*=\s*/g, '=');
    return new Blob([text.trim()], { type: 'image/svg+xml' });
  } catch {
    return blob;
  }
}

/**
 * Compress a file as a ZIP archive using fflate.
 */
async function compressAsZip(blob: Blob, fileName: string): Promise<Blob> {
  try {
    const buffer = await blob.arrayBuffer();
    const data = new Uint8Array(buffer);
    const files: Zippable = { [fileName]: data };
    const zipped = zipSync(files, { level: 9 });
    return new Blob([zipped], { type: 'application/zip' });
  } catch {
    return blob;
  }
}

/**
 * Create a ZIP archive from multiple files.
 */
export async function createZipArchive(
  files: { name: string; blob: Blob }[]
): Promise<Blob> {
  const zipFiles: Zippable = {};
  for (const file of files) {
    const buffer = await file.blob.arrayBuffer();
    zipFiles[file.name] = new Uint8Array(buffer);
  }
  const zipped = zipSync(zipFiles, { level: 6 });
  return new Blob([zipped], { type: 'application/zip' });
}

function isTextMimeType(mimeType: string): boolean {
  return (
    mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/xml' ||
    mimeType === 'application/javascript'
  );
}

function getCompressedFileName(
  originalName: string,
  originalMime: string,
  newMime: string
): string {
  if (newMime === 'application/zip' && originalMime !== 'application/zip') {
    return `${originalName}.zip`;
  }
  if (newMime === 'application/gzip') {
    return `${originalName}.gz`;
  }
  return originalName;
}

async function compressImageAtQuality(
  blob: Blob,
  options: CompressionOptions,
  mimeType: string
): Promise<{ blob: Blob; quality: number }> {
  try {
    let targetBlob = blob;
    if (options.colorMode === 'grayscale') {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.src = URL.createObjectURL(blob);
        image.onload = () => resolve(image);
        image.onerror = reject;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      for (let j = 0; j < data.length; j += 4) {
        const brightness = 0.3 * data[j] + 0.59 * data[j + 1] + 0.11 * data[j + 2];
        data[j] = brightness;
        data[j + 1] = brightness;
        data[j + 2] = brightness;
      }
      ctx.putImageData(imgData, 0, 0);
      targetBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b || new Blob()), mimeType);
      });
      URL.revokeObjectURL(img.src);
    }

    const fileToCompress = new File([targetBlob], 'image', { type: mimeType });
    const scale = (options.resolutionScale ?? options.quality) / 100;

    const compressed = await imageCompression(fileToCompress, {
      maxSizeMB: 50,
      maxWidthOrHeight: Math.max(100, Math.round(4096 * scale)),
      useWebWorker: true,
      initialQuality: options.quality / 100,
    });
    return { blob: compressed, quality: options.quality };
  } catch {
    return { blob, quality: 100 };
  }
}

async function compressPdfAtQuality(
  blob: Blob,
  options: CompressionOptions
): Promise<{ blob: Blob; quality: number }> {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const numPages = pdf.numPages;

    const jpegQuality = options.quality / 100;
    const scale = (options.resolutionScale ?? options.quality) / 100;

    const pageBlobs: Blob[] = [];
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(viewport.width, 1);
      canvas.height = Math.max(viewport.height, 1);
      const ctx = canvas.getContext('2d')!;

      await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

      if (options.colorMode === 'grayscale') {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        for (let j = 0; j < data.length; j += 4) {
          const brightness = 0.3 * data[j] + 0.59 * data[j + 1] + 0.11 * data[j + 2];
          data[j] = brightness;
          data[j + 1] = brightness;
          data[j + 2] = brightness;
        }
        ctx.putImageData(imgData, 0, 0);
      }

      const pageBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(
          (b) => resolve(b || new Blob()),
          'image/jpeg',
          jpegQuality
        );
      });
      pageBlobs.push(pageBlob);
    }

    const pdfBytes = await buildPdfFromImages(pageBlobs, pdf);
    const resultBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });

    return { blob: resultBlob, quality: options.quality };
  } catch (err) {
    console.error('PDF quality compression failed:', err);
    return { blob, quality: 100 };
  }
}
