import imageCompression from 'browser-image-compression';
import type { CompressionOptions } from './types';
import type { ExtractedImage } from './image-extractor';

export class ImageOptimizer {
  static async optimize(
    image: ExtractedImage,
    options: CompressionOptions
  ): Promise<{ blob: Blob; width: number; height: number; filter: string }> {
    const originalSize = image.blob.size;

    // RULE: If image is below 150 KB, skip compression to preserve icons/logos
    if (originalSize < 150 * 1024) {
      return {
        blob: image.blob,
        width: image.width,
        height: image.height,
        filter: image.filterName,
      };
    }

    try {
      // Determine format conversion
      let outputMime = image.mimeType;
      
      // RULE: Convert PNG -> JPEG for large photos/scans if there is no transparency
      if (image.mimeType === 'image/png' && !image.hasAlpha && (image.width > 400 || image.height > 400)) {
        outputMime = 'image/jpeg';
      }

      // If PNG has transparency, keep PNG to preserve graphic transparency
      if (image.hasAlpha) {
        outputMime = 'image/png';
      }

      // Calculate new dimensions based on Target DPI
      let targetWidth = image.width;
      let targetHeight = image.height;

      if (options.targetDpi) {
        // Estimate original DPI assuming page width is standard letter (8.5 inches / 612 pt)
        // If image is portrait/landscape, estimate based on largest dimension matching A4/Letter
        const documentInches = Math.max(image.width, image.height) / 300; // rough default original DPI estimate
        const estimatedOriginalDpi = documentInches > 0 ? image.width / 8.5 : 300;

        if (estimatedOriginalDpi > options.targetDpi) {
          const ratio = options.targetDpi / estimatedOriginalDpi;
          targetWidth = Math.max(100, Math.round(image.width * ratio));
          targetHeight = Math.max(100, Math.round(image.height * ratio));
        }
        // RULE: If image resolution is below target, do not upscale!
      }

      // Apply resolutionScale custom override if targetDpi is not used
      if (!options.targetDpi && options.resolutionScale) {
        const scale = options.resolutionScale / 100;
        targetWidth = Math.max(50, Math.round(image.width * scale));
        targetHeight = Math.max(50, Math.round(image.height * scale));
      }

      // Draw image to canvas to perform resize, format conversion, and grayscale
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const imageEl = new Image();
        imageEl.src = URL.createObjectURL(image.blob);
        imageEl.onload = () => resolve(imageEl);
        imageEl.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d')!;

      // Draw resized image
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      URL.revokeObjectURL(img.src);

      // RULE: Convert to grayscale for black-and-white scans / gray requested
      if (options.colorMode === 'grayscale') {
        const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          data[i] = gray;     // R
          data[i + 1] = gray; // G
          data[i + 2] = gray; // B
        }
        ctx.putImageData(imgData, 0, 0);
      }

      // Export from canvas
      let compressedBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(
          (b) => resolve(b || new Blob()),
          outputMime,
          outputMime === 'image/jpeg' ? options.quality / 100 : undefined
        );
      });

      // Double-check if the compressed file size is actually smaller. 
      // If compression somehow expanded it (common with lossless png compression of already small images),
      // fall back to the original image blob.
      if (compressedBlob.size >= originalSize) {
        return {
          blob: image.blob,
          width: image.width,
          height: image.height,
          filter: image.filterName,
        };
      }

      return {
        blob: compressedBlob,
        width: targetWidth,
        height: targetHeight,
        filter: outputMime === 'image/jpeg' ? 'DCTDecode' : 'FlateDecode',
      };
    } catch (err) {
      console.warn('Image optimization failed, using original:', err);
      return {
        blob: image.blob,
        width: image.width,
        height: image.height,
        filter: image.filterName,
      };
    }
  }
}
