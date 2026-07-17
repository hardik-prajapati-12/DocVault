import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  divider?: boolean;
}

export interface ContextMenuRef {
  showMenu: (e: React.MouseEvent) => void;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  children: React.ReactNode;
}

export const ContextMenu = forwardRef<ContextMenuRef, ContextMenuProps>(({ items, children }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const openMenu = (clientX: number, clientY: number) => {
    const x = Math.min(clientX, window.innerWidth - 220);
    const y = Math.min(clientY, window.innerHeight - items.length * 40 - 16);
    setPosition({ x, y });
    setIsOpen(true);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openMenu(e.clientX, e.clientY);
  };

  useImperativeHandle(ref, () => ({
    showMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      openMenu(e.clientX, e.clientY);
    },
  }));

  useEffect(() => {
    const handleClose = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleScroll = () => setIsOpen(false);

    if (isOpen) {
      document.addEventListener('mousedown', handleClose);
      document.addEventListener('scroll', handleScroll, true);
    }
    return () => {
      document.removeEventListener('mousedown', handleClose);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  return (
    <>
      <div onContextMenu={handleContextMenu}>{children}</div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="fixed z-[60] py-1.5 glass-strong rounded-xl shadow-2xl min-w-[170px] border border-[var(--border-color)]"
            style={{ left: position.x, top: position.y }}
          >
            {items.map((item, index) => (
              <React.Fragment key={index}>
                {item.divider && <div className="my-1 border-t border-[var(--border-color)]" />}
                <button
                  onClick={() => { item.onClick(); setIsOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer
                    ${item.variant === 'danger'
                      ? 'text-red-400 hover:bg-red-500/10'
                      : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                    }`}
                >
                  {item.icon && (
                    <span className="w-3.5 h-3.5 flex items-center justify-center opacity-65 flex-shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5 [&>svg]:stroke-[2px]">
                      {item.icon}
                    </span>
                  )}
                  {item.label}
                </button>
              </React.Fragment>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

ContextMenu.displayName = 'ContextMenu';
