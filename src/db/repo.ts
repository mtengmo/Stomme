import Dexie from 'dexie';
import { selectedTemplate, snapshotTemplate } from '../content/alternatives';
import { exerciseMetadata } from '../content/exerciseMetadata';
import { exercises } from '../content/exercises';
import type {
  ExerciseFeedback,
  ExerciseId,
  MetaEntry,
  PainLog,
  Session,
  SetLog,
  TemplateId,
} from '../domain/types';
import { isRealDate, toLocalDate } from '../lib/dates';
import { requestPersistence } from '../lib/storage';
import type { PlanningData } from '../rules/nextPlan';
import { buildPlan, wallSitPlan } from '../rules/nextPlan';
import {
  assessReading,
  dayAfterReference,
  isValidScore,
  type PainAssessment,
  shouldPromptDayAfter,
} from '../rules/pain';
import { programWeek } from '../rules/schedule';
import { buildSteps } from '../rules/sessionPlan';
import { isSessionStale, lastActivity } from '../rules/sessionTimeout';
import type { StommeDB } from './db';

export type NewSession = Omit<Session, 'id'> & { id?: string };

/** Stores a session; generates an id when not given. Returns the stored session. */
export async function createSession(
  db: StommeDB,
  input: NewSession,
): Promise<Session> {
  const session: Session = { ...input, id: input.id ?? crypto.randomUUID() };
  await db.sessions.add(session);
  return session;
}

/** All sessions, newest first. */
export async function listSessions(db: StommeDB): Promise<Session[]> {
  const all = await db.sessions.toArray();
  return all.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export async function getMeta<T = unknown>(
  db: StommeDB,
  key: MetaEntry['key'],
): Promise<T | undefined> {
  const entry = await db.meta.get(key);
  return entry?.value as T | undefined;
}

export async function setMeta(
  db: StommeDB,
  key: MetaEntry['key'],
  value: unknown,
): Promise<void> {
  await db.meta.put({ key, value });
}

/* ---------- Session mode ---------- */

export interface NewSetLog {
  exerciseId: ExerciseId;
  setNumber: number;
  side: SetLog['side'];
  amount: number;
  loadIndex: number;
  weightKg?: number;
  counting?: SetLog['counting'];
  endedEarly?: boolean;
}

/** The in-progress session, if any (newest if there are several). */
export async function getActiveSession(
  db: StommeDB,
): Promise<Session | undefined> {
  const open = await db.sessions
    .where('status')
    .equals('in_progress')
    .toArray();
  return open.sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
}

/**
 * Starts a session from the interim prescription and snapshots the plan.
 * Sets program.startDate on the very first session. If a session is already in
 * progress it is returned instead of starting a second one.
 */
export async function startSession(
  db: StommeDB,
  templateId: TemplateId,
  now: Date,
  selection?: readonly ExerciseId[],
): Promise<Session> {
  const template = selectedTemplate(templateId, selection);
  return db.transaction(
    'rw',
    [db.sessions, db.meta, db.setLogs, db.painLogs],
    async () => {
      await expireStaleSessions(db, now);
      const active = await getActiveSession(db);
      if (active) return active;
      const today = toLocalDate(now);
      const known = await programStartDate(db);
      const startDate = known ?? today;
      if (!known) await setMeta(db, 'program', { startDate });
      const week = programWeek(startDate, today);
      const data = await planningData(db);
      const session: Session = {
        id: crypto.randomUUID(),
        templateId,
        date: today,
        startedAt: now.toISOString(),
        status: 'in_progress',
        programWeek: week,
        plan: buildPlan(template, week, data).map((i) => i.plan),
        feedback: {},
      };
      await db.sessions.add(session);
      return session;
    },
  );
}

/**
 * The programme start date, defensively: a valid stored date wins; if the
 * meta is missing or bad but sessions exist, the earliest session date, so
 * the programme week never silently drops back to 1. Null on a fresh install.
 */
export async function programStartDate(db: StommeDB): Promise<string | null> {
  const program = await getMeta<{ startDate?: unknown }>(db, 'program');
  if (isRealDate(program?.startDate)) return program.startDate;
  const dates = (await db.sessions.toArray())
    .filter((s) => !s.programId)
    .map((s) => s.date)
    .filter(isRealDate);
  return dates.length > 0 ? dates.reduce((a, b) => (a < b ? a : b)) : null;
}

/** Everything the progression rules read, in one go. */
export async function planningData(db: StommeDB): Promise<PlanningData> {
  const [sessions, setLogs, painLogs] = await Promise.all([
    db.sessions.toArray(),
    db.setLogs.toArray(),
    db.painLogs.toArray(),
  ]);
  return { sessions, setLogs, painLogs };
}

async function requireOpen(db: StommeDB, sessionId: string): Promise<Session> {
  const s = await db.sessions.get(sessionId);
  if (!s) throw new Error(`Unknown session ${sessionId}`);
  if (s.status !== 'in_progress') throw new Error('Session is not in progress');
  return s;
}

/** Writes one set in its own transaction; re-logging the same set replaces it. */
export async function logSet(
  db: StommeDB,
  sessionId: string,
  input: NewSetLog,
  now: Date,
): Promise<SetLog> {
  return db.transaction('rw', db.sessions, db.setLogs, async () => {
    const session = await requireOpen(db, sessionId);
    if (session.programId) {
      if (session.programId === 'rehab' && !session.checkins?.before)
        throw new Error('Svara på frågorna före passet först.');
      const planned = session.plan.find(
        (p) => p.exerciseId === input.exerciseId,
      );
      const variant =
        planned &&
        exerciseMetadata[input.exerciseId].variants.find(
          (item) => item.id === planned.variantId,
        );
      const external = variant?.equipment.some(
        (item) => item.type === 'dumbbell' || item.type === 'kettlebell',
      );
      const weight = input.weightKg ?? planned?.weightKg;
      const sides =
        planned?.sides ??
        (exercises[input.exerciseId].perSide ? ['right', 'left'] : ['both']);
      if (
        !planned ||
        !variant?.loadIndices.includes(input.loadIndex) ||
        !sides.includes(input.side) ||
        !Number.isInteger(input.setNumber) ||
        input.setNumber < 1 ||
        input.setNumber > planned.sets ||
        !Number.isFinite(input.amount) ||
        input.amount < 0 ||
        input.amount > 600 ||
        typeof weight !== 'number' ||
        !Number.isFinite(weight) ||
        weight < 0 ||
        weight > 500 ||
        (external ? weight <= 0 : weight !== 0)
      )
        throw new Error('Kontrollera vikt, antal och arbetande sida.');
    }
    if (
      input.weightKg !== undefined &&
      (!Number.isFinite(input.weightKg) ||
        input.weightKg < 0 ||
        input.weightKg > 500)
    )
      throw new Error('Invalid weight');
    const existing = await db.setLogs
      .where('sessionId')
      .equals(sessionId)
      .filter(
        (l) =>
          l.exerciseId === input.exerciseId &&
          l.setNumber === input.setNumber &&
          l.side === input.side,
      )
      .primaryKeys();
    await db.setLogs.bulkDelete(existing);
    const ladder = exercises[input.exerciseId].loadLadder;
    const log: SetLog = {
      id: crypto.randomUUID(),
      sessionId,
      ...input,
      weightKg: session.programId
        ? (input.weightKg ??
          session.plan.find((p) => p.exerciseId === input.exerciseId)
            ?.weightKg ??
          ladder[input.loadIndex]?.kg ??
          0)
        : (ladder[input.loadIndex]?.kg ?? 0),
      ...(session.plan.find((p) => p.exerciseId === input.exerciseId)?.variantId
        ? {
            variantId: session.plan.find(
              (p) => p.exerciseId === input.exerciseId,
            )?.variantId,
          }
        : {}),
      loggedAt: now.toISOString(),
    };
    await db.setLogs.add(log);
    return log;
  });
}

/** Removes the most recently logged set of the session and returns it. */
export async function undoLastSet(
  db: StommeDB,
  sessionId: string,
): Promise<SetLog | undefined> {
  return db.transaction('rw', db.sessions, db.setLogs, async () => {
    await requireOpen(db, sessionId);
    const logs = await db.setLogs
      .where('sessionId')
      .equals(sessionId)
      .toArray();
    let last: SetLog | undefined;
    for (const l of logs) {
      if (!last || l.loggedAt >= last.loggedAt) last = l;
    }
    if (last) await db.setLogs.delete(last.id);
    return last;
  });
}

export async function getSessionLogs(
  db: StommeDB,
  sessionId: string,
): Promise<SetLog[]> {
  const logs = await db.setLogs.where('sessionId').equals(sessionId).toArray();
  return logs.sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
}

/** The latest set ever logged for an exercise, used to prefill the steppers. */
export async function lastLogFor(
  db: StommeDB,
  exerciseId: ExerciseId,
): Promise<SetLog | undefined> {
  return db.setLogs
    .where('[exerciseId+loggedAt]')
    .between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey])
    .last();
}

/** Merges effort/skipped for one exercise into the session. */
export async function setFeedback(
  db: StommeDB,
  sessionId: string,
  exerciseId: ExerciseId,
  feedback: ExerciseFeedback,
): Promise<void> {
  await db.transaction('rw', db.sessions, async () => {
    const s = await requireOpen(db, sessionId);
    await db.sessions.update(sessionId, {
      feedback: {
        ...s.feedback,
        [exerciseId]: { ...s.feedback[exerciseId], ...feedback },
      },
    });
  });
}

/**
 * Completes an open session. A session left open from an earlier day is
 * stamped with its last logged activity (not 
ow), so durations stay honest.
 */
export async function finishSession(
  db: StommeDB,
  sessionId: string,
  now: Date,
): Promise<void> {
  await db.transaction('rw', [db.sessions, db.setLogs], async () => {
    await completeOpenSession(db, sessionId, now);
  });
  // Best effort, outside the transaction: ask the browser to keep our data.
  void requestPersistence();
}

async function completeOpenSession(
  db: StommeDB,
  sessionId: string,
  now: Date,
): Promise<void> {
  const s = await requireOpen(db, sessionId);
  let finishedAt = now.toISOString();
  if (s.date < toLocalDate(now)) {
    const logs = await db.setLogs
      .where('sessionId')
      .equals(sessionId)
      .toArray();
    finishedAt = logs.reduce(
      (latest, l) => (l.loggedAt > latest ? l.loggedAt : latest),
      s.startedAt,
    );
  }
  await db.sessions.update(sessionId, { status: 'completed', finishedAt });
}

/** Ends a session early; logged sets are kept. */
export async function abortSession(
  db: StommeDB,
  sessionId: string,
  now: Date,
  reason: NonNullable<Session['abortReason']> = 'user',
): Promise<void> {
  await db.transaction('rw', db.sessions, async () => {
    await requireOpen(db, sessionId);
    await db.sessions.update(sessionId, {
      status: 'aborted',
      abortReason: reason,
      finishedAt: now.toISOString(),
    });
  });
}

/**
 * Ends open sessions with no activity for 90 minutes, in ONE transaction that
 * re-reads everything so a set logged at the same moment wins.
 * - nothing recorded: deleted (like an abandoned preparation);
 * - every non-skipped set logged: completed;
 * - anything else: aborted with reason 'timeout' (never a pain stop).
 * finishedAt is the last activity, so the duration stays honest.
 * Returns the ids of sessions that were ended or removed.
 */
export async function expireStaleSessions(
  db: StommeDB,
  now: Date,
): Promise<string[]> {
  const ended: string[] = [];
  const run = async () => {
    const open = await db.sessions
      .where('status')
      .equals('in_progress')
      .toArray();
    for (const s of open) {
      const [logs, pain] = await Promise.all([
        db.setLogs.where('sessionId').equals(s.id).toArray(),
        db.painLogs.where('sessionId').equals(s.id).toArray(),
      ]);
      const last = lastActivity(s, logs, pain);
      if (!isSessionStale(last, now)) continue;
      const hasCheckin = Object.values(s.checkins ?? {}).some(Boolean);
      if (
        logs.length === 0 &&
        pain.length === 0 &&
        !hasCheckin &&
        Object.keys(s.feedback ?? {}).length === 0 &&
        !s.note?.trim()
      ) {
        await db.sessions.delete(s.id);
      } else if (allSetsLogged(s, logs)) {
        await db.sessions.update(s.id, {
          status: 'completed',
          finishedAt: last,
        });
      } else {
        await db.sessions.update(s.id, {
          status: 'aborted',
          abortReason: 'timeout',
          finishedAt: last,
        });
      }
      ended.push(s.id);
    }
  };
  // Nested inside a caller's transaction when there is one.
  if (Dexie.currentTransaction) await run();
  else
    await db.transaction(
      'rw',
      [db.sessions, db.setLogs, db.painLogs, db.meta],
      run,
    );
  return ended;
}

function allSetsLogged(s: Session, logs: readonly SetLog[]): boolean {
  const sets = buildSteps(s.plan, (id) => exercises[id]).filter(
    (step) => step.kind === 'set',
  );
  return (
    sets.length > 0 &&
    sets.every(
      (step) =>
        s.feedback[step.exerciseId]?.skipped === true ||
        logs.some(
          (l) =>
            l.exerciseId === step.exerciseId &&
            l.setNumber === step.setNumber &&
            l.side === step.side,
        ),
    )
  );
}

/* ---------- Pain ---------- */

export interface NewPainLog {
  sessionId: string;
  timing: PainLog['timing'];
  score: number;
  redFlags: PainLog['redFlags'];
}

/**
 * Stores one pain reading. An invalid score (not an integer 0-10) is rejected.
 * One reading per session and timing: a new one replaces the old.
 */
export async function addPainLog(
  db: StommeDB,
  input: NewPainLog,
  now: Date,
): Promise<PainLog> {
  if (!isValidScore(input.score)) {
    throw new Error(`Invalid pain score ${String(input.score)}`);
  }
  const log: PainLog = {
    id: crypto.randomUUID(),
    sessionId: input.sessionId,
    date: toLocalDate(now),
    timing: input.timing,
    score: input.score,
    location: 'right_knee',
    redFlags: { ...input.redFlags },
    createdAt: now.toISOString(),
  };
  await db.transaction('rw', db.painLogs, async () => {
    const old = await db.painLogs
      .where('[sessionId+timing]')
      .equals([input.sessionId, input.timing])
      .primaryKeys();
    await db.painLogs.bulkDelete(old);
    await db.painLogs.add(log);
  });
  return log;
}

/** A session's readings, oldest first. */
export async function listPainLogsBySession(
  db: StommeDB,
  sessionId: string,
): Promise<PainLog[]> {
  const logs = await db.painLogs.where('sessionId').equals(sessionId).toArray();
  return logs.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Readings taken on a local date (YYYY-MM-DD), oldest first. */
export async function listPainLogsByDate(
  db: StommeDB,
  date: string,
): Promise<PainLog[]> {
  const logs = await db.painLogs.where('date').equals(date).toArray();
  return logs.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * Re-snapshots the session plan from the rules once today's 'before' reading
 * is known. Does nothing once a set is logged. Never lowers a load by itself.
 */
export async function replanSession(
  db: StommeDB,
  sessionId: string,
): Promise<void> {
  await db.transaction(
    'rw',
    [db.sessions, db.setLogs, db.painLogs],
    async () => {
      const s = await requireOpen(db, sessionId);
      const logged = await db.setLogs
        .where('sessionId')
        .equals(sessionId)
        .count();
      if (logged > 0) return;
      const before = (await listPainLogsBySession(db, sessionId)).find(
        (p) => p.timing === 'before',
      );
      const data = await planningData(db);
      const plan = buildPlan(
        snapshotTemplate(s),
        s.programWeek,
        data,
        before ? assessReading(before).status : 'ok',
        sessionId,
      ).map((i) => i.plan);
      const extras = s.plan.filter((p) => p.exerciseId === 'wall-sit');
      await db.sessions.update(sessionId, { plan: [...plan, ...extras] });
    },
  );
}

/** Adds the optional wall sit (3 x 30 s) at the end of the plan, once. */
export async function addWallSit(
  db: StommeDB,
  sessionId: string,
): Promise<void> {
  await db.transaction('rw', db.sessions, async () => {
    const s = await requireOpen(db, sessionId);
    if (s.plan.some((p) => p.exerciseId === 'wall-sit')) return;
    await db.sessions.update(sessionId, {
      plan: [...s.plan, wallSitPlan(s.plan[0]?.restSec)],
    });
  });
}

/**
 * Writes one pain reading and its consequence in ONE transaction: a red flag
 * aborts an open session with pain_stop (logs kept); a 'before' reading that
 * is not a stop replans the session. 'before' is one-shot (rejected when a
 * 'before' reading or any set already exists) and a 'dayAfter' reading must be
 * inside the shouldPromptDayAfter window.
 */
export async function recordPainReading(
  db: StommeDB,
  input: NewPainLog,
  now: Date,
): Promise<PainAssessment> {
  if (!isValidScore(input.score)) {
    throw new Error(`Invalid pain score ${String(input.score)}`);
  }
  return db.transaction(
    'rw',
    [db.sessions, db.setLogs, db.painLogs],
    async () => {
      const s = await db.sessions.get(input.sessionId);
      if (!s) throw new Error(`Unknown session ${input.sessionId}`);
      const existing = await listPainLogsBySession(db, s.id);
      if (input.timing === 'dayAfter') {
        const all = await db.sessions.toArray();
        if (!shouldPromptDayAfter(s, existing, toLocalDate(now), all)) {
          throw new Error('Day-after reading is not due');
        }
      } else if (s.status !== 'in_progress') {
        throw new Error('Session is not in progress');
      }
      if (input.timing === 'before') {
        const logged = await db.setLogs.where('sessionId').equals(s.id).count();
        if (logged > 0 || existing.some((p) => p.timing === 'before')) {
          throw new Error('The before reading is already taken');
        }
      }
      await addPainLog(db, input, now);
      const readings = await listPainLogsBySession(db, s.id);
      const mine = readings.find((r) => r.timing === input.timing);
      const result = assessReading(
        mine ?? { ...input, score: Number.NaN },
        input.timing === 'dayAfter' ? dayAfterReference(readings) : undefined,
      );
      if (input.timing === 'after' && s.status === 'in_progress') {
        // The session is over: an 'after' reading finishes it. A red flag here
        // keeps it completed (like the day-after case); the stop banner and the
        // held next plan come from the reading itself.
        await completeOpenSession(db, s.id, now);
        void requestPersistence();
      } else if (result.status === 'stop' && s.status === 'in_progress') {
        await abortSession(db, s.id, now, 'pain_stop');
      } else if (input.timing === 'before') {
        await replanSession(db, s.id);
      }
      return result;
    },
  );
}
