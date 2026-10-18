import { useEffect, useRef } from 'react';

export const SNACKBAR_MS = 5000;

interface SnackbarProps {
  message: string;
  onUndo(): void;
  onExpire(): void;
}

/** "Ångra" strip that dismisses itself after 5 s. Remount (key) to restart the timer. */
export function Snackbar({ message, onUndo, onExpire }: SnackbarProps) {
  // The timer must survive parent re-renders (the elapsed clock ticks each second).
  const expire = useRef(onExpire);
  expire.current = onExpire;
  useEffect(() => {
    const id = window.setTimeout(() => expire.current(), SNACKBAR_MS);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div
      role="status"
      className="flex items-center justify-between gap-3 rounded-sm bg-ink pl-4 text-paper"
    >
      <span className="text-base">{message}</span>
      <button
        type="button"
        onClick={onUndo}
        className="min-h-12 min-w-24 px-4 text-base font-bold underline decoration-2 underline-offset-4"
      >
        Ångra
      </button>
    </div>
  );
}
