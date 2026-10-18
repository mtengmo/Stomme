import { useCallback, useEffect, useRef, useState } from 'react';
import { timerDone } from './haptics';

/** Whole seconds left, rounded up so 0 only shows once the time is really out. */
export function secondsLeft(endsAt: number, now: number): number {
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

export interface Countdown {
  /** Whole seconds left; 0 when idle or finished. */
  seconds: number;
  running: boolean;
  start(seconds: number): void;
  add(seconds: number): void;
  stop(): void;
}

/**
 * Countdown on timestamps (`endsAt`), not on tick counting, so it stays right
 * after the tab was in the background. Fires `onDone` once, with a vibration.
 */
export function useCountdown(onDone?: () => void): Countdown {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (endsAt === null) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (t >= endsAt) {
        setEndsAt(null);
        timerDone();
        doneRef.current?.();
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [endsAt]);

  const start = useCallback((seconds: number) => {
    const t = Date.now();
    setNow(t);
    setEndsAt(t + seconds * 1000);
  }, []);
  const add = useCallback((seconds: number) => {
    setEndsAt((e) => (e === null ? e : e + seconds * 1000));
  }, []);
  const stop = useCallback(() => setEndsAt(null), []);

  return {
    seconds: endsAt === null ? 0 : secondsLeft(endsAt, now),
    running: endsAt !== null,
    start,
    add,
    stop,
  };
}
