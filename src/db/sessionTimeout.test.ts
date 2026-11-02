import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type {
  ExerciseId,
  PlannedExercise,
  Session,
  TrainingPreferences,
} from '../domain/types';
import { defaultPlan } from '../features/training/defaultPlan';
import { hurtLastTime, trainingDayAfterDue } from '../rules/training';
import { startSession } from '../test/legacySession';
import { StommeDB } from './db';
import { expireStaleSessions, getActiveSession, logSet } from './repo';

let db: StommeDB;
let counter = 0;

beforeEach(() => {
  counter += 1;
  db = new StommeDB(`stomme-timeout-${counter}-${Math.random()}`);
});

afterEach(async () => {
  db.close();
  await db.delete();
});

const T0 = new Date(2026, 9, 12, 8, 0, 0);
const min = (m: number) => new Date(T0.getTime() + m * 60_000);
const goblet = (setNumber: number) => ({
  exerciseId: 'goblet-chair-squat' as ExerciseId,
  setNumber,
  side: 'both' as const,
  amount: 10,
  loadIndex: 0,
});

const plan: PlannedExercise[] = [
  {
    exerciseId: 'goblet-chair-squat',
    sets: 2,
    target: 10,
    loadIndex: 0,
    weightKg: 0,
    restSec: 60,
    reason: 'first_time',
  },
];

async function programmeSession(extra: Partial<Session> = {}) {
  const s: Session = {
    id: 'p1',
    templateId: 'A',
    programId: 'general',
    date: '2026-10-12',
    startedAt: T0.toISOString(),
    status: 'in_progress',
    programWeek: 1,
    plan,
    feedback: {},
    checkins: {},
    ...extra,
  };
  await db.sessions.add(s);
  return s;
}

const setLog = (setNumber: number, at: Date) => ({
  id: `l${setNumber}`,
  sessionId: 'p1',
  ...goblet(setNumber),
  weightKg: 0,
  loggedAt: at.toISOString(),
});

describe('expireStaleSessions', () => {
  it('leaves a session with recent activity alone', async () => {
    const s = await startSession(db, 'A', T0);
    await logSet(db, s.id, goblet(1), min(60));
    expect(await expireStaleSessions(db, min(60 + 89))).toEqual([]);
    expect((await getActiveSession(db))?.id).toBe(s.id);
  });

  it('expires at exactly 90 minutes after the last set, keeps its sets', async () => {
    const s = await startSession(db, 'A', T0);
    await logSet(db, s.id, goblet(1), min(30));
    expect(await expireStaleSessions(db, min(30 + 90))).toEqual([s.id]);
    const stored = await db.sessions.get(s.id);
    expect(stored).toMatchObject({
      status: 'aborted',
      abortReason: 'timeout',
      finishedAt: min(30).toISOString(),
    });
    expect(await db.setLogs.count()).toBe(1);
  });

  it('deletes a session where nothing was recorded', async () => {
    const s = await startSession(db, 'A', T0);
    await expireStaleSessions(db, min(90));
    expect(await db.sessions.get(s.id)).toBeUndefined();
  });

  it('completes a programme session whose sets are all logged', async () => {
    await programmeSession();
    await db.setLogs.bulkAdd([setLog(1, min(20)), setLog(2, min(25))]);
    await expireStaleSessions(db, min(25 + 90));
    expect(await db.sessions.get('p1')).toMatchObject({
      status: 'completed',
      finishedAt: min(25).toISOString(),
    });
  });

  it('aborts a programme session with sets missing', async () => {
    await programmeSession();
    await db.setLogs.add(setLog(1, min(20)));
    await expireStaleSessions(db, min(20 + 90));
    expect(await db.sessions.get('p1')).toMatchObject({
      status: 'aborted',
      abortReason: 'timeout',
    });
  });

  it('keeps an empty programme session that has a check-in', async () => {
    await programmeSession({
      checkins: {
        before: {
          recordedAt: min(2).toISOString(),
          feeling: 'ready',
          symptoms: null,
        },
      },
    });
    await expireStaleSessions(db, min(92));
    expect((await db.sessions.get('p1'))?.abortReason).toBe('timeout');
  });

  it('a stale imported session expires on the next check', async () => {
    await programmeSession({
      startedAt: new Date(2026, 0, 1).toISOString(),
      date: '2026-01-01',
    });
    await db.setLogs.add({
      ...setLog(1, new Date(2026, 0, 1, 0, 10)),
    });
    await expireStaleSessions(db, T0);
    expect((await db.sessions.get('p1'))?.status).toBe('aborted');
  });

  it('starting a session never reports a stale one as already running', async () => {
    const old = await startSession(db, 'A', T0);
    await logSet(db, old.id, goblet(1), min(5));
    await expireStaleSessions(db, min(5 + 120));
    const next = await startSession(db, 'B', min(5 + 120));
    expect(next.id).not.toBe(old.id);
    expect((await db.sessions.get(old.id))?.abortReason).toBe('timeout');
  });

  it('a set logged at the same moment wins over the expiry', async () => {
    // Logged first: the set is the last activity, so nothing expires.
    const kept = await startSession(db, 'A', T0);
    await logSet(db, kept.id, goblet(1), min(100));
    expect(await expireStaleSessions(db, min(100))).toEqual([]);
    expect((await db.sessions.get(kept.id))?.status).toBe('in_progress');
    expect(await db.setLogs.count()).toBe(1);
  });

  it('a set after the expiry is rejected and nothing is lost', async () => {
    const s = await startSession(db, 'A', T0);
    await logSet(db, s.id, goblet(1), min(5));
    await expireStaleSessions(db, min(100));
    await expect(logSet(db, s.id, goblet(2), min(100))).rejects.toThrow();
    expect(await db.setLogs.count()).toBe(1);
    expect((await db.sessions.get(s.id))?.abortReason).toBe('timeout');
  });

  it('a timeout is not a pain stop', async () => {
    const s = await startSession(db, 'A', T0);
    await logSet(db, s.id, goblet(1), min(5));
    await expireStaleSessions(db, min(200));
    const stored = (await db.sessions.get(s.id)) as Session;
    expect(stored.abortReason).toBe('timeout');
  });
});

describe('a timeout is never a pain stop (rehab rule stays)', () => {
  const ended = (abortReason: Session['abortReason']): Session => ({
    id: 's',
    templateId: 'A',
    programId: 'general',
    date: '2026-10-12',
    startedAt: '2026-10-12T08:00:00.000Z',
    finishedAt: '2026-10-12T08:20:00.000Z',
    status: 'aborted',
    abortReason,
    programWeek: 1,
    plan: [],
    feedback: {},
    checkins: {},
  });
  const prefs: TrainingPreferences = {
    programId: 'general',
    experience: 'regular',
    equipment: ['bodyweight', 'chair', 'support'],
  };

  it('leaves the general plan the same after a timeout and after a pain stop', () => {
    const ids = (sessions: Session[]) =>
      defaultPlan(prefs, 'A', sessions, []).map((p) => p.exerciseId);
    expect(ids([ended('pain_stop')])).toEqual(ids([ended('timeout')]));
    expect(ids([ended('timeout')])).toEqual(ids([]));
  });

  it('a timeout has no effect, but a pain stop that marked the exercise does', () => {
    const withPlan = (
      abortReason: Session['abortReason'],
      hurt: boolean,
    ): Session => ({
      ...ended(abortReason),
      plan,
      feedback: hurt ? { 'goblet-chair-squat': { hurt: true as const } } : {},
    });
    const found = (sessions: Session[]) =>
      hurtLastTime('goblet-chair-squat', 'general', sessions);
    expect(found([withPlan('timeout', false)])).toBe(false);
    expect(found([withPlan('pain_stop', true)])).toBe(true);
  });

  it('asks for no rehab day-after answer', () => {
    const rehab = { ...ended('timeout'), programId: 'rehab' as const };
    expect(trainingDayAfterDue(rehab, '2026-10-13')).toBe(false);
  });
});
