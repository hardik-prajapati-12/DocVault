/**
 * Custom hook for keyboard shortcuts.
 */

import { useEffect } from 'react';
import { useAppStore } from '@/store/app-store';

export function useKeyboardShortcuts() {
  const setUploadModalOpen = useAppStore((s) => s.setUploadModalOpen);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const clearSelection = useAppStore((s) => s.clearSelection);
  const previewFileId = useAppStore((s) => s.previewFileId);
  const setPreviewFileId = useAppStore((s) => s.setPreviewFileId);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Allow Escape to blur inputs
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      // Ctrl/Cmd + U → Upload
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        setUploadModalOpen(true);
      }

      // Ctrl/Cmd + , → Settings
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setSettingsOpen(true);
      }

      // / or Ctrl+K → Focus search
      if (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key === 'k')) {
        e.preventDefault();
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.focus();
      }

      // Escape → Close modals / clear selection
      if (e.key === 'Escape') {
        if (previewFileId) {
          setPreviewFileId(null);
        } else {
          clearSelection();
          setSearchQuery('');
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setUploadModalOpen, setSettingsOpen, setSearchQuery, clearSelection, previewFileId, setPreviewFileId]);
}
