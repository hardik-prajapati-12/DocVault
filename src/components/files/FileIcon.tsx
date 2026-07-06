import React from 'react';
import {
  FileText, Image, Video, Music, Archive, Code, Cpu,
  Palette, Disc, File, Table2, Presentation,
} from 'lucide-react';
import { getFileTypeCategory } from '@/types';
import { FILE_CATEGORIES } from '@/types';

interface FileIconProps {
  extension: string;
  size?: number;
  className?: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number; color?: string }>> = {
  images: Image,
  videos: Video,
  audio: Music,
  pdf: FileText,
  documents: FileText,
  spreadsheets: Table2,
  presentations: Presentation,
  archives: Archive,
  code: Code,
  executables: Cpu,
  design: Palette,
  disc: Disc,
};

export const FileIcon: React.FC<FileIconProps> = ({ extension, size = 24, className = '' }) => {
  const category = getFileTypeCategory(extension);
  const IconComponent = iconMap[category] || File;
  const color = FILE_CATEGORIES[category]?.color || '#94a3b8';

  return (
    <div
      className={`flex items-center justify-center rounded-xl ${className}`}
      style={{
        backgroundColor: `${color}15`,
        width: size * 1.8,
        height: size * 1.8,
      }}
    >
      <IconComponent size={size} color={color} />
    </div>
  );
};
