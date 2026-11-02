import { getDb } from '../../db/db';
import { getMeta } from '../../db/repo';

export interface BackupMeta {
  lastExportAt?: string;
  /** ISO instant until which the reminder stays hidden. */
  snoozedUntil?: string;
}

const validInstant = (v: unknown): v is string =>
  typeof v === 'string' && !Number.isNaN(Date.parse(v));

/** Reads the 'backup' meta defensively: bad values are dropped, never thrown on. */
export async function readBackupMeta(): Promise<BackupMeta> {
  const raw = await getMeta<Record<string, unknown>>(getDb(), 'backup');
  return {
    lastExportAt: validInstant(raw?.lastExportAt)
      ? raw.lastExportAt
      : undefined,
    snoozedUntil: validInstant(raw?.snoozedUntil)
      ? raw.snoozedUntil
      : undefined,
  };
}
