import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Upload, FolderPlus, CheckSquare } from 'lucide-react';
import { useAppStore } from '@/store/app-store';

export const FloatingActionButton: React.FC = () => {
  const setUploadModalOpen = useAppStore((s) => s.setUploadModalOpen);
  const setSelectionMode = useAppStore((s) => s.setSelectionMode);
  const selectionMode = useAppStore((s) => s.selectionMode);
  const [isOpen, setIsOpen] = React.useState(false);

  const actions = [
    {
      icon: <Upload className="w-4 h-4" />,
      label: 'Upload Files',
      onClick: () => { setUploadModalOpen(true); setIsOpen(false); },
    },
    {
      icon: <CheckSquare className="w-4 h-4" />,
      label: selectionMode ? 'Exit Selection' : 'Select Files',
      onClick: () => { setSelectionMode(!selectionMode); setIsOpen(false); },
    },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
      {/* Sub Actions */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="flex flex-col gap-2 mb-2"
        >
          {actions.map((action, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={action.onClick}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl glass-strong shadow-lg text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer whitespace-nowrap"
            >
              {action.icon}
              {action.label}
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Main FAB */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-2xl btn-accent shadow-lg flex items-center justify-center cursor-pointer"
        style={{ boxShadow: '0 8px 32px var(--accent-glow)' }}
      >
        <motion.div animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
          <Plus className="w-6 h-6" />
        </motion.div>
      </motion.button>
    </div>
  );
};
