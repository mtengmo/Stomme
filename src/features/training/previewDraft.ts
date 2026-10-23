import type { PlannedExercise } from '../../domain/types';

/** Preview state beyond the plan itself, kept per tab so leaving via the nav loses nothing. */
export interface PreviewFlags {
  confirmed: boolean;
  checkBefore: boolean;
  removed: { item: PlannedExercise; index: number } | null;
}

export const EMPTY_FLAGS: PreviewFlags = {
  confirmed: false,
  checkBefore: false,
  removed: null,
};

const suffix = '.flags';

/** Reads and validates stored flags; anything malformed falls back to the defaults. */
export function readFlags(draftKey: string): PreviewFlags {
  try {
    const parsed: unknown = JSON.parse(
      sessionStorage.getItem(draftKey + suffix) ?? 'null',
    );
    if (!parsed || typeof parsed !== 'object') return EMPTY_FLAGS;
    const v = parsed as Record<string, unknown>;
    const r = v.removed as { item?: unknown; index?: unknown } | null;
    const item = r?.item as { exerciseId?: unknown } | undefined;
    const removed =
      r &&
      typeof r === 'object' &&
      typeof r.index === 'number' &&
      Number.isInteger(r.index) &&
      r.index >= 0 &&
      item &&
      typeof item === 'object' &&
      typeof item.exerciseId === 'string'
        ? (r as { item: PlannedExercise; index: number })
        : null;
    return {
      confirmed: v.confirmed === true,
      checkBefore: v.checkBefore === true,
      removed,
    };
  } catch {
    return EMPTY_FLAGS;
  }
}

export function writeFlags(draftKey: string, flags: PreviewFlags): void {
  try {
    sessionStorage.setItem(draftKey + suffix, JSON.stringify(flags));
  } catch {
    /* Draft is a convenience only. */
  }
}

export function clearFlags(draftKey: string): void {
  try {
    sessionStorage.removeItem(draftKey + suffix);
  } catch {
    /* Nothing to clear. */
  }
}
