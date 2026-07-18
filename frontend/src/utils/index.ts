/**
 * Utility functions used across the application.
 */

/**
 * Generate a unique ID using crypto.randomUUID with fallback.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Sanitize a file name to prevent XSS and path traversal.
 */
export function sanitizeFileName(name: string): string {
  let sanitized = name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') // Remove invalid chars
    .replace(/\.{2,}/g, '.') // Prevent path traversal
    .replace(/^\.+/, '') // Remove leading dots
    .trim();

  if (sanitized.length > 255) {
    const ext = getExtension(sanitized);
    const base = sanitized.slice(0, 255 - ext.length - 1);
    sanitized = ext ? `${base}.${ext}` : base;
  }

  return sanitized || 'unnamed';
}

/**
 * Extract file extension (without dot, lowercase).
 */
export function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot <= 0) return '';
  return filename.slice(lastDot + 1).toLowerCase();
}

/**
 * Get file name without extension.
 */
export function getBaseName(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot <= 0) return filename;
  return filename.slice(0, lastDot);
}

/**
 * Format bytes to human-readable string.
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format a duration in seconds to a readable string.
 */
export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '--';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

/**
 * Format speed in bytes/second to readable string.
 */
export function formatSpeed(bytesPerSec: number): string {
  if (!isFinite(bytesPerSec) || bytesPerSec <= 0) return '--';
  return `${formatBytes(bytesPerSec)}/s`;
}

/**
 * Format a date to a relative time string.
 */
export function formatRelativeDate(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

/**
 * Debounce function.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Get MIME type from extension.
 */
export function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    // Images
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
    webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', ico: 'image/x-icon',
    // Video
    mp4: 'video/mp4', mkv: 'video/x-matroska', avi: 'video/x-msvideo',
    mov: 'video/quicktime', webm: 'video/webm',
    // Audio
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', flac: 'audio/flac',
    aac: 'audio/aac', m4a: 'audio/mp4',
    // Documents
    pdf: 'application/pdf', doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain', rtf: 'application/rtf', md: 'text/markdown',
    // Spreadsheets
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv',
    // Presentations
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Archives
    zip: 'application/zip', rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed', tar: 'application/x-tar',
    gz: 'application/gzip',
    // Code
    json: 'application/json', xml: 'application/xml', html: 'text/html',
    css: 'text/css', js: 'text/javascript', ts: 'text/typescript',
    py: 'text/x-python', java: 'text/x-java', cpp: 'text/x-c++src',
    c: 'text/x-csrc', php: 'text/x-php', sql: 'text/x-sql',
    // Other
    exe: 'application/x-msdownload', apk: 'application/vnd.android.package-archive',
    iso: 'application/x-iso9660-image', psd: 'application/x-photoshop',
    ai: 'application/postscript',
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
}

/**
 * Check if a file extension is previewable as an image.
 */
export function isImageExtension(ext: string): boolean {
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext.toLowerCase());
}

export function isVideoExtension(ext: string): boolean {
  return ['mp4', 'webm', 'mov', 'avi'].includes(ext.toLowerCase());
}

export function isAudioExtension(ext: string): boolean {
  return ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext.toLowerCase());
}

export function isTextExtension(ext: string): boolean {
  return [
    'txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'ts', 'jsx', 'tsx',
    'py', 'java', 'cpp', 'c', 'php', 'sql', 'yaml', 'yml', 'sh', 'bat',
    'rb', 'go', 'rs', 'swift', 'kt', 'rtf', 'csv', 'log', 'ini', 'cfg',
    'env', 'gitignore', 'dockerfile', 'makefile',
  ].includes(ext.toLowerCase());
}

export function isPdfExtension(ext: string): boolean {
  return ext.toLowerCase() === 'pdf';
}

/**
 * Get syntax highlighter language from file extension.
 */
export function getLanguageForExtension(ext: string): string {
  const map: Record<string, string> = {
    js: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx',
    py: 'python', java: 'java', cpp: 'cpp', c: 'c',
    php: 'php', sql: 'sql', html: 'html', css: 'css',
    json: 'json', xml: 'xml', yaml: 'yaml', yml: 'yaml',
    sh: 'bash', bat: 'batch', rb: 'ruby', go: 'go',
    rs: 'rust', swift: 'swift', kt: 'kotlin', md: 'markdown',
    csv: 'csv', txt: 'text',
  };
  return map[ext.toLowerCase()] || 'text';
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export { lazyWithRetry } from './lazy';

