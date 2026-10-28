/** Storage state saved by global-setup.ts: onboarding accepted, nothing else. */
export const ONBOARDED_STATE = 'test-results/.auth/onboarded.json';

/**
 * Most specs tap "Klar set" on rep exercises, so storage starts with "Räkna själv"
 * on (this key set to '1'). rep-counting.spec.ts removes the key to test the
 * hands-free flow.
 */
export const REP_COUNT_MANUAL_KEY = 'stomme.repCount.manual';

/** Empty storage: the app starts as on a first visit (onboarding shown). */
export const FRESH_STATE = {
  cookies: [],
  origins: [
    {
      origin: 'http://localhost:4173',
      localStorage: [{ name: REP_COUNT_MANUAL_KEY, value: '1' }],
    },
  ],
};
