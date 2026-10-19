import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { StommeDB } from './db';
import {
  addPainLog,
  addWallSit,
  finishSession,
  listPainLogsByDate,
  listPainLogsBySession,
  logSet,
  replanSession,
  startSession,
} from './repo';

let db: StommeDB;
let counter = 0;
const none = { sharp: false, swelling: false, locking: false };

beforeEach(() => {
  counter += 1;
  db = new StommeDB(`stomme-pain-${counter}-${Math.random()}`);
});
afterEach(async () => {
  db.close();
  await db.delete();
});

const D1 = new Date(2026, 9, 12, 8, 0);
const D2 = new Date(2026, 9, 13, 8, 0);

describe('pain logs', () => {
  it('stores and lists by session and by date', async () => {
    const s = await startSession(db, 'A', D1);
    await addPainLog(
      db,
      { sessionId: s.id, timing: 'before', score: 2, redFlags: none },
      D1,
    );
    await addPainLog(
      db,
      { sessionId: s.id, timing: 'after', score: 3, redFlags: none },
      new Date(D1.getTime() + 60000),
    );
    await addPainLog(
      db,
      { sessionId: s.id, timing: 'dayAfter', score: 1, redFlags: none },
      D2,
    );
    expect(
      (await listPainLogsBySession(db, s.id)).map((p) => p.timing),
    ).toEqual(['before', 'after', 'dayAfter']);
    const day = await listPainLogsByDate(db, '2026-10-12');
    expect(day).toHaveLength(2);
    expect(day[0]).toMatchObject({
      location: 'right_knee',
      date: '2026-10-12',
    });
    expect(await listPainLogsByDate(db, '2026-10-13')).toHaveLength(1);
  });

  it('replaces a reading with the same timing', async () => {
    const s = await startSession(db, 'A', D1);
    await addPainLog(
      db,
      { sessionId: s.id, timing: 'before', score: 2, redFlags: none },
      D1,
    );
    await addPainLog(
      db,
      { sessionId: s.id, timing: 'before', score: 5, redFlags: none },
      D1,
    );
    const logs = await listPainLogsBySession(db, s.id);
    expect(logs).toHaveLength(1);
    expect(logs[0]?.score).toBe(5);
  });

  it.each([-1, 11, 2.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid score %s',
    async (score) => {
      const s = await startSession(db, 'A', D1);
      await expect(
        addPainLog(
          db,
          { sessionId: s.id, timing: 'before', score, redFlags: none },
          D1,
        ),
      ).rejects.toThrow();
      expect(await listPainLogsBySession(db, s.id)).toHaveLength(0);
    },
  );
});

describe('replanSession and addWallSit', () => {
  const week2 = new Date(2026, 9, 20, 8, 0);

  async function doneWeek1() {
    const s = await startSession(db, 'A', D1);
    await finishSession(db, s.id, new Date(D1.getTime() + 1800000));
  }

  it('re-snapshots the plan with the before reading', async () => {
    await doneWeek1();
    const s = await startSession(db, 'A', week2);
    expect(s.programWeek).toBe(2);
    await addPainLog(
      db,
      {
        sessionId: s.id,
        timing: 'before',
        score: 2,
        redFlags: { ...none, sharp: true },
      },
      week2,
    );
    await replanSession(db, s.id);
    const fresh = await db.sessions.get(s.id);
    // without logs there is nothing to build on, but the stop gate is applied
    // to the knee-loaded exercise it can hold
    expect(fresh?.plan).toHaveLength(5);
  });

  it('does nothing after a set is logged', async () => {
    const s = await startSession(db, 'A', D1);
    await logSet(
      db,
      s.id,
      {
        exerciseId: 'goblet-chair-squat',
        setNumber: 1,
        side: 'both',
        amount: 10,
        loadIndex: 0,
      },
      D1,
    );
    const before = (await db.sessions.get(s.id))?.plan;
    await replanSession(db, s.id);
    expect((await db.sessions.get(s.id))?.plan).toEqual(before);
  });

  it('appends the wall sit once', async () => {
    const s = await startSession(db, 'A', D1);
    await addWallSit(db, s.id);
    await addWallSit(db, s.id);
    const plan = (await db.sessions.get(s.id))?.plan ?? [];
    expect(plan.filter((p) => p.exerciseId === 'wall-sit')).toHaveLength(1);
    expect(plan.at(-1)).toMatchObject({ sets: 3, target: 30, loadIndex: 0 });
    expect(plan).toHaveLength(6);
  });
});
