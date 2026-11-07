import { useEffect, useRef } from 'react';

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

export interface ShortcutOptions {
  enabled?: boolean;
}

export const useKeyboardShortcuts = (
  handlers: ShortcutHandlers,
  options: ShortcutOptions = { enabled: true }
) => {
  // Store handlers in a ref to decouple listener subscription from render cycles
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (options.enabled === false) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Guard against typing in form fields or contenteditable nodes
      if (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      const hasModifier = e.ctrlKey || e.metaKey || e.altKey;
      const keyLower = e.key.toLowerCase();

      // Undo shortcut: Ctrl+Z or Cmd+Z (without Shift/Alt)
      if ((e.ctrlKey || e.metaKey) && keyLower === 'z' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        handlersRef.current.onUndo?.();
        return;
      }

      // Omni-search shortcut: Ctrl+K or / (without modifiers)
      if ((e.ctrlKey || e.metaKey) && keyLower === 'k') {
        e.preventDefault();
        handlersRef.current.onSearch?.();
        return;
      }
      if (!hasModifier && e.key === '/') {
        e.preventDefault();
        handlersRef.current.onSearch?.();
        return;
      }

      // Help cheat sheet: ? (Shift+/ without Ctrl/Alt/Meta)
      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key === '?') {
        e.preventDefault();
        handlersRef.current.onHelp?.();
        return;
      }

      // Navigation: J / Down Arrow, K / Up Arrow (NO modifiers allowed)
      if (!hasModifier && (keyLower === 'j' || e.key === 'ArrowDown')) {
        e.preventDefault();
        handlersRef.current.onNext?.();
        return;
      }
      if (!hasModifier && (keyLower === 'k' || e.key === 'ArrowUp')) {
        e.preventDefault();
        handlersRef.current.onPrev?.();
        return;
      }

      // Approve: 'A' or 'Enter' (STRICTLY guarded against Ctrl/Cmd/Alt to prevent accidental triggers on Ctrl+A)
      if (!hasModifier && (keyLower === 'a' || e.key === 'Enter')) {
        e.preventDefault();
        handlersRef.current.onApprove?.();
        return;
      }

      // Single-key letters: strictly no modifiers
      if (!hasModifier) {
        if (keyLower === 'r') {
          e.preventDefault();
          handlersRef.current.onReject?.();
        } else if (keyLower === 'e') {
          e.preventDefault();
          handlersRef.current.onEdit?.();
        } else if (keyLower === 'u') {
          e.preventDefault();
          handlersRef.current.onUndo?.();
        } else if (e.key === ' ') {
          e.preventDefault();
          handlersRef.current.onBatchApprove?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [options.enabled]);
};
