import React, { useState, useEffect } from 'react';
import { Modal, Button } from '@/components/ui';
import { useAppStore } from '@/store/app-store';
import { renameDocument } from '@/services/file-service';
import { getBaseName, getExtension } from '@/utils';
import toast from 'react-hot-toast';

export const RenameDialog: React.FC = () => {
  const fileId = useAppStore((s) => s.renameDialogFileId);
  const setFileId = useAppStore((s) => s.setRenameDialogFileId);
  const file = useAppStore((s) => s.documents.find((d) => d.id === fileId));

  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (file) {
      setNewName(file.name);
    }
  }, [file]);

  const isOpen = !!fileId;

  const handleRename = async () => {
    if (!fileId || !newName.trim()) return;
    await renameDocument(fileId, newName.trim());
    toast.success('File renamed');
    setFileId(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={() => setFileId(null)} title="Rename File" maxWidth="max-w-sm">
      <div className="space-y-4">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); }}
          className="input-glass w-full"
          autoFocus
          placeholder="Enter new file name"
        />
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setFileId(null)}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleRename} disabled={!newName.trim()}>
            Rename
          </Button>
        </div>
      </div>
    </Modal>
  );
};
