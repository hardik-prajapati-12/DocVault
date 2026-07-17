import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, RotateCcw, HelpCircle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary' | 'success';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
  icon,
}) => {
  const renderIcon = () => {
    if (icon) return icon;
    if (variant === 'success') return <RotateCcw className="w-7 h-7 text-emerald-400" />;
    if (variant === 'danger') return <AlertTriangle className="w-7 h-7 text-red-400" />;
    return <HelpCircle className="w-7 h-7 text-[var(--accent)]" />;
  };

  const getIconContainerClass = () => {
    if (variant === 'success') return 'bg-emerald-500/15';
    if (variant === 'danger') return 'bg-red-500/15';
    return 'bg-[var(--accent-dim)]';
  };

  const getConfirmButtonVariant = () => {
    if (variant === 'danger') return 'danger';
    if (variant === 'success') return 'primary'; // We can map success to primary or a custom styling
    return 'primary';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md" showClose={false}>
      <div className="flex flex-col items-center text-center gap-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${getIconContainerClass()}`}>
          {renderIcon()}
        </div>
        <div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">{title}</h3>
          <p className="text-sm text-[var(--text-secondary)]">{message}</p>
        </div>
        <div className="flex gap-3 w-full">
          <Button variant="secondary" className="flex-1 cursor-pointer" onClick={onClose}>
            {cancelText}
          </Button>
          <Button
            variant={getConfirmButtonVariant()}
            className="flex-1 cursor-pointer"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
