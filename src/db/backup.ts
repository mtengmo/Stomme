import { z } from 'zod';
import { exerciseList, exercises } from '../content/exercises';
import type {
  ExerciseId,
  MetaEntry,
  PainLog,
  ReasonCode,
  Session,
  SetLog,
} from '../domain/types';
import { isRealDate, toLocalDate } from '../lib/dates';
import { type ShareResult, shareOrDownload } from '../lib/share';
import type { StommeDB } from './db';
import { setMeta } from './repo';

/** Bump together with a Dexie version and add a migration test (risk R13). */
export const BACKUP_SCHEMA_VERSION = 1;
/** Import size limit (risk R12). */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export interface BackupFile {
  schemaVersion: number;
  exportedAt: string;
  sessions: Session[];
  setLogs: SetLog[];
  painLogs: PainLog[];
  meta: MetaEntry[];
}

export type BackupErrorCode =
  | 'too_large'
  | 'not_json'
  | 'schema_version'
  | 'invalid';

export class BackupError extends Error {
  readonly code: BackupErrorCode;
  constructor(code: BackupErrorCode, message: string) {
    super(message);
    this.name = 'BackupError';
    this.code = code;
  }
}

export function backupFileName(now: Date): string {
  return `stomme-backup-${toLocalDate(now)}.json`;
}

export async function exportAll(
  db: StommeDB,
  now: Date = new Date(),
): Promise<BackupFile> {
  return db.transaction(
    'r',
    db.sessions,
    db.setLogs,
    db.painLogs,
    db.meta,
    async () => ({
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: now.toISOString(),
      sessions: await db.sessions.toArray(),
      setLogs: await db.setLogs.toArray(),
      painLogs: await db.painLogs.toArray(),
      meta: await db.meta.toArray(),
    }),
  );
}

export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2);
}

export function backupToFile(backup: BackupFile, now: Date): File {
  return new File([serializeBackup(backup)], backupFileName(now), {
    type: 'application/json',
  });
}

/**
 * Exports everything and hands it to the share sheet or a download. Records
 * meta 'backup'.lastExportAt unless the user dismissed the share sheet.
 */
export async function exportAndShare(
  db: StommeDB,
  now: Date = new Date(),
): Promise<ShareResult> {
  const backup = await exportAll(db, now);
  const result = await shareOrDownload(backupToFile(backup, now));
  if (result !== 'cancelled') {
    await setMeta(db, 'backup', { lastExportAt: now.toISOString() });
  }
  return result;
}

/* ---------- Validation ---------- */

const exerciseIds = exerciseList.map((e) => e.id) as [
  ExerciseId,
  ...ExerciseId[],
];
const exerciseIdSchema = z.enum(exerciseIds);
const id = z.string().min(1).max(100);
const localDate = z.string().refine(isRealDate, { message: 'not a real date' });
/** UTC instants only (trailing Z), as toISOString writes them. */
const instant = z.iso.datetime();

const reasonCodes = [
  'first_time',
  'week1_bodyweight',
  'start_load',
  'added_set',
  'increase_amount',
  'next_load',
  'hold_incomplete',
  'hold_hard',
  'hold_not_easy_at_max',
  'hold_waiting_for_3_sets',
  'max_level',
  'pain_hold',
  'pain_stop_hold',
] as const satisfies readonly ReasonCode[];
const count = z.number().int().min(0).max(100_000);

function loadIndexFor(exerciseId: ExerciseId) {
  return count.refine((i) => i < exercises[exerciseId].loadLadder.length, {
    message: 'loadIndex outside the exercise ladder',
  });
}

const plannedExercise = z
  .strictObject({
    exerciseId: exerciseIdSchema,
    sets: z.number().int().min(0).max(20),
    target: z.number().min(0).max(600),
    loadIndex: count,
    weightKg: z.number().min(0).max(1000),
    restSec: count,
    reason: z.enum(reasonCodes),
  })
  .superRefine((p, ctx) => {
    if (!loadIndexFor(p.exerciseId).safeParse(p.loadIndex).success) {
      ctx.addIssue({ code: 'custom', path: ['loadIndex'], message: 'ladder' });
    }
  });

const effortFeedback = z.strictObject({
  effort: z.enum(['easy', 'ok', 'hard']).optional(),
  skipped: z.boolean().optional(),
});

const sessionSchema = z.strictObject({
  id,
  templateId: z.enum(['A', 'B']),
  date: localDate,
  startedAt: instant,
  finishedAt: instant.optional(),
  status: z.enum(['in_progress', 'completed', 'aborted']),
  abortReason: z.enum(['pain_stop', 'user']).optional(),
  programWeek: z.number().int().min(1).max(1000),
  plan: z.array(plannedExercise).max(30),
  feedback: z.partialRecord(exerciseIdSchema, effortFeedback),
  note: z.string().max(5000).optional(),
});

const setLogSchema = z
  .strictObject({
    id,
    sessionId: id,
    exerciseId: exerciseIdSchema,
    setNumber: z.number().int().min(1).max(1000),
    side: z.enum(['right', 'left', 'both']),
    amount: z.number().min(0).max(100_000),
    loadIndex: count,
    weightKg: z.number().min(0).max(1000),
    loggedAt: instant,
  })
  .superRefine((l, ctx) => {
    if (!loadIndexFor(l.exerciseId).safeParse(l.loadIndex).success) {
      ctx.addIssue({ code: 'custom', path: ['loadIndex'], message: 'ladder' });
    }
  });

const score = z.number().int().min(0).max(10);

const painLogSchema = z.strictObject({
  id,
  sessionId: id,
  date: localDate,
  timing: z.enum(['before', 'after', 'dayAfter']),
  score,
  location: z.literal('right_knee'),
  redFlags: z.strictObject({
    sharp: z.boolean(),
    swelling: z.boolean(),
    locking: z.boolean(),
  }),
  createdAt: instant,
});

const metaSchema = z.discriminatedUnion('key', [
  z.strictObject({
    key: z.literal('program'),
    value: z.strictObject({ startDate: localDate }),
  }),
  z.strictObject({
    key: z.literal('onboarding'),
    value: z.strictObject({ acceptedAt: instant }),
  }),
  z.strictObject({
    key: z.literal('backup'),
    value: z.strictObject({
      lastExportAt: instant.optional(),
      snoozedUntil: instant.optional(),
    }),
  }),
]);

const backupSchema = z.strictObject({
  schemaVersion: z.literal(BACKUP_SCHEMA_VERSION),
  exportedAt: instant,
  sessions: z.array(sessionSchema),
  setLogs: z.array(setLogSchema),
  painLogs: z.array(painLogSchema),
  meta: z.array(metaSchema),
});

function duplicate(items: readonly { id: string }[]): boolean {
  return new Set(items.map((i) => i.id)).size !== items.length;
}

/** Parses and validates backup text. Throws BackupError; never touches a DB. */
export function parseBackup(text: string): BackupFile {
  if (new TextEncoder().encode(text).byteLength > MAX_IMPORT_BYTES) {
    throw new BackupError('too_large', 'Backup file is larger than 5 MB');
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('not_json', 'File is not valid JSON');
  }
  if (
    typeof raw === 'object' &&
    raw !== null &&
    'schemaVersion' in raw &&
    raw.schemaVersion !== BACKUP_SCHEMA_VERSION
  ) {
    throw new BackupError(
      'schema_version',
      `Unsupported schemaVersion ${String(raw.schemaVersion)}`,
    );
  }
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) {
    throw new BackupError('invalid', 'Backup content is not valid');
  }
  const b = parsed.data as BackupFile;
  const sessionIds = new Set(b.sessions.map((s) => s.id));
  const metaKeys = new Set(b.meta.map((m) => m.key));
  if (
    duplicate(b.sessions) ||
    duplicate(b.setLogs) ||
    duplicate(b.painLogs) ||
    metaKeys.size !== b.meta.length ||
    b.setLogs.some((l) => !sessionIds.has(l.sessionId)) ||
    b.painLogs.some((l) => !sessionIds.has(l.sessionId))
  ) {
    throw new BackupError('invalid', 'Duplicate ids or dangling references');
  }
  // An in-progress session with logged sets must have its 'before' pain
  // reading (the pain gate runs before the first set); otherwise resuming it
  // would skip the safety check.
  const withBefore = new Set(
    b.painLogs.filter((p) => p.timing === 'before').map((p) => p.sessionId),
  );
  const setSessions = new Set(b.setLogs.map((l) => l.sessionId));
  if (
    b.sessions.some(
      (s) =>
        s.status === 'in_progress' &&
        setSessions.has(s.id) &&
        !withBefore.has(s.id),
    )
  ) {
    throw new BackupError(
      'invalid',
      'In-progress session has sets but no pain reading before the session',
    );
  }
  return b;
}

export interface ImportOptions {
  now?: Date;
  /**
   * Receives the pre-import safety backup before anything is replaced; the UI
   * should save/share it here. If it throws, the import is aborted.
   */
  beforeReplace?: (safety: BackupFile) => void | Promise<void>;
}

export interface ImportResult {
  /** Everything that was in the database before the import. */
  safetyBackup: BackupFile;
  counts: { sessions: number; setLogs: number; painLogs: number; meta: number };
}

/**
 * Validates, takes a safety backup of current data, then replaces all data in
 * ONE transaction: any failure leaves the database as it was.
 */
export async function importAll(
  db: StommeDB,
  text: string,
  options: ImportOptions = {},
): Promise<ImportResult> {
  const backup = parseBackup(text);
  const safetyBackup = await exportAll(db, options.now ?? new Date());
  await options.beforeReplace?.(safetyBackup);
  await db.transaction(
    'rw',
    db.sessions,
    db.setLogs,
    db.painLogs,
    db.meta,
    async () => {
      await Promise.all([
        db.sessions.clear(),
        db.setLogs.clear(),
        db.painLogs.clear(),
        db.meta.clear(),
      ]);
      await db.sessions.bulkAdd(backup.sessions);
      await db.setLogs.bulkAdd(backup.setLogs);
      await db.painLogs.bulkAdd(backup.painLogs);
      await db.meta.bulkAdd(backup.meta);
    },
  );
  return {
    safetyBackup,
    counts: {
      sessions: backup.sessions.length,
      setLogs: backup.setLogs.length,
      painLogs: backup.painLogs.length,
      meta: backup.meta.length,
    },
  };
}
