import { daysBetween, toLocalDate } from './dates';

export const REMINDER_DAYS = 14;
export const REMINDER_SESSIONS = 4;

export type PersistenceState = 'persisted' | 'evictable' | 'unsupported';

export interface StorageStatus {
  state: PersistenceState;
  usageBytes?: number;
  quotaBytes?: number;
}

/**
 * Asks the browser not to evict our data. Best effort: never throws.
 * Called after a completed session; resolves to whether storage is persistent.
 */
export async function requestPersistence(): Promise<boolean> {
  try {
    const s = typeof navigator === 'undefined' ? undefined : navigator.storage;
    if (!s?.persist) return false;
    if (s.persisted && (await s.persisted())) return true;
    return await s.persist();
  } catch {
    return false;
  }
}

/** "Lagring: skyddad" (persisted) or "kan rensas av webbläsaren" (evictable). */
export async function storageStatus(): Promise<StorageStatus> {
  try {
    const s = typeof navigator === 'undefined' ? undefined : navigator.storage;
    if (!s?.persisted) return { state: 'unsupported' };
    const persisted = await s.persisted();
    const est = s.estimate ? await s.estimate() : undefined;
    return {
      state: persisted ? 'persisted' : 'evictable',
      usageBytes: est?.usage,
      quotaBytes: est?.quota,
    };
  } catch {
    return { state: 'unsupported' };
  }
}

export interface BackupReminderInput {
  /** ISO instant of the last export, if any. */
  lastExportAt?: string;
  /** ISO instants (startedAt) of completed sessions. */
  completedSessionTimes: readonly string[];
  now: Date;
}

/**
 * True when more than 14 days or at least 4 completed sessions have passed
 * since the last export. With no export yet, any completed session counts
 * from the first one: remind once there are 4 sessions or the first session
 * is older than 14 days.
 */
export function shouldRemindBackup(input: BackupReminderInput): boolean {
  const { lastExportAt, completedSessionTimes, now } = input;
  const since = lastExportAt
    ? completedSessionTimes.filter((t) => t > lastExportAt)
    : [...completedSessionTimes];
  if (since.length === 0) return false;
  if (since.length >= REMINDER_SESSIONS) return true;
  const anchor = lastExportAt ?? [...since].sort()[0];
  if (!anchor) return false;
  const days = daysBetween(toLocalDate(new Date(anchor)), toLocalDate(now));
  return days > REMINDER_DAYS;
}
