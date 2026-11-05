import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ExerciseId } from '../../domain/types';
import { Figure, usePrefersReducedMotion } from '../../figures/Figure';

const PAUSE_KEY = 'stomme.program.pauseFigures';
const listeners = new Set<() => void>();
let memoryPaused = false;

function readPaused(): boolean {
  try {
    return localStorage.getItem(PAUSE_KEY) === '1';
  } catch {
    return memoryPaused;
  }
}

function writePaused(value: boolean) {
  memoryPaused = value;
  try {
    if (value) localStorage.setItem(PAUSE_KEY, '1');
    else localStorage.removeItem(PAUSE_KEY);
  } catch {
    // Storage can be blocked; the choice then lasts for this visit only.
  }
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The viewer's choice to freeze all programme figures (WCAG 2.2.2). Stored on this device. */
export function useFiguresPaused(): [boolean, (value: boolean) => void] {
  const paused = useSyncExternalStore(subscribe, readPaused, () => false);
  return [paused, writePaused];
}

/** 48 px button that pauses or resumes every animated figure. */
export function PauseFiguresButton({ className = '' }: { className?: string }) {
  const [paused, setPaused] = useFiguresPaused();
  return (
    <button
      type="button"
      onClick={() => setPaused(!paused)}
      className={`flex min-h-12 items-center rounded-md border-2 border-edge bg-surface px-4 text-base font-bold text-ink ${className}`}
    >
      {paused ? 'Spela figurerna' : 'Pausa figurerna'}
    </button>
  );
}

interface ExerciseThumbProps {
  exerciseId: ExerciseId;
  /** Only the lead card animates; receding cards and reduced motion show the start frame. */
  animate?: boolean;
}

/** A 64 px framed figure. Pauses off screen, in a hidden tab, and on request. */
export function ExerciseThumb({
  exerciseId,
  animate = true,
}: ExerciseThumbProps) {
  const reduced = usePrefersReducedMotion();
  const [pausedByUser] = useFiguresPaused();
  const ref = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(true);
  const [tabHidden, setTabHidden] = useState(
    typeof document !== 'undefined' && document.hidden,
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      const last = entries[entries.length - 1];
      if (last) setInView(last.isIntersecting);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const on = () => setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);

  const stillOnly = reduced || !animate;
  return (
    <span
      ref={ref}
      aria-hidden="true"
      data-testid="exercise-thumb"
      className="block size-16 shrink-0 overflow-hidden rounded-sm border-2 border-edge bg-paper"
    >
      <Figure
        exerciseId={exerciseId}
        stillOnly={stillOnly}
        paused={pausedByUser || !inView || tabHidden}
      />
    </span>
  );
}
