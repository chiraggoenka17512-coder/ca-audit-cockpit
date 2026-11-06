import { useEffect } from 'react';

export interface ShortcutHandlers {
  onNext?: () => void;
  onPrev?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onEdit?: () => void;
  onBatchApprove?: () => void;
  onSearch?: () => void;
  onHelp?: () => void;
  onUndo?: () => void;
}

export const useKeyboardShortcuts = (handlers: ShortcutHandlers) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keystrokes when typing inside text inputs
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      // Omni-search shortcut: Ctrl+K or /
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handlers.onSearch?.();
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        handlers.onSearch?.();
        return;
      }

      // Help cheat sheet: ?
      if (e.key === '?') {
        e.preventDefault();
        handlers.onHelp?.();
        return;
      }

      // Navigation: J (down / next) and K (up / prev)
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        handlers.onNext?.();
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        handlers.onPrev?.();
      }

      // Actions: A / Enter (Approve)
      if (e.key === 'a' || e.key === 'Enter') {
        e.preventDefault();
        handlers.onApprove?.();
      }

      // Reject: R
      if (e.key === 'r') {
        e.preventDefault();
        handlers.onReject?.();
      }

      // Edit: E
      if (e.key === 'e') {
        e.preventDefault();
        handlers.onEdit?.();
      }

      // Space: Batch Approve
      if (e.key === ' ') {
        e.preventDefault();
        handlers.onBatchApprove?.();
      }

      // Undo: U
      if (e.key === 'u') {
        e.preventDefault();
        handlers.onUndo?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
};
