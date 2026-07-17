export interface CompressionOptions {
  quality: number;                 // 1 - 100
  resolutionScale?: number;        // 5 - 100
  colorMode?: 'color' | 'grayscale';
  removeMetadata?: boolean;
  removeThumbnails?: boolean;
  flattenAnnotations?: boolean;
  optimizeFonts?: boolean;
  optimizeObjectStreams?: boolean;
  targetDpi?: number;              // 72, 96, 150, 200, 300
}

export interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  savedBytes: number;
  savedPercent: number;
  compressionRatio: number;
  imagesOptimized: number;
  avgDpiBefore: number;
  avgDpiAfter: number;
  metadataRemoved: boolean;
  fontsOptimized: boolean;
  warnings: string[];
}

export interface CompressionProgress {
  step: 'loading' | 'analyzing' | 'extracting' | 'optimizing' | 'building' | 'complete';
  percentage: number;
  statusText: string;
}

export interface ImageMetadata {
  refId: string;
  width: number;
  height: number;
  originalSize: number;
  type: string;
  hasAlpha: boolean;
  dpi?: number;
}
