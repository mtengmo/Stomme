import { useRegisterSW } from 'virtual:pwa-register/react';

export interface AppUpdate {
  /** A new version is installed and waiting. */
  needRefresh: boolean;
  /** needRefresh and not in a session: safe to show the banner (risk R6). */
  showBanner: boolean;
  /** Activates the waiting service worker and reloads. */
  updateNow: () => Promise<void>;
}

/**
 * Wraps useRegisterSW (registerType stays 'prompt'). Pass inSession=true while
 * a session is active so the update banner never appears mid-workout.
 * Mount once; it registers the service worker.
 */
export function useAppUpdate(inSession = false): AppUpdate {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true });
  return {
    needRefresh,
    showBanner: needRefresh && !inSession,
    updateNow: () => updateServiceWorker(true),
  };
}
