import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { FileGrid, FileList } from '@/components/files';

const FavoritesPage: React.FC = () => {
  const viewMode = useAppStore((s) => s.viewMode);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const sortOption = useAppStore((s) => s.sortOption);

  const documents = useAppStore((s) => s.documents);
  const favorites = useMemo(() => documents.filter((d) => d.isDeleted === 0 && d.isFavorite === 1), [documents]);

  const files = useMemo(() => {
    if (!favorites) return [];
    let result = favorites;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(q));
    }
    return result;
  }, [favorites, searchQuery, sortOption]);

  const loading = false;

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
          Favorites
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {loading ? 'Loading...' : `${files.length} favorite files`}
        </p>
      </div>

      {viewMode === 'grid' ? (
        <FileGrid files={files} loading={loading} />
      ) : (
        <FileList files={files} loading={loading} />
      )}

      {!loading && files.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
            <Star className="w-10 h-10 text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No favorites yet</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Star files to add them to your favorites
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default FavoritesPage;
