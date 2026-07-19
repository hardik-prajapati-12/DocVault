import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Archive, Lock, Unlock, KeyRound, ShieldAlert, 
  CheckCircle, RefreshCw, XCircle, Eye, EyeOff,
  CheckSquare, X, Download, Star, Trash2, Folder as FolderIcon, MoreVertical, Copy, Edit3
} from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useConfirmStore } from '@/store/confirm-store';
import { FileGrid, FileList } from '@/components/files';
import { Button, ContextMenu, type ContextMenuItem, type ContextMenuRef } from '@/components/ui';
import { bulkSoftDelete, bulkArchive, bulkFavorite, getFileBlob, deleteFolder } from '@/services/file-service';
import { createZipArchive } from '@/services/compression/compression-service';
import type { Folder, DocFile, SortOption } from '@/types';
import { formatRelativeDate } from '@/utils';
import toast from 'react-hot-toast';

function sortFolders(folders: Folder[], sort: SortOption): Folder[] {
  const sorted = [...folders];
  switch (sort) {
    case 'newest':
      return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case 'oldest':
      return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    case 'recently-modified':
      return sorted.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
    case 'a-z':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'z-a':
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    default:
      return sorted;
  }
}

function sortFiles(files: DocFile[], sort: SortOption): DocFile[] {
  const sorted = [...files];
  switch (sort) {
    case 'newest':
      return sorted.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    case 'oldest':
      return sorted.sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());
    case 'largest':
      return sorted.sort((a, b) => b.size - a.size);
    case 'smallest':
      return sorted.sort((a, b) => a.size - b.size);
    case 'a-z':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'z-a':
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case 'extension':
      return sorted.sort((a, b) => a.extension.localeCompare(b.extension));
    case 'recently-modified':
      return sorted.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
    default:
      return sorted;
  }
}

type VaultState = 'setup' | 'unlock' | 'recovery' | 'reset' | 'view';

const SECURITY_QUESTIONS = [
  'What was the name of your first school?',
  "What is your mother's maiden name?",
  'What is the name of the city where you were born?',
  'What is your favorite book or movie?',
  'What was the name of your first pet?',
];

export const ArchivePage: React.FC = () => {
  const viewMode = useAppStore((s) => s.viewMode);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const sortOption = useAppStore((s) => s.sortOption);

  const navigate = useNavigate();
  const confirm = useConfirmStore();
  const folders = useAppStore((s) => s.folders) ?? [];
  const documents = useAppStore((s) => s.documents);

  const selectedIds = useAppStore((s) => s.selectedIds);
  const selectionMode = useAppStore((s) => s.selectionMode);
  const clearSelection = useAppStore((s) => s.clearSelection);
  const setSelectionMode = useAppStore((s) => s.setSelectionMode);
  const selectAll = useAppStore((s) => s.selectAll);
  const toggleSelection = useAppStore((s) => s.toggleSelection);

  // Clear selections on unmount
  useEffect(() => {
    return () => {
      clearSelection();
      setSelectionMode(false);
    };
  }, [clearSelection, setSelectionMode]);

  // Vault states
  const [vaultState, setVaultState] = useState<VaultState>('unlock');
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Form Inputs
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Password Visibility States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const archivedFolders = useMemo(() => folders.filter((f) => {
    if (f.isDeleted === 1 || f.isArchived !== 1) return false;
    // Only show top-level archived folders (whose parent is not also archived)
    if (f.parentId) {
      const parent = folders.find((p) => p.id === f.parentId);
      if (parent && parent.isArchived === 1) return false;
    }
    return true;
  }), [folders]);
  const archivedFiles = useMemo(() => documents.filter((d) => {
    if (d.isDeleted !== 0 || d.isArchived !== 1) return false;
    // Only show files not inside an archived folder
    if (d.folderId) {
      const parentFolder = folders.find((f) => f.id === d.folderId);
      if (parentFolder && parentFolder.isArchived === 1) return false;
    }
    return true;
  }), [documents, folders]);

  const displayFolders = useMemo(() => {
    let filtered = archivedFolders;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = archivedFolders.filter((f) => f.name.toLowerCase().includes(q));
    }
    return sortFolders(filtered, sortOption);
  }, [archivedFolders, searchQuery, sortOption]);

  const displayFiles = useMemo(() => {
    let filtered = archivedFiles;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = archivedFiles.filter((f) => f.name.toLowerCase().includes(q));
    }
    return sortFiles(filtered, sortOption);
  }, [archivedFiles, searchQuery, sortOption]);

  const currentItems = useMemo(() => {
    return [
      ...displayFolders.map((f) => ({ id: f.id, type: 'folder' })),
      ...displayFiles.map((d) => ({ id: d.id, type: 'file' })),
    ];
  }, [displayFolders, displayFiles]);

  const loading = false;

  const getFilesFromFolder = (folderId: string): string[] => {
    const fileIds: string[] = [];
    documents.forEach((d) => {
      if (d.folderId === folderId) fileIds.push(d.id);
    });
    folders.forEach((sub) => {
      if (sub.parentId === folderId) fileIds.push(...getFilesFromFolder(sub.id));
    });
    return fileIds;
  };

  // SHA-256 Hashing helper
  const hashText = async (text: string): Promise<string> => {
    const msgUint8 = new TextEncoder().encode(text.trim().toLowerCase());
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  // Determine initial state based on whether a password exists in localStorage
  useEffect(() => {
    const pwdHash = localStorage.getItem('archive_pwd_hash');
    if (!pwdHash) {
      setVaultState('setup');
    } else if (isUnlocked) {
      setVaultState('view');
    } else {
      setVaultState('unlock');
    }
  }, [isUnlocked]);

  // Setup Password Submit
  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < 4) {
      setErrorMsg('Password must be at least 4 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (!securityAnswer.trim()) {
      setErrorMsg('Please provide a security answer.');
      return;
    }

    try {
      const pwdHash = await hashText(password);
      const answerHash = await hashText(securityAnswer);

      localStorage.setItem('archive_pwd_hash', pwdHash);
      localStorage.setItem('archive_security_question', selectedQuestion);
      localStorage.setItem('archive_security_answer_hash', answerHash);

      setIsUnlocked(true);
      setVaultState('view');
      toast.success('Archive password set successfully!');
      
      // Clear forms
      setPassword('');
      setConfirmPassword('');
      setSecurityAnswer('');
      setShowPassword(false);
      setShowConfirmPassword(false);
    } catch (err) {
      setErrorMsg('Setup failed. Please try again.');
    }
  };

  // Unlock Submit
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const storedHash = localStorage.getItem('archive_pwd_hash');
    if (!storedHash) {
      setVaultState('setup');
      return;
    }

    const enteredHash = await hashText(password);
    if (enteredHash === storedHash) {
      setIsUnlocked(true);
      setVaultState('view');
      setPassword('');
      setShowPassword(false);
    } else {
      setErrorMsg('Incorrect password. Please try again.');
    }
  };

  // Recovery Submit
  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const storedAnswerHash = localStorage.getItem('archive_security_answer_hash');
    if (!storedAnswerHash) {
      setErrorMsg('Recovery details missing. Please contact administrator.');
      return;
    }

    const enteredAnswerHash = await hashText(securityAnswer);
    if (enteredAnswerHash === storedAnswerHash) {
      setVaultState('reset');
      setSecurityAnswer('');
    } else {
      setErrorMsg('Incorrect security answer.');
    }
  };

  // Reset Password Submit
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < 4) {
      setErrorMsg('Password must be at least 4 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (!securityAnswer.trim()) {
      setErrorMsg('Please provide a security answer.');
      return;
    }

    try {
      const pwdHash = await hashText(password);
      const answerHash = await hashText(securityAnswer);

      localStorage.setItem('archive_pwd_hash', pwdHash);
      localStorage.setItem('archive_security_question', selectedQuestion);
      localStorage.setItem('archive_security_answer_hash', answerHash);

      setIsUnlocked(true);
      setVaultState('view');
      toast.success('Archive password reset successfully!');
      
      // Clear forms
      setPassword('');
      setConfirmPassword('');
      setSecurityAnswer('');
      setShowPassword(false);
      setShowConfirmPassword(false);
    } catch (err) {
      setErrorMsg('Reset failed. Please try again.');
    }
  };

  const handleLock = () => {
    setIsUnlocked(false);
    setVaultState('unlock');
    setPassword('');
    setShowPassword(false);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    const selectedArray = Array.from(selectedIds);
    const fileIds = selectedArray.filter((id) => documents.some((d) => d.id === id));
    const folderIds = selectedArray.filter((id) => folders.some((f) => f.id === id));
    const totalCount = fileIds.length + folderIds.length;

    confirm.triggerConfirm({
      title: 'Move to Trash',
      message: `Are you sure you want to move ${totalCount} selected item${totalCount > 1 ? 's' : ''} to the trash?${folderIds.length > 0 ? ' All files inside the selected folders will also be moved to trash.' : ''}`,
      confirmText: 'Move to Trash',
      variant: 'danger',
      onConfirm: async () => {
        if (fileIds.length > 0) {
          await bulkSoftDelete(fileIds);
        }
        if (folderIds.length > 0) {
          await fetch('/api/folders/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: folderIds }),
          });
        }
        toast.success(`Moved selected items to trash`);
        clearSelection();
        await useAppStore.getState().fetchData();
      },
    });
  };

  const handleBulkFavorite = async () => {
    if (selectedIds.size === 0) return;
    const selectedArray = Array.from(selectedIds);
    const fileIds = selectedArray.filter((id) => documents.some((d) => d.id === id));
    const folderIds = selectedArray.filter((id) => folders.some((f) => f.id === id));

    if (fileIds.length > 0) {
      await bulkFavorite(fileIds, 1);
    }
    for (const id of folderIds) {
      await fetch(`/api/folders/${id}/favorite`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: 1 }),
      });
    }
    toast.success(`Added selected items to favorites`);
    clearSelection();
    await useAppStore.getState().fetchData();
  };

  const handleBulkArchive = () => {
    if (selectedIds.size === 0) return;
    const selectedArray = Array.from(selectedIds);
    const fileIds = selectedArray.filter((id) => documents.some((d) => d.id === id));
    const folderIds = selectedArray.filter((id) => folders.some((f) => f.id === id));
    const totalCount = fileIds.length + folderIds.length;

    confirm.triggerConfirm({
      title: 'Unarchive Items',
      message: `Are you sure you want to unarchive ${totalCount} selected item${totalCount > 1 ? 's' : ''}? They will be moved back to the main view.`,
      confirmText: 'Unarchive',
      variant: 'primary',
      onConfirm: async () => {
        if (fileIds.length > 0) {
          await bulkArchive(fileIds, 0);
        }
        for (const id of folderIds) {
          await fetch(`/api/folders/${id}/archive`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isArchived: 0 }),
          });
        }
        toast.success(`Removed selected items from archive`);
        clearSelection();
        await useAppStore.getState().fetchData();
      },
    });
  };

  const handleBulkDownload = async () => {
    if (selectedIds.size === 0) return;
    toast.loading('Preparing download...', { id: 'bulk-dl' });
    const fileList: { name: string; blob: Blob }[] = [];
    const selectedArray = Array.from(selectedIds);

    const allFileIds = new Set<string>();
    selectedArray.forEach((id) => {
      if (documents.some((d) => d.id === id)) {
        allFileIds.add(id);
      } else if (folders.some((f) => f.id === id)) {
        getFilesFromFolder(id).forEach((fid) => allFileIds.add(fid));
      }
    });

    for (const id of allFileIds) {
      const doc = documents.find((f) => f.id === id);
      const blob = await getFileBlob(id);
      if (doc && blob) fileList.push({ name: doc.name, blob });
    }
    if (fileList.length > 0) {
      const zip = await createZipArchive(fileList);
      const url = URL.createObjectURL(zip);
      const a = document.createElement('a');
      a.href = url;
      a.download = `docvault-archive-${fileList.length}files.zip`;
      a.click();
      URL.revokeObjectURL(url);
    }
    toast.success(`Downloaded ${fileList.length} files`, { id: 'bulk-dl' });
    clearSelection();
  };

  return (
    <div className="animate-fade-in min-h-[70vh]">
      <AnimatePresence mode="wait">
        {/* SETUP SCREEN */}
        {vaultState === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-md mx-auto py-12"
          >
            <div className="glass-card p-6 border border-[var(--border-color)] space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Set Archive Password</h2>
                <p className="text-xs text-[var(--text-tertiary)]">Configure password control to lock and protect archived files.</p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSetup} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Create Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password (min 4 chars)"
                      className="w-full pr-10 p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] focus:ring-[var(--accent)] focus:border-[var(--accent)] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors focus:outline-none cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full pr-10 p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] focus:ring-[var(--accent)] focus:border-[var(--accent)] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors focus:outline-none cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Security Question</label>
                  <select
                    value={selectedQuestion}
                    onChange={(e) => setSelectedQuestion(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] focus:ring-[var(--accent)] focus:border-[var(--accent)] focus:outline-none"
                  >
                    {SECURITY_QUESTIONS.map((q, idx) => (
                      <option key={idx} value={q} className="bg-[var(--bg-primary)]">
                        {q}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Security Answer</label>
                  <input
                    type="text"
                    required
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    placeholder="Answer is case-insensitive"
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] focus:ring-[var(--accent)] focus:border-[var(--accent)] focus:outline-none"
                  />
                </div>

                <Button type="submit" className="w-full py-2.5 font-bold">
                  Set Password & Open
                </Button>
              </form>
            </div>
          </motion.div>
        )}

        {/* UNLOCK SCREEN */}
        {vaultState === 'unlock' && (
          <motion.div
            key="unlock"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-md mx-auto py-16"
          >
            <div className="glass-card p-6 border border-[var(--border-color)] space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-xl bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Archive Locked</h2>
                <p className="text-xs text-[var(--text-tertiary)]">Enter archive password to access files.</p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleUnlock} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Archive Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full pr-10 p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] focus:ring-[var(--accent)] focus:border-[var(--accent)] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors focus:outline-none cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg('');
                      setSecurityAnswer('');
                      setVaultState('recovery');
                    }}
                    className="text-[var(--accent)] font-semibold hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>

                <Button type="submit" className="w-full py-2.5 font-bold" icon={<Unlock className="w-4 h-4" />}>
                  Unlock Vault
                </Button>
              </form>
            </div>
          </motion.div>
        )}

        {/* RECOVERY / SECURITY QUESTION SCREEN */}
        {vaultState === 'recovery' && (
          <motion.div
            key="recovery"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-md mx-auto py-16"
          >
            <div className="glass-card p-6 border border-[var(--border-color)] space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
                  <ShieldAlert className="w-6 h-6 animate-bounce" />
                </div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Password Recovery</h2>
                <p className="text-xs text-[var(--text-tertiary)]">Answer your security question below to reset the password.</p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)] text-xs border border-[var(--border-color)]">
                <p className="font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Security Question</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {localStorage.getItem('archive_security_question') || 'No question configured.'}
                </p>
              </div>

              <form onSubmit={handleRecovery} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Your Answer</label>
                  <input
                    type="text"
                    required
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    placeholder="Enter security answer"
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] focus:ring-[var(--accent)] focus:border-[var(--accent)] focus:outline-none"
                  />
                </div>

                <div className="flex gap-3">
                  <Button type="submit" className="flex-1 py-2.5 font-bold">
                    Verify Answer
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setErrorMsg('');
                      setVaultState('unlock');
                    }}
                  >
                    Back
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {/* RESET SCREEN */}
        {vaultState === 'reset' && (
          <motion.div
            key="reset"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-md mx-auto py-12"
          >
            <div className="glass-card p-6 border border-[var(--border-color)] space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Reset Archive Password</h2>
                <p className="text-xs text-[var(--text-tertiary)]">Answer accepted! Please configure a new password and recovery question.</p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Create New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password (min 4 chars)"
                      className="w-full pr-10 p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] focus:ring-[var(--accent)] focus:border-[var(--accent)] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors focus:outline-none cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full pr-10 p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] focus:ring-[var(--accent)] focus:border-[var(--accent)] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors focus:outline-none cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">New Security Question</label>
                  <select
                    value={selectedQuestion}
                    onChange={(e) => setSelectedQuestion(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] focus:ring-[var(--accent)] focus:border-[var(--accent)] focus:outline-none"
                  >
                    {SECURITY_QUESTIONS.map((q, idx) => (
                      <option key={idx} value={q} className="bg-[var(--bg-primary)]">
                        {q}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">New Security Answer</label>
                  <input
                    type="text"
                    required
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    placeholder="Answer is case-insensitive"
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] focus:ring-[var(--accent)] focus:border-[var(--accent)] focus:outline-none"
                  />
                </div>

                <Button type="submit" className="w-full py-2.5 font-bold">
                  Reset Password & Unlock
                </Button>
              </form>
            </div>
          </motion.div>
        )}

        {/* ACTIVE FILE LIST VIEW */}
        {vaultState === 'view' && isUnlocked && (
          <motion.div
            key="view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {(() => {
              const FolderCardWithContext: React.FC<{ folder: Folder }> = ({ folder }) => {
                const contextMenuRef = React.useRef<ContextMenuRef>(null);
                const isSelected = selectedIds.has(folder.id);

                const items: ContextMenuItem[] = [
                  {
                    label: 'Open',
                    icon: <Eye className="w-4 h-4" />,
                    onClick: () => navigate(`/folders/${folder.id}`),
                  },
                  {
                    label: 'Download',
                    icon: <Download className="w-4 h-4" />,
                    onClick: async () => {
                      const fileIds = getFilesFromFolder(folder.id);
                      if (fileIds.length === 0) {
                        toast.error('Folder is empty');
                        return;
                      }
                      toast.loading('Preparing download...', { id: 'folder-dl' });
                      const filesList: { name: string; blob: Blob }[] = [];
                      for (const id of fileIds) {
                        const doc = documents.find((f) => f.id === id);
                        const blob = await getFileBlob(id);
                        if (doc && blob) filesList.push({ name: doc.name, blob });
                      }
                      if (filesList.length > 0) {
                        const zip = await createZipArchive(filesList);
                        const url = URL.createObjectURL(zip);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${folder.name}.zip`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success(`Downloaded ${folder.name}`, { id: 'folder-dl' });
                      } else {
                        toast.error('Could not retrieve file data', { id: 'folder-dl' });
                      }
                    },
                  },
                  {
                    label: folder.isFavorite === 1 ? 'Unfavorite' : 'Favorite',
                    icon: <Star className={`w-4 h-4 ${folder.isFavorite === 1 ? 'text-amber-400 fill-amber-400' : ''}`} />,
                    onClick: async () => {
                      const nextVal = folder.isFavorite === 1 ? 0 : 1;
                      await fetch(`/api/folders/${folder.id}/favorite`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ isFavorite: nextVal }),
                      });
                      toast.success(nextVal === 1 ? 'Added to favorites' : 'Removed from favorites');
                      await useAppStore.getState().fetchData();
                    },
                  },
                  {
                    label: 'Unarchive',
                    icon: <Archive className="w-4 h-4" />,
                    onClick: () => {
                      confirm.triggerConfirm({
                        title: 'Unarchive Folder',
                        message: `Are you sure you want to unarchive "${folder.name}"? All files and folders inside will be unarchived and moved back to the main view.`,
                        confirmText: 'Unarchive',
                        variant: 'primary',
                        onConfirm: async () => {
                          await fetch(`/api/folders/${folder.id}/archive`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ isArchived: 0 }),
                          });
                          toast.success('Unarchived folder');
                          await useAppStore.getState().fetchData();
                        },
                      });
                    },
                    divider: true,
                  },
                  {
                    label: 'Move to Trash',
                    icon: <Trash2 className="w-4 h-4" />,
                    onClick: () => {
                      confirm.triggerConfirm({
                        title: 'Move to Trash',
                        message: `Are you sure you want to move "${folder.name}" to the trash? All files and folders inside will be moved to the trash as well.`,
                        confirmText: 'Move to Trash',
                        variant: 'danger',
                        onConfirm: async () => {
                          await deleteFolder(folder.id);
                          toast.success('Folder moved to trash');
                          await useAppStore.getState().fetchData();
                        },
                      });
                    },
                    variant: 'danger',
                  },
                ];

                const handleClick = (e: React.MouseEvent) => {
                  if (selectionMode) {
                    e.preventDefault();
                    toggleSelection(folder.id);
                  } else {
                    navigate(`/folders/${folder.id}`);
                  }
                };

                return (
                  <ContextMenu ref={contextMenuRef} items={items}>
                    {viewMode === 'grid' ? (
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        onClick={handleClick}
                        className={`glass-card p-4 cursor-pointer group relative flex flex-col justify-between h-32 select-none hover:ring-2 hover:ring-[var(--accent)] transition-all
                          ${isSelected ? 'ring-2 ring-[var(--accent)] bg-[var(--accent-dim)]' : ''}`}
                      >
                        <div className="flex items-start justify-between">
                          {selectionMode ? (
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors
                              ${isSelected ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--text-tertiary)]'}`}
                            >
                              {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)]">
                              <FolderIcon className="w-5 h-5 fill-[var(--accent)]" />
                            </div>
                          )}
                          {!selectionMode && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                contextMenuRef.current?.showMenu(e);
                              }}
                              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[var(--bg-tertiary)] transition-all cursor-pointer"
                              title="Folder actions"
                            >
                              <MoreVertical className="w-4 h-4 text-[var(--text-secondary)]" />
                            </button>
                          )}
                        </div>
                        <div className="mt-2 min-w-0">
                          <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate" title={folder.name}>
                            {folder.name}
                          </h4>
                          <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 flex items-center gap-1">
                            <Archive className="w-2.5 h-2.5 text-[var(--accent)]" /> Archived Folder
                          </p>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClick}
                        className={`flex items-center gap-4 px-4 py-3 border-b border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer group select-none
                          ${isSelected ? 'bg-[var(--accent-dim)]' : ''}`}
                      >
                        {selectionMode && (
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors
                            ${isSelected ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--text-tertiary)]'}`}
                          >
                            {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                          </div>
                        )}

                        <div className="relative flex-shrink-0">
                          <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)]">
                            <FolderIcon className="w-5 h-5 fill-[var(--accent)]" />
                          </div>
                          <Archive className="w-3.5 h-3.5 text-[var(--accent)] absolute -top-1 -right-1 drop-shadow" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{folder.name}</p>
                          <p className="text-xs text-[var(--text-tertiary)]">
                            {folders.filter((f) => f.parentId === folder.id).length} folders •{' '}
                            {documents.filter((d) => d.folderId === folder.id && d.isDeleted === 0).length} files
                          </p>
                        </div>

                        <span className="text-xs text-[var(--text-secondary)] w-20 text-right hidden sm:block">
                          —
                        </span>

                        <span className="text-xs text-[var(--text-tertiary)] uppercase font-medium w-12 text-center hidden md:block">
                          Folder
                        </span>

                        <span className="text-xs text-[var(--text-tertiary)] w-20 text-right hidden lg:block">
                          {formatRelativeDate(folder.createdAt)}
                        </span>

                        {!selectionMode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              contextMenuRef.current?.showMenu(e);
                            }}
                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[var(--bg-tertiary)] transition-all cursor-pointer flex-shrink-0 ml-auto"
                            title="Folder actions"
                          >
                            <MoreVertical className="w-4 h-4 text-[var(--text-secondary)]" />
                          </button>
                        )}
                      </motion.div>
                    )}
                  </ContextMenu>
                );
              };

              return (
                <>
                  <div className="mb-6 flex justify-between items-center">
                    <div>
                      <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Archive className="w-6 h-6 text-[var(--accent)]" />
                        Archive
                      </h1>
                      <p className="text-sm text-[var(--text-secondary)] mt-1">
                        {loading ? 'Loading...' : `${displayFolders.length} folders, ${displayFiles.length} files`}
                      </p>
                    </div>

                    <div className="flex gap-2.5">
                      {currentItems.length > 0 && (
                        <Button
                          variant={selectionMode ? 'ghost' : 'secondary'}
                          onClick={() => {
                            if (selectionMode) {
                              clearSelection();
                              setSelectionMode(false);
                            } else {
                              setSelectionMode(true);
                            }
                          }}
                          icon={selectionMode ? <X className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
                        >
                          {selectionMode ? 'Close Selection' : 'Select Items'}
                        </Button>
                      )}
                      <Button variant="secondary" onClick={handleLock} icon={<Lock className="w-4 h-4" />}>
                        Lock Archive
                      </Button>
                    </div>
                  </div>

                  {/* Bulk Actions Bar */}
                  {selectionMode && selectedIds.size > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 mb-4 p-3 rounded-xl glass-strong"
                    >
                      <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
                      <span className="text-sm text-[var(--text-primary)] font-medium">
                        {selectedIds.size} selected
                      </span>
                      <div className="flex gap-2 ml-auto">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => selectAll(currentItems.map((item) => item.id))}
                        >
                          Select All
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleBulkDownload}
                          icon={<Download className="w-3.5 h-3.5" />}
                        >
                          Download
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleBulkFavorite}
                          icon={<Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                        >
                          Favorite
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleBulkArchive}
                          icon={<Archive className="w-3.5 h-3.5" />}
                        >
                          Unarchive
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={handleBulkDelete}
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                        >
                          Delete
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { clearSelection(); setSelectionMode(false); }}
                          icon={<X className="w-3.5 h-3.5" />}
                        >
                          Cancel
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* Folders Section */}
                  {displayFolders.length > 0 && (
                    <div className="mb-8">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">
                        Folders ({displayFolders.length})
                      </h3>
                      {viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                          {displayFolders.map((folder) => (
                            <FolderCardWithContext key={folder.id} folder={folder} />
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col border border-[var(--border-color)] rounded-2xl overflow-hidden glass-strong divide-y divide-[var(--border-color)]">
                          {displayFolders.map((folder) => (
                            <FolderCardWithContext key={folder.id} folder={folder} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Files Section */}
                  <div>
                    {displayFolders.length > 0 && displayFiles.length > 0 && (
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">
                        Files ({displayFiles.length})
                      </h3>
                    )}
                    {viewMode === 'grid' ? (
                      <FileGrid files={displayFiles} loading={loading} />
                    ) : (
                      <FileList files={displayFiles} loading={loading} />
                    )}
                  </div>

                  {!loading && currentItems.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center justify-center py-20 text-center"
                    >
                      <div className="w-20 h-20 rounded-2xl bg-[var(--accent-dim)] flex items-center justify-center mb-4">
                        <Archive className="w-10 h-10 text-[var(--accent)]" />
                      </div>
                      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No archived items</h3>
                      <p className="text-sm text-[var(--text-secondary)]">
                        Archive files and folders to move them out of your main view
                      </p>
                    </motion.div>
                  )}
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ArchivePage;
