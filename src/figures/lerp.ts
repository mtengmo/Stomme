export const HOLD_MS = 800;
export const TWEEN_MS = 1600;
export const CYCLE_MS = 2 * (HOLD_MS + TWEEN_MS);

export function easeInOut(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c < 0.5 ? 2 * c * c : 1 - (-2 * c + 2) ** 2 / 2;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** 0 = start pose, 1 = end pose: hold, ease to end, hold, ease back. */
export function cycleProgress(ms: number, endHoldMs = HOLD_MS): number {
  const cycleMs = HOLD_MS + 2 * TWEEN_MS + endHoldMs;
  const m = ((ms % cycleMs) + cycleMs) % cycleMs;
  if (m < HOLD_MS) return 0;
  if (m < HOLD_MS + TWEEN_MS) return easeInOut((m - HOLD_MS) / TWEEN_MS);
  if (m < HOLD_MS + TWEEN_MS + endHoldMs) return 1;
  return 1 - easeInOut((m - HOLD_MS - TWEEN_MS - endHoldMs) / TWEEN_MS);
}

export type Pt = readonly [number, number];

export function lerpPt(a: Pt, b: Pt, t: number): Pt {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}
