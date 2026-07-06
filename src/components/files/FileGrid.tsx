import React, { useMemo, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { VirtuosoGrid } from 'react-virtuoso';
import { FileCard } from './FileCard';
import { FileCardSkeleton } from '@/components/ui';
import type { DocFile } from '@/types';

interface FileGridProps {
  files: DocFile[];
  loading?: boolean;
  isTrash?: boolean;
}

const gridComponents = {
  List: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ style, children, ...props }, ref) => (
      <div
        ref={ref}
        {...props}
        style={{ ...style }}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
      >
        {children}
      </div>
    )
  ),
  Item: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props} className="w-full">
      {children}
    </div>
  ),
};

gridComponents.List.displayName = 'GridList';

export const FileGrid: React.FC<FileGridProps> = ({ files, loading = false, isTrash = false }) => {
  const itemContent = useCallback(
    (index: number) => <FileCard key={files[index].id} file={files[index]} isTrash={isTrash} />,
    [files, isTrash]
  );

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <FileCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return null;
  }

  // Use virtualized grid for large lists, regular grid for small
  if (files.length > 50) {
    return (
      <VirtuosoGrid
        totalCount={files.length}
        components={gridComponents}
        itemContent={itemContent}
        style={{ height: 'calc(100vh - 200px)' }}
        overscan={200}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      <AnimatePresence mode="popLayout">
        {files.map((file) => (
          <FileCard key={file.id} file={file} isTrash={isTrash} />
        ))}
      </AnimatePresence>
    </div>
  );
};
