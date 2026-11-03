import { type ReactNode, useEffect, useState } from 'react';
import { usePrefersReducedMotion } from '../../figures/Figure';
import { PencilTick } from '../../ui/PencilTick';

const STORAGE_KEY = 'stomme.program.weekTick';

/** Total length of the stroke wipe; the week's tick follows after it. */
export const WEEK_TICK_MS = 720;

function readFlags(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === 'string')
      : [];
  } catch {
    return [];
  }
}

function writeFlag(flagKey: string) {
  try {
    const flags = readFlags();
    if (!flags.includes(flagKey))
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...flags, flagKey]));
  } catch {
    // Storage can be blocked; the stroke then simply stays static.
  }
}

/**
 * True exactly once per flag key (and device) when the week is done and motion is
 * allowed. The flag is written after mount, so several callers in one render agree.
 */
export function useWeekTickAnimation(flagKey: string, active: boolean) {
  const reduced = usePrefersReducedMotion();
  const [animate] = useState(
    () => active && !reduced && !readFlags().includes(flagKey),
  );
  useEffect(() => {
    if (active) writeFlag(flagKey);
  }, [active, flagKey]);
  return animate;
}

/** A wide, hand-drawn tapered pencil stroke in the same family as PencilTick. */
const STROKE =
  'M4 31C9 27 15 28 23 37C60 21 150 11 314 5C316 7 315 9 313 10C160 19 72 31 31 43C27 45 22 45 19 41C15 36 9 33 4 33Z';

interface WeekTickProps {
  /** Unique per programme and week, e.g. `${program.id}:${week}`. */
  flagKey: string;
  /** Week number shown in "Vecka 1 klar". */
  week: number;
  /** True once the last pass of the week is done. */
  done: boolean;
  /** Receives true when the stroke is drawn on this mount, so a V-box tick can follow. */
  onAnimate?: (animate: boolean) => void;
  children: ReactNode;
}

/** Wraps the week strip; a finished week gets the stroke over it and a "Vecka 1 klar" chip. */
export function WeekTick({
  flagKey,
  week,
  done,
  onAnimate,
  children,
}: WeekTickProps) {
  const animate = useWeekTickAnimation(flagKey, done);
  useEffect(() => {
    onAnimate?.(animate);
  }, [animate, onAnimate]);
  return (
    <div>
      <div className="relative">
        {children}
        {done ? (
          <svg
            viewBox="0 0 320 48"
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
            data-testid="week-tick"
            data-animated={animate ? 'true' : 'false'}
            className={`pointer-events-none absolute inset-x-0 top-0 h-11 w-full fill-(--done-mark) ${animate ? 'week-tick-new' : ''}`}
          >
            <path d={STROKE} />
          </svg>
        ) : null}
      </div>
      {done ? (
        <p className="m-0 mt-3 inline-flex min-h-8 items-center gap-1.5 rounded-sm border-2 border-(--done-chip-border) bg-(--done-fill) px-2.5 py-1 text-base font-bold text-(--done-fill-ink)">
          <PencilTick size={22} fill="var(--done-fill-ink)" />
          Vecka {week} klar
        </p>
      ) : null}
    </div>
  );
}
