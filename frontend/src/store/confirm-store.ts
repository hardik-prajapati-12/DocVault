import { create } from 'zustand';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  variant?: 'danger' | 'primary' | 'success';
  onConfirm: () => void;
}

interface ConfirmStore {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  variant: 'danger' | 'primary' | 'success';
  onConfirmCallback: (() => void) | null;
  triggerConfirm: (options: ConfirmOptions) => void;
  closeConfirm: () => void;
}

export const useConfirmStore = create<ConfirmStore>((set) => ({
  isOpen: false,
  title: '',
  message: '',
  confirmText: 'Confirm',
  variant: 'danger',
  onConfirmCallback: null,
  triggerConfirm: (options) =>
    set({
      isOpen: true,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText || 'Confirm',
      variant: options.variant || 'danger',
      onConfirmCallback: options.onConfirm,
    }),
  closeConfirm: () =>
    set({
      isOpen: false,
      onConfirmCallback: null,
    }),
}));
