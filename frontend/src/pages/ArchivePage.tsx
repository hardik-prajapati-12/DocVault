import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Archive, Lock, Unlock, KeyRound, ShieldAlert, 
  CheckCircle, RefreshCw, XCircle, Eye, EyeOff,
  CheckSquare, X, Download, Star, Trash2 
} from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { FileGrid, FileList } from '@/components/files';
import { Button } from '@/components/ui';
import { bulkSoftDelete, bulkArchive, bulkFavorite, getFileBlob } from '@/services/file-service';
import { createZipArchive } from '@/services/compression/compression-service';
import toast from 'react-hot-toast';

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

  const selectedIds = useAppStore((s) => s.selectedIds);
  const selectionMode = useAppStore((s) => s.selectionMode);
  const clearSelection = useAppStore((s) => s.clearSelection);
  const setSelectionMode = useAppStore((s) => s.setSelectionMode);
  const selectAll = useAppStore((s) => s.selectAll);

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

  const documents = useAppStore((s) => s.documents);
  const archived = useMemo(() => documents.filter((d) => d.isDeleted === 0 && d.isArchived === 1), [documents]);

  const files = useMemo(() => {
    if (!archived) return [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return archived.filter((f) => f.name.toLowerCase().includes(q));
    }
    return archived;
  }, [archived, searchQuery]);

  const loading = false;

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

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    await bulkSoftDelete(Array.from(selectedIds));
    toast.success(`${selectedIds.size} files moved to trash`);
    clearSelection();
  };

  const handleBulkFavorite = async () => {
    if (selectedIds.size === 0) return;
    await bulkFavorite(Array.from(selectedIds), 1);
    toast.success(`Added ${selectedIds.size} files to favorites`);
    clearSelection();
  };

  const handleBulkArchive = async () => {
    if (selectedIds.size === 0) return;
    await bulkArchive(Array.from(selectedIds), 0);
    toast.success(`Removed ${selectedIds.size} files from archive`);
    clearSelection();
  };

  const handleBulkDownload = async () => {
    if (selectedIds.size === 0) return;
    toast.loading('Preparing download...', { id: 'bulk-dl' });
    const fileList: { name: string; blob: Blob }[] = [];
    for (const id of selectedIds) {
      const doc = documents.find((f) => f.id === id);
      const blob = await getFileBlob(id);
      if (doc && blob) fileList.push({ name: doc.name, blob });
    }
    if (fileList.length > 0) {
      const zip = await createZipArchive(fileList);
      const url = URL.createObjectURL(zip);
      const a = document.createElement('a');
      a.href = url;
      a.download = `docvault-${fileList.length}files.zip`;
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
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Archive className="w-6 h-6 text-[var(--accent)]" />
                  Archive
                </h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  {loading ? 'Loading...' : `${files.length} archived files`}
                </p>
              </div>

              <div className="flex gap-2.5">
                {files.length > 0 && (
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
                    {selectionMode ? 'Close Selection' : 'Select Files'}
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
                    onClick={() => selectAll(files.map((f) => f.id))}
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
                <div className="w-20 h-20 rounded-2xl bg-[var(--accent-dim)] flex items-center justify-center mb-4">
                  <Archive className="w-10 h-10 text-[var(--accent)]" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No archived files</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Archive files to move them out of your main view
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ArchivePage;
