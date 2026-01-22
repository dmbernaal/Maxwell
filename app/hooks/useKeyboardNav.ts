import { useEffect } from 'react';

interface KeyboardNavOptions {
  onRetry?: () => void;
  onGenerate?: () => void;
  onClose?: () => void;
  onNextPage?: () => void;
  onPrevPage?: () => void;
  onExpand?: () => void;
  onCollapse?: () => void;
}

export function useKeyboardNav(options: KeyboardNavOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const {
        onRetry,
        onGenerate,
        onClose,
        onNextPage,
        onPrevPage,
        onExpand,
        onCollapse,
      } = options;

      if (e.key === 'Enter') {
        e.preventDefault();
        if (onRetry) onRetry();
        if (onGenerate) onGenerate();
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        if (onClose) onClose();
        return;
      }

      if (e.altKey) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          if (onNextPage) onNextPage();
          return;
        }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          if (onPrevPage) onPrevPage();
          return;
        }
      }

      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        if (onExpand) onExpand();
        return;
      }

      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        if (onCollapse) onCollapse();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [options]);
}
