import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { exercises } from '../content/exercises';
import type { ExerciseId } from '../domain/types';
import { buildSteps, resumeIndex } from '../rules/sessionPlan';
import { StommeDB } from './db';
import {
  abortSession,
  finishSession,
  getActiveSession,
  getMeta,
  getSessionLogs,
  lastLogFor,
  logSet,
  setFeedback,
  startSession,
  undoLastSet,
} from './repo';

let db: StommeDB;
let counter = 0;

beforeEach(() => {
  counter += 1;
  db = new StommeDB(`stomme-session-${counter}-${Math.random()}`);
});

afterEach(async () => {
  db.close();
  await db.delete();
});

const T0 = new Date(2026, 9, 12, 8, 0, 0); // Monday
const at = (sec: number) => new Date(T0.getTime() + sec * 1000);
const goblet = (setNumber: number) => ({
  exerciseId: 'goblet-chair-squat' as ExerciseId,
  setNumber,
  side: 'both' as const,
  amount: 10,
  loadIndex: 0,
});

describe('startSession', () => {
  it('snapshots the plan and sets program.startDate on the first session', async () => {
    const s = await startSession(db, 'A', T0);
    expect(s).toMatchObject({
      templateId: 'A',
      status: 'in_progress',
      programWeek: 1,
      date: '2026-10-12',
    });
    expect(s.plan).toHaveLength(5);
    expect(await getMeta(db, 'program')).toEqual({ startDate: '2026-10-12' });
  });

  it('keeps startDate and derives the week later', async () => {
    const first = await startSession(db, 'A', T0);
    await finishSession(db, first.id, at(1800));
    const later = new Date(2026, 9, 26, 8, 0); // 14 days later
    const second = await startSession(db, 'B', later);
    expect(second.programWeek).toBe(3);
    expect(second.plan[0]?.sets).toBeGreaterThanOrEqual(3);
    expect(await getMeta(db, 'program')).toEqual({ startDate: '2026-10-12' });
  });

  it('returns the running session instead of starting another', async () => {
    const a = await startSession(db, 'A', T0);
    const b = await startSession(db, 'B', at(60));
    expect(b.id).toBe(a.id);
    expect(await db.sessions.count()).toBe(1);
  });
});

describe('logging', () => {
  it('writes each set at once with denormalised weight', async () => {
    const s = await startSession(db, 'A', T0);
    const log = await logSet(db, s.id, { ...goblet(1), loadIndex: 1 }, at(30));
    expect(log.weightKg).toBe(10);
    expect(await db.setLogs.count()).toBe(1);
  });

  it('replaces a set that is logged twice (double tap)', async () => {
    const s = await startSession(db, 'A', T0);
    await logSet(db, s.id, goblet(1), at(30));
    await logSet(db, s.id, { ...goblet(1), amount: 11 }, at(31));
    const logs = await getSessionLogs(db, s.id);
    expect(logs).toHaveLength(1);
    expect(logs[0]?.amount).toBe(11);
  });

  it('undoes only the latest set', async () => {
    const s = await startSession(db, 'A', T0);
    await logSet(db, s.id, goblet(1), at(30));
    await logSet(db, s.id, goblet(2), at(90));
    const undone = await undoLastSet(db, s.id);
    expect(undone?.setNumber).toBe(2);
    expect((await getSessionLogs(db, s.id)).map((l) => l.setNumber)).toEqual([
      1,
    ]);
    expect(await undoLastSet(db, s.id)).toBeDefined();
    expect(await undoLastSet(db, s.id)).toBeUndefined();
  });

  it('rejects writes to a finished session', async () => {
    const s = await startSession(db, 'A', T0);
    await finishSession(db, s.id, at(100));
    await expect(logSet(db, s.id, goblet(1), at(110))).rejects.toThrow();
  });

  it('finds the latest log of an exercise across sessions', async () => {
    const s = await startSession(db, 'A', T0);
    await logSet(db, s.id, goblet(1), at(30));
    await logSet(db, s.id, { ...goblet(2), amount: 12 }, at(90));
    await finishSession(db, s.id, at(200));
    expect((await lastLogFor(db, 'goblet-chair-squat'))?.amount).toBe(12);
    expect(await lastLogFor(db, 'step-up')).toBeUndefined();
  });
});

describe('resume', () => {
  it('derives the cursor from the snapshot and logs after a "killed tab"', async () => {
    const s = await startSession(db, 'A', T0);
    await logSet(db, s.id, goblet(1), at(30));
    await logSet(db, s.id, goblet(2), at(90));
    await setFeedback(db, s.id, 'goblet-chair-squat', { effort: 'ok' });
    await logSet(
      db,
      s.id,
      {
        exerciseId: 'step-up',
        setNumber: 1,
        side: 'right',
        amount: 8,
        loadIndex: 0,
      },
      at(150),
    );

    // a fresh read, as after a reload
    const active = await getActiveSession(db);
    expect(active?.id).toBe(s.id);
    if (!active) return;
    const steps = buildSteps(active.plan, (id) => exercises[id]);
    const i = resumeIndex(
      steps,
      await getSessionLogs(db, s.id),
      active.feedback,
    );
    expect(steps[i]).toMatchObject({
      kind: 'set',
      exerciseId: 'step-up',
      setNumber: 1,
      side: 'left',
    });
  });

  it('treats a skipped exercise as done', async () => {
    const s = await startSession(db, 'A', T0);
    await setFeedback(db, s.id, 'goblet-chair-squat', { skipped: true });
    const active = await getActiveSession(db);
    expect(active?.feedback['goblet-chair-squat']?.skipped).toBe(true);
    if (!active) return;
    const steps = buildSteps(active.plan, (id) => exercises[id]);
    expect(steps[resumeIndex(steps, [], active.feedback)]).toMatchObject({
      exerciseId: 'step-up',
    });
  });
});

describe('ending', () => {
  it('completes with a finish time', async () => {
    const s = await startSession(db, 'A', T0);
    await finishSession(db, s.id, at(1500));
    const stored = await db.sessions.get(s.id);
    expect(stored?.status).toBe('completed');
    expect(stored?.finishedAt).toBe(at(1500).toISOString());
    expect(await getActiveSession(db)).toBeUndefined();
  });

  it('aborts and keeps the logged sets', async () => {
    const s = await startSession(db, 'A', T0);
    await logSet(db, s.id, goblet(1), at(30));
    await abortSession(db, s.id, at(60));
    const stored = await db.sessions.get(s.id);
    expect(stored).toMatchObject({ status: 'aborted', abortReason: 'user' });
    expect(await db.setLogs.count()).toBe(1);
    expect(await getActiveSession(db)).toBeUndefined();
  });
});
