interface Sentinel {
  release(): Promise<void>;
  addEventListener(type: 'release', cb: () => void): void;
}
interface WakeLockApi {
  request(type: 'screen'): Promise<Sentinel>;
}

export interface ScreenWakeLock {
  /** Starts holding the screen on; re-acquired whenever the page becomes visible. */
  acquire(): Promise<void>;
  release(): Promise<void>;
}

/**
 * Keeps the screen on during a session. The browser drops the lock when the
 * page is hidden, so it is requested again on visibilitychange. A no-op where
 * the Screen Wake Lock API is unsupported or the request is refused.
 */
export function createWakeLock(
  nav: { wakeLock?: unknown } = navigator,
  doc: Document = document,
): ScreenWakeLock {
  const api = nav.wakeLock as WakeLockApi | undefined;
  let wanted = false;
  let sentinel: Sentinel | null = null;

  const request = async () => {
    if (!api || !wanted || sentinel || doc.visibilityState !== 'visible')
      return;
    try {
      const s = await api.request('screen');
      if (!wanted) {
        await s.release();
        return;
      }
      sentinel = s;
      s.addEventListener('release', () => {
        if (sentinel === s) sentinel = null;
      });
    } catch {
      // denied (battery saver, permissions policy): carry on without it
    }
  };

  const onVisible = () => {
    if (doc.visibilityState === 'visible') void request();
  };

  return {
    async acquire() {
      if (!api || wanted) return;
      wanted = true;
      doc.addEventListener('visibilitychange', onVisible);
      await request();
    },
    async release() {
      if (!wanted) return;
      wanted = false;
      doc.removeEventListener('visibilitychange', onVisible);
      const s = sentinel;
      sentinel = null;
      try {
        await s?.release();
      } catch {
        // already released
      }
    },
  };
}
