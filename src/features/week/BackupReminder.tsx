import { Link } from 'wouter';
import { getDb } from '../../db/db';
import { getMeta, setMeta } from '../../db/repo';
import { formatShortDate, toLocalDate } from '../../lib/dates';
import { Banner } from '../../ui/Banner';

export interface BackupMeta {
  lastExportAt?: string;
  /** ISO instant until which the reminder stays hidden. */
  snoozedUntil?: string;
}

export const SNOOZE_DAYS = 7;

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

/** Keeps meta 'backup' fields other than the one being changed. */
export async function snoozeBackupReminder(now: Date): Promise<void> {
  const db = getDb();
  const current = await readBackupMeta();
  const until = new Date(now.getTime() + SNOOZE_DAYS * 24 * 3600 * 1000);
  await setMeta(db, 'backup', {
    ...current,
    snoozedUntil: until.toISOString(),
  });
}

/** Info banner below the pass cards: why it shows, a link, and "Senare". */
export function BackupReminder({
  meta,
  completedTimes,
  now,
}: {
  meta: BackupMeta | null | undefined;
  completedTimes: readonly string[];
  now: Date;
}) {
  const last = meta?.lastExportAt;
  const reason = last
    ? `Senaste kopian: ${formatShortDate(toLocalDate(new Date(last)))}, ${
        completedTimes.filter((t) => t > last).length
      } pass sedan`
    : 'Aldrig säkerhetskopierat';
  return (
    <Banner>
      <p className="m-0 font-bold">
        Det var ett tag sedan du säkerhetskopierade
      </p>
      <p className="m-0 text-ink-soft">{reason}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-5">
        <Link
          href="/installningar"
          className="inline-flex min-h-12 items-center font-bold text-accent underline underline-offset-4"
        >
          Öppna inställningar
        </Link>
        <button
          type="button"
          onClick={() => void snoozeBackupReminder(now)}
          className="inline-flex min-h-12 items-center font-bold text-ink underline underline-offset-4"
        >
          Senare
        </button>
      </div>
    </Banner>
  );
}
