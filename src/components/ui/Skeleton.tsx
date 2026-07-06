import React from 'react';

interface SkeletonProps {
  className?: string;
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-shimmer rounded-xl ${className}`}
          aria-hidden="true"
        />
      ))}
    </>
  );
};

export const FileCardSkeleton: React.FC = () => (
  <div className="glass-card p-4 rounded-2xl">
    <Skeleton className="w-full h-32 mb-3 rounded-xl" />
    <Skeleton className="w-3/4 h-4 mb-2" />
    <Skeleton className="w-1/2 h-3 mb-1" />
    <Skeleton className="w-1/3 h-3" />
  </div>
);

export const FileListSkeleton: React.FC = () => (
  <div className="flex items-center gap-4 p-3 border-b border-[var(--border-color)]">
    <Skeleton className="w-10 h-10 rounded-lg" />
    <div className="flex-1">
      <Skeleton className="w-1/3 h-4 mb-1.5" />
      <Skeleton className="w-1/5 h-3" />
    </div>
    <Skeleton className="w-16 h-3" />
  </div>
);

export const DashboardSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="glass-card p-5 rounded-2xl">
        <Skeleton className="w-10 h-10 rounded-xl mb-3" />
        <Skeleton className="w-1/2 h-6 mb-2" />
        <Skeleton className="w-2/3 h-3" />
      </div>
    ))}
  </div>
);
