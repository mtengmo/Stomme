import type { StommeDB } from '../db/db';
import { getDb } from '../db/db';
import { getMeta, setMeta } from '../db/repo';
import type { ExerciseId } from '../domain/types';
import { DEFAULT_PACE, PACE_FACTORS } from '../rules/repTempo';

/**
 * Rep-counting choices per exercise. localStorage answers synchronously for the
 * set screen; the same object is mirrored into the database meta table so it
 * is part of the backup, and restored from there after an import.
 */
export interface RepPrefs {
  /** Index into PACE_FACTORS. */
  pace: Partial<Record<ExerciseId, number>>;
  /** True = the user counts this exercise by hand; false = automatic. */
  manual: Partial<Record<ExerciseId, boolean>>;
}

const KEY = 'stomme.repCount.prefs';
/** Global choices from the first version are still the default for exercises without their own. */
const LEGACY_MANUAL = 'stomme.repCount.manual';
const LEGACY_PACE = 'stomme.repCount.pace';

function storage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function cleanRepPrefs(value: unknown): RepPrefs {
  const out: RepPrefs = { pace: {}, manual: {} };
  if (!value || typeof value !== 'object') return out;
  const { pace, manual } = value as Record<string, unknown>;
  if (pace && typeof pace === 'object')
    for (const [id, v] of Object.entries(pace))
      if (
        Number.isInteger(v) &&
        (v as number) >= 0 &&
        (v as number) < PACE_FACTORS.length
      )
        out.pace[id as ExerciseId] = v as number;
  if (manual && typeof manual === 'object')
    for (const [id, v] of Object.entries(manual))
      if (typeof v === 'boolean') out.manual[id as ExerciseId] = v;
  return out;
}

export function readRepPrefs(): RepPrefs {
  try {
    const raw = storage()?.getItem(KEY);
    return cleanRepPrefs(raw ? JSON.parse(raw) : null);
  } catch {
    return cleanRepPrefs(null);
  }
}

function write(prefs: RepPrefs): void {
  try {
    storage()?.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // The choice still applies for this screen.
  }
  try {
    void setMeta(getDb(), 'repCountPrefs', prefs).catch(() => {});
  } catch {
    // The backup copy is a convenience.
  }
}

export function paceFor(id: ExerciseId): number {
  const own = readRepPrefs().pace[id];
  if (own !== undefined) return own;
  const legacy = Number(storage()?.getItem(LEGACY_PACE));
  return storage()?.getItem(LEGACY_PACE) !== null &&
    Number.isInteger(legacy) &&
    legacy >= 0 &&
    legacy < PACE_FACTORS.length
    ? legacy
    : DEFAULT_PACE;
}

export function isManual(id: ExerciseId): boolean {
  return readRepPrefs().manual[id] ?? storage()?.getItem(LEGACY_MANUAL) === '1';
}

export function savePace(id: ExerciseId, index: number): void {
  const prefs = readRepPrefs();
  prefs.pace[id] = index;
  write(prefs);
}

export function saveManual(id: ExerciseId, manual: boolean): void {
  const prefs = readRepPrefs();
  prefs.manual[id] = manual;
  write(prefs);
}

/** After a restore the backup's choices replace the local ones. */
export async function restoreRepPrefs(db: StommeDB): Promise<void> {
  try {
    const stored = await getMeta(db, 'repCountPrefs');
    if (stored === undefined) return;
    storage()?.setItem(KEY, JSON.stringify(cleanRepPrefs(stored)));
  } catch {
    // Local choices stay as they are.
  }
}
