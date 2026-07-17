export interface DocFile {
  id: string;
  name: string;
  extension: string;
  mimeType: string;
  size: number;
  tags: string[];
  folderId: string | null;
  isFavorite: 0 | 1;
  isArchived: 0 | 1;
  isDeleted: 0 | 1;
  createdAt: Date;
  modifiedAt: Date;
  uploadedAt: Date;
  deletedAt: Date | null;
  compressedSize: number | null;
  opfsPath: string;
  thumbnailDataUrl: string | null;
  localUrl?: string | null;
  cloudinaryUrl?: string | null;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: Date;
  modifiedAt: Date;
}

export interface AppSettings {
  key: string;
  value: string;
}

export type ViewMode = 'grid' | 'list';
export type ThemeMode = 'dark' | 'light' | 'system';
export type AccentColor = 'blue' | 'purple' | 'teal' | 'rose' | 'amber' | 'emerald' | 'indigo' | 'orange';

export type SortOption =
  | 'newest'
  | 'oldest'
  | 'largest'
  | 'smallest'
  | 'a-z'
  | 'z-a'
  | 'extension'
  | 'recently-modified';

export type FilterOption =
  | 'all'
  | 'images'
  | 'videos'
  | 'audio'
  | 'pdf'
  | 'documents'
  | 'archives'
  | 'code'
  | 'executables'
  | 'favorites'
  | 'large'
  | 'small';

export interface UploadProgress {
  fileId: string;
  fileName: string;
  fileSize: number;
  loaded: number;
  percentage: number;
  speed: number;
  remainingTime: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}

export interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  spaceSaved: number;
  estimatedQuality: number;
  compressionTime: number;
  blob: Blob;
  mimeType: string;
  fileName: string;
}

export interface StorageInfo {
  used: number;
  available: number;
  total: number;
  percentage: number;
}

export interface DashboardStats {
  totalDocuments: number;
  totalSize: number;
  favoritesCount: number;
  compressedCount: number;
  recentlyAdded: DocFile[];
  recentDownloads: string[];
  filesByType: Record<string, number>;
  sizeByType: Record<string, number>;
  weeklyUploads: { day: string; count: number }[];
  monthlyUploads: { month: string; count: number }[];
}

export interface FileCategory {
  label: string;
  extensions: string[];
  color: string;
  icon: string;
}

export const FILE_CATEGORIES: Record<string, FileCategory> = {
  images: {
    label: 'Images',
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff'],
    color: '#f472b6',
    icon: 'Image',
  },
  videos: {
    label: 'Videos',
    extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv', 'm4v'],
    color: '#a78bfa',
    icon: 'Video',
  },
  audio: {
    label: 'Audio',
    extensions: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'wma', 'm4a'],
    color: '#34d399',
    icon: 'Music',
  },
  pdf: {
    label: 'PDF',
    extensions: ['pdf'],
    color: '#f87171',
    icon: 'FileText',
  },
  documents: {
    label: 'Documents',
    extensions: ['doc', 'docx', 'txt', 'rtf', 'odt', 'md'],
    color: '#60a5fa',
    icon: 'FileText',
  },
  spreadsheets: {
    label: 'Spreadsheets',
    extensions: ['xls', 'xlsx', 'csv', 'ods'],
    color: '#4ade80',
    icon: 'Table',
  },
  presentations: {
    label: 'Presentations',
    extensions: ['ppt', 'pptx', 'odp'],
    color: '#fb923c',
    icon: 'Presentation',
  },
  archives: {
    label: 'Archives',
    extensions: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'],
    color: '#fbbf24',
    icon: 'Archive',
  },
  code: {
    label: 'Code',
    extensions: ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'php', 'sql', 'html', 'css', 'json', 'xml', 'yaml', 'yml', 'sh', 'bat', 'rb', 'go', 'rs', 'swift', 'kt'],
    color: '#22d3ee',
    icon: 'Code',
  },
  executables: {
    label: 'Executables',
    extensions: ['exe', 'msi', 'apk', 'dmg', 'app', 'deb', 'rpm'],
    color: '#e879f9',
    icon: 'Cpu',
  },
  design: {
    label: 'Design',
    extensions: ['psd', 'ai', 'fig', 'sketch', 'xd'],
    color: '#c084fc',
    icon: 'Palette',
  },
  disc: {
    label: 'Disc Images',
    extensions: ['iso', 'img', 'bin'],
    color: '#94a3b8',
    icon: 'Disc',
  },
};

export function getCategoryForExtension(ext: string): FileCategory | null {
  const lower = ext.toLowerCase();
  for (const cat of Object.values(FILE_CATEGORIES)) {
    if (cat.extensions.includes(lower)) return cat;
  }
  return null;
}

export function getFileTypeCategory(ext: string): string {
  const lower = ext.toLowerCase();
  for (const [key, cat] of Object.entries(FILE_CATEGORIES)) {
    if (cat.extensions.includes(lower)) return key;
  }
  return 'other';
}
