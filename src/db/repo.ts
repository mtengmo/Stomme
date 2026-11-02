import Dexie from 'dexie';
import { exerciseMetadata } from '../content/exerciseMetadata';
import { exercises } from '../content/exercises';
import type {
  ExerciseFeedback,
  ExerciseId,
  MetaEntry,
  Session,
  SetLog,
} from '../domain/types';
import { toLocalDate } from '../lib/dates';
import { requestPersistence } from '../lib/storage';
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
      const logs = await db.setLogs.where('sessionId').equals(s.id).toArray();
      const last = lastActivity(s, logs);
      if (!isSessionStale(last, now)) continue;
      const hasCheckin = Object.values(s.checkins ?? {}).some(Boolean);
      if (
        logs.length === 0 &&
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
  else await db.transaction('rw', [db.sessions, db.setLogs, db.meta], run);
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
