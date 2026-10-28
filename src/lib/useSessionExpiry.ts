import { useEffect } from 'react';
import { getDb } from '../db/db';
import { expireStaleSessions } from '../db/repo';

const CHECK_EVERY_MS = 5 * 60_000;

/**
 * Ends sessions that have been idle for 90 minutes: on mount, when the app
 * becomes visible again and every five minutes. Live queries then update any
 * open screen by themselves.
 */
export function useSessionExpiry(): void {
  useEffect(() => {
    const check = () => {
      expireStaleSessions(getDb(), new Date()).catch(() => {
        // Best effort: the next check (or the next start) tries again.
      });
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    check();
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(check, CHECK_EVERY_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, []);
}
