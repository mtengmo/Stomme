import { z } from 'zod';
import { exerciseMetadata } from '../content/exerciseMetadata';
import { exerciseList, exercises } from '../content/exercises';
import { kneeRehabExercises } from '../content/kneeRehab';
import { isWorkoutEquipment, rehabGroupOf } from '../content/programmes';
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
import { equipmentFits } from '../rules/equipment';
import { validateCheckin } from '../rules/training';
import { isWeeklySchedule } from '../rules/weeklySchedule';
import type { StommeDB } from './db';
import { setMeta } from './repo';
import { validateTrainingPlan } from './training';
import { isTrainingRoutines } from './trainingRoutines';

/** Bump together with a Dexie version and add a migration test (risk R13). */
export const BACKUP_SCHEMA_VERSION = 2;
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
  'hold_no_effort',
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
    sides: z
      .array(z.enum(['right', 'left', 'both']))
      .min(1)
      .max(2)
      .optional(),
    variantId: z.string().min(1).max(100).optional(),
    explanation: z.string().max(1000).optional(),
  })
  .superRefine((p, ctx) => {
    if (!loadIndexFor(p.exerciseId).safeParse(p.loadIndex).success) {
      ctx.addIssue({ code: 'custom', path: ['loadIndex'], message: 'ladder' });
    }
  });

const equipmentChoicesSchema = z
  .array(
    z.enum([
      'bodyweight',
      'chair',
      'support',
      'step',
      'band',
      'pull-up-bar',
      'dip-bars',
    ]),
  )
  .max(7);
const fixedWeightsSchema = z
  .array(
    z.strictObject({
      type: z.enum(['dumbbell', 'kettlebell']),
      kg: z.number().positive().max(100),
      count: z.union([z.literal(1), z.literal(2)]),
    }),
  )
  .max(20)
  .refine(
    (items) =>
      new Set(items.map((item) => `${item.type}:${item.kg}`)).size ===
      items.length,
  );
const adjustableWeightsSchema = z
  .array(
    z.strictObject({
      type: z.enum(['dumbbell', 'kettlebell']),
      count: z.union([z.literal(1), z.literal(2)]),
      settingsKg: z
        .array(z.number().positive().max(100))
        .min(1)
        .max(20)
        .refine((values) => new Set(values).size === values.length),
    }),
  )
  .max(2)
  .refine(
    (items) => new Set(items.map((item) => item.type)).size === items.length,
  );
const workoutEquipmentSchema = z
  .strictObject({
    equipment: equipmentChoicesSchema.refine(
      (items) => new Set(items).size === items.length,
    ),
    weights: fixedWeightsSchema.optional(),
    adjustableWeights: adjustableWeightsSchema.optional(),
  })
  .refine(isWorkoutEquipment);

const symptom = z.strictObject({
  area: z.string().trim().min(1).max(100),
  side: z.enum(['right', 'left', 'both', 'unspecified']),
  score: z.number().int().min(0).max(10),
});
const checkin = z.strictObject({
  recordedAt: instant,
  feeling: z.enum(['ready', 'tired', 'good', 'mixed', 'difficult']),
  symptoms: symptom.nullable(),
});
const effortFeedback = z.strictObject({
  effort: z.enum(['easy', 'ok', 'hard']).optional(),
  effortSkipped: z.boolean().optional(),
  skipped: z.boolean().optional(),
  symptoms: symptom.nullable().optional(),
});

const sessionSchema = z
  .strictObject({
    id,
    templateId: z.enum(['A', 'B']),
    customWorkoutId: z.string().min(1).max(100).optional(),
    customWorkoutName: z.string().min(1).max(60).optional(),
    workoutMode: z.literal('short').optional(),
    fullPlan: z.array(plannedExercise).min(1).max(12).optional(),
    equipmentOverride: workoutEquipmentSchema.optional(),
    programId: z.enum(['general', 'running', 'rehab']).optional(),
    experience: z.enum(['new', 'some', 'regular']).optional(),
    policyVersion: z.literal(1).optional(),
    rehabFocus: z.enum(['custom', 'knee', 'knee-physio']).optional(),
    checkins: z
      .strictObject({
        before: checkin.optional(),
        after: checkin.optional(),
        dayAfter: checkin.optional(),
      })
      .optional(),
    date: localDate,
    startedAt: instant,
    finishedAt: instant.optional(),
    status: z.enum(['in_progress', 'completed', 'aborted']),
    abortReason: z.enum(['pain_stop', 'user', 'timeout']).optional(),
    programWeek: z.number().int().min(1).max(1000),
    plan: z
      .array(plannedExercise)
      .max(30)
      .refine(
        (items) =>
          new Set(items.map((item) => item.exerciseId)).size === items.length,
        { message: 'Duplicate exercise in session plan' },
      ),
    feedback: z.partialRecord(exerciseIdSchema, effortFeedback),
    note: z.string().max(5000).optional(),
  })
  .superRefine((session, ctx) => {
    if (
      session.equipmentOverride &&
      (!session.programId ||
        [...session.plan, ...(session.fullPlan ?? [])].some((item) => {
          const variant = exerciseMetadata[item.exerciseId].variants.find(
            (candidate) => candidate.id === item.variantId,
          );
          return (
            !variant ||
            !equipmentFits(
              variant.equipment,
              session.equipmentOverride ?? { equipment: [] },
            )
          );
        }))
    )
      ctx.addIssue({ code: 'custom', message: 'Invalid workout equipment' });
    if (
      (session.workoutMode === 'short' &&
        (session.programId === 'rehab' ||
          !session.programId ||
          !!session.customWorkoutId ||
          !session.fullPlan ||
          !validateTrainingPlan(session.fullPlan) ||
          (session.plan.length >= session.fullPlan.length &&
            session.plan.every(
              (item, index) =>
                item.sets >= (session.fullPlan?.[index]?.sets ?? 0),
            )) ||
          session.plan.some(
            (item) =>
              !session.fullPlan?.some(
                (full) =>
                  full.exerciseId === item.exerciseId &&
                  item.sets <= full.sets &&
                  item.target <= full.target &&
                  item.restSec >= full.restSec &&
                  item.weightKg <= full.weightKg &&
                  item.loadIndex === full.loadIndex &&
                  item.variantId === full.variantId &&
                  JSON.stringify(item.sides) === JSON.stringify(full.sides),
              ),
          ))) ||
      (session.workoutMode !== 'short' && session.fullPlan)
    )
      ctx.addIssue({ code: 'custom', message: 'Invalid short workout' });
    if (session.rehabFocus && session.programId !== 'rehab')
      ctx.addIssue({
        code: 'custom',
        message: 'Rehab focus requires rehab programme',
      });
    if (
      rehabGroupOf(session.rehabFocus) === 'aaos' &&
      session.plan.some(
        (p) => !kneeRehabExercises.some((ex) => ex.id === p.exerciseId),
      )
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Unknown knee collection exercise',
      });
    if (!session.programId) return;
    if (session.policyVersion !== 1 || !validateTrainingPlan(session.plan))
      ctx.addIssue({
        code: 'custom',
        message: 'Invalid programme policy or exercise plan',
      });
    for (const timing of ['before', 'after', 'dayAfter'] as const) {
      const check = session.checkins?.[timing];
      if (check && !validateCheckin(check, timing))
        ctx.addIssue({ code: 'custom', message: 'Invalid check-in timing' });
    }
    if (
      (session.checkins?.after || session.checkins?.dayAfter) &&
      !session.checkins.before
    )
      ctx.addIssue({ code: 'custom', message: 'Missing before check-in' });
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
    variantId: z.string().min(1).max(100).optional(),
    counting: z.enum(['auto', 'manual']).optional(),
    endedEarly: z.boolean().optional(),
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

const savedRehabPlan = z
  .array(plannedExercise)
  .min(1)
  .max(12)
  .refine(validateTrainingPlan);
const routinePlans = z.strictObject({
  A: savedRehabPlan.optional(),
  B: savedRehabPlan.optional(),
});
const metaSchema = z.discriminatedUnion('key', [
  z.strictObject({
    key: z.literal('trainingRoutines'),
    value: z
      .strictObject({
        general: routinePlans.optional(),
        running: routinePlans.optional(),
      })
      .refine(isTrainingRoutines),
  }),
  z.strictObject({
    key: z.literal('weeklySchedule'),
    value: z
      .strictObject({
        days: z.array(z.number().int().min(1).max(7)).min(1).max(3),
        moved: z.strictObject({ from: localDate, to: localDate }).optional(),
      })
      .refine(isWeeklySchedule),
  }),
  z.strictObject({
    key: z.literal('favourites'),
    value: z
      .array(z.enum(Object.keys(exercises) as [ExerciseId, ...ExerciseId[]]))
      .max(200)
      .refine((ids) => new Set(ids).size === ids.length),
  }),
  z.strictObject({
    key: z.literal('customWorkouts'),
    value: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(100),
          name: z.string().trim().min(1).max(60),
          plan: savedRehabPlan.optional(),
          exerciseIds: z
            .array(
              z.enum(Object.keys(exercises) as [ExerciseId, ...ExerciseId[]]),
            )
            .min(1)
            .max(12)
            .refine((ids) => new Set(ids).size === ids.length),
        }),
      )
      .max(30),
  }),
  z.strictObject({
    key: z.literal('repCountPrefs'),
    value: z.strictObject({
      pace: z.partialRecord(
        z.enum(Object.keys(exercises) as [ExerciseId, ...ExerciseId[]]),
        z.number().int().min(0).max(5),
      ),
      manual: z.partialRecord(
        z.enum(Object.keys(exercises) as [ExerciseId, ...ExerciseId[]]),
        z.boolean(),
      ),
    }),
  }),
  z.strictObject({
    key: z.literal('rehabPlans'),
    value: z.strictObject({
      custom: savedRehabPlan.optional(),
      knee: savedRehabPlan
        .refine((plan) =>
          plan.every((p) =>
            kneeRehabExercises.some((ex) => ex.id === p.exerciseId),
          ),
        )
        .optional(),
      'knee-physio': savedRehabPlan.optional(),
    }),
  }),
  z.strictObject({
    key: z.literal('training'),
    value: z.strictObject({
      programId: z.enum(['general', 'running', 'rehab']),
      experience: z.enum(['new', 'some', 'regular']),
      rehabFocus: z.enum(['custom', 'knee', 'knee-physio']).optional(),
      rehabSide: z.enum(['right', 'left', 'both']).optional(),
      bodyParts: z
        .array(z.enum(['legs', 'core', 'back', 'chest', 'shoulders', 'arms']))
        .min(1)
        .max(6)
        .refine((parts) => new Set(parts).size === parts.length)
        .optional(),
      equipment: equipmentChoicesSchema,
      weights: fixedWeightsSchema.optional(),
      adjustableWeights: adjustableWeightsSchema.optional(),
    }),
  }),
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
  schemaVersion: z.union([z.literal(1), z.literal(BACKUP_SCHEMA_VERSION)]),
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
    raw.schemaVersion !== BACKUP_SCHEMA_VERSION &&
    raw.schemaVersion !== 1
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
  // v1 is an additive migration: absent programme fields preserve the legacy policy.
  b.schemaVersion = BACKUP_SCHEMA_VERSION;
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
  const sessionsById = new Map(
    b.sessions.map((session) => [session.id, session]),
  );
  for (const log of b.setLogs) {
    const session = sessionsById.get(log.sessionId);
    if (!session?.programId) continue;
    const plan = session.plan.find(
      (item) => item.exerciseId === log.exerciseId,
    );
    const variant =
      plan &&
      exerciseMetadata[log.exerciseId].variants.find(
        (item) => item.id === plan.variantId,
      );
    const sides =
      plan?.sides ??
      (exercises[log.exerciseId].perSide ? ['right', 'left'] : ['both']);
    const external = variant?.equipment.some(
      (item) => item.type === 'dumbbell' || item.type === 'kettlebell',
    );
    if (
      !plan ||
      !variant ||
      (session.programId === 'rehab' && !session.checkins?.before) ||
      log.variantId !== variant.id ||
      !variant.loadIndices.includes(log.loadIndex) ||
      !sides.includes(log.side) ||
      log.setNumber > plan.sets ||
      log.amount > 600 ||
      log.weightKg > 500 ||
      (external ? log.weightKg <= 0 : log.weightKg !== 0)
    )
      throw new BackupError(
        'invalid',
        'Programme set does not match its saved plan',
      );
  }
  if (
    b.sessions.some(
      (s) =>
        s.status === 'in_progress' &&
        setSessions.has(s.id) &&
        (s.programId === 'rehab'
          ? !s.checkins?.before
          : s.programId
            ? false
            : !withBefore.has(s.id)),
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
