/** Vibration helpers; silent no-ops where the Vibration API is missing (desktop, iOS). */
function vibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // some browsers throw without a user gesture; haptics are optional
  }
}

/** Short tick when a set is logged. */
export function tapFeedback(): void {
  vibrate(15);
}

/** Three pulses when the rest or hold timer reaches zero. */
export function timerDone(): void {
  vibrate([220, 110, 220, 110, 400]);
}
