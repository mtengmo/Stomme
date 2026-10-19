import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ExerciseId } from '../domain/types';
import { StommeDB } from './db';
import {
  abortSession,
  addPainLog,
  addWallSit,
  finishSession,
  listPainLogsBySession,
  logSet,
  recordPainReading,
  replanSession,
  startSession,
} from './repo';

let db: StommeDB;
let counter = 0;
const none = { sharp: false, swelling: false, locking: false };

beforeEach(() => {
  counter += 1;
  db = new StommeDB(`stomme-record-${counter}-${Math.random()}`);
});
afterEach(async () => {
  db.close();
  await db.delete();
});

const W1 = new Date(2026, 9, 12, 8, 0);
const W2 = new Date(2026, 9, 19, 8, 0);

async function logAll(sessionId: string, ids: ExerciseId[], now: Date) {
  const s = await db.sessions.get(sessionId);
  for (const id of ids) {
    const p = s?.plan.find((x) => x.exerciseId === id);
    for (let n = 1; n <= (p?.sets ?? 0); n++) {
      for (const side of ['right', 'left', 'both'] as const) {
        const perSide = id !== 'goblet-chair-squat';
        if (perSide === (side === 'both')) continue;
        await logSet(
          db,
          sessionId,
          {
            exerciseId: id,
            setNumber: n,
            side,
            amount: p?.target ?? 10,
            loadIndex: p?.loadIndex ?? 0,
          },
          now,
        );
      }
    }
  }
}

async function weekOneDone() {
  const s = await startSession(db, 'A', W1);
  await logAll(s.id, ['goblet-chair-squat', 'dead-bug'], W1);
  await finishSession(db, s.id, new Date(W1.getTime() + 1800000));
  return s;
}

describe('recordPainReading', () => {
  it('a red flag aborts the open session with pain_stop in one go and keeps logs', async () => {
    const s = await startSession(db, 'A', W1);
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
      W1,
    );
    const r = await recordPainReading(
      db,
      {
        sessionId: s.id,
        timing: 'after',
        score: 1,
        redFlags: { ...none, locking: true },
      },
      W1,
    );
    expect(r.status).toBe('stop');
    expect(await db.sessions.get(s.id)).toMatchObject({
      status: 'aborted',
      abortReason: 'pain_stop',
    });
    expect(await db.setLogs.count()).toBe(1);
    expect(await listPainLogsBySession(db, s.id)).toHaveLength(1);
  });

  it('is atomic: a failure leaves no reading behind', async () => {
    const s = await startSession(db, 'A', W1);
    await finishSession(db, s.id, W1);
    await expect(
      recordPainReading(
        db,
        { sessionId: s.id, timing: 'after', score: 1, redFlags: none },
        W1,
      ),
    ).rejects.toThrow();
    expect(await listPainLogsBySession(db, s.id)).toHaveLength(0);
  });

  it('before is one-shot and rejected once a set is logged', async () => {
    const s = await startSession(db, 'A', W1);
    const input = {
      sessionId: s.id,
      timing: 'before' as const,
      score: 1,
      redFlags: none,
    };
    expect((await recordPainReading(db, input, W1)).status).toBe('ok');
    await expect(
      recordPainReading(db, { ...input, score: 2 }, W1),
    ).rejects.toThrow('already taken');
    const t = await startSession(db, 'B', W1).catch(() => undefined);
    expect(t?.id).toBe(s.id); // still the one open session
    await abortSession(db, s.id, W1);
    const u = await startSession(db, 'A', W1);
    await logAll(u.id, ['goblet-chair-squat'], W1);
    await expect(
      recordPainReading(db, { ...input, sessionId: u.id }, W1),
    ).rejects.toThrow();
  });

  it('rejects an invalid score and a missing session', async () => {
    const s = await startSession(db, 'A', W1);
    await expect(
      recordPainReading(
        db,
        { sessionId: s.id, timing: 'before', score: 11, redFlags: none },
        W1,
      ),
    ).rejects.toThrow('Invalid');
    await expect(
      recordPainReading(
        db,
        { sessionId: 'nope', timing: 'before', score: 1, redFlags: none },
        W1,
      ),
    ).rejects.toThrow('Unknown');
  });

  it('a dayAfter reading must be inside the prompt window', async () => {
    const s = await startSession(db, 'A', W1);
    await finishSession(db, s.id, W1);
    const input = {
      sessionId: s.id,
      timing: 'dayAfter' as const,
      score: 2,
      redFlags: none,
    };
    // same day: too early; three days later: too late
    await expect(recordPainReading(db, input, W1)).rejects.toThrow('not due');
    await expect(
      recordPainReading(db, input, new Date(2026, 9, 15, 8)),
    ).rejects.toThrow('not due');
    const day = new Date(2026, 9, 13, 8);
    expect((await recordPainReading(db, input, day)).status).toBe('ok');
    // already answered
    await expect(recordPainReading(db, input, day)).rejects.toThrow();
  });

  it('a day-after red flag stops without aborting anything', async () => {
    const s = await startSession(db, 'A', W1);
    await finishSession(db, s.id, W1);
    const r = await recordPainReading(
      db,
      {
        sessionId: s.id,
        timing: 'dayAfter',
        score: 1,
        redFlags: { ...none, sharp: true },
      },
      new Date(2026, 9, 13, 8),
    );
    expect(r.status).toBe('stop');
    expect((await db.sessions.get(s.id))?.status).toBe('completed');
  });
});

describe('week 2 plan with a warn before reading', () => {
  it('holds the knee exercise at the logged load without a new set; others progress', async () => {
    await weekOneDone();
    const s = await startSession(db, 'A', W2);
    expect(s.programWeek).toBe(2);
    const r = await recordPainReading(
      db,
      { sessionId: s.id, timing: 'before', score: 5, redFlags: none },
      W2,
    );
    expect(r.status).toBe('warn');
    const plan = (await db.sessions.get(s.id))?.plan ?? [];
    const goblet = plan.find((p) => p.exerciseId === 'goblet-chair-squat');
    expect(goblet).toMatchObject({
      reason: 'pain_hold',
      loadIndex: 0,
      sets: 2,
    });
    const bug = plan.find((p) => p.exerciseId === 'dead-bug');
    expect(bug?.reason).toBe('start_load');
  });

  it('replan keeps an added wall sit', async () => {
    const s = await startSession(db, 'A', W1);
    await addWallSit(db, s.id);
    await replanSession(db, s.id);
    expect(
      (await db.sessions.get(s.id))?.plan.some(
        (p) => p.exerciseId === 'wall-sit',
      ),
    ).toBe(true);
  });
});

describe('after a day-after red flag', () => {
  it('the next plan holds knee exercises with seePhysio via pain_stop_hold', async () => {
    const first = await weekOneDone();
    await recordPainReading(
      db,
      {
        sessionId: first.id,
        timing: 'dayAfter',
        score: 1,
        redFlags: { ...none, swelling: true },
      },
      new Date(2026, 9, 13, 8),
    );
    const s = await startSession(db, 'A', W2);
    await addPainLog(
      db,
      { sessionId: s.id, timing: 'before', score: 0, redFlags: none },
      W2,
    );
    await replanSession(db, s.id);
    const goblet = (await db.sessions.get(s.id))?.plan[0];
    expect(goblet?.reason).toBe('pain_stop_hold');
  });
});
