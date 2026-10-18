import { useEffect, useState } from 'react';

/** Seconds since `startedAt` (ISO), ticking each second until `endedAt` is given. */
export function useElapsed(startedAt: string, endedAt?: string): number {
  const start = Date.parse(startedAt);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (endedAt) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [endedAt]);
  const end = endedAt ? Date.parse(endedAt) : now;
  return Math.max(0, Math.floor((end - start) / 1000));
}
