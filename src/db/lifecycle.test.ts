import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { StommeDB } from './db';
import {
  createSession,
  finishSession,
  getMeta,
  logSet,
  programStartDate,
  recordPainReading,
  setMeta,
  startSession,
} from './repo';

let db: StommeDB;
beforeEach(() => {
  db = new StommeDB(`stomme-life-${Math.random()}`);
});
afterEach(async () => {
  db.close();
  await db.delete();
});

const none = { sharp: false, swelling: false, locking: false };
const DAY1 = new Date(2026, 9, 12, 8, 0);
const DAY3 = new Date(2026, 9, 14, 9, 0);

describe('open sessions', () => {
  it('an ok or warn after reading finishes the session', async () => {
    const s = await startSession(db, 'A', DAY1);
    await recordPainReading(
      db,
      { sessionId: s.id, timing: 'before', score: 1, redFlags: none },
      DAY1,
    );
    const end = new Date(2026, 9, 12, 8, 40);
    const r = await recordPainReading(
      db,
      { sessionId: s.id, timing: 'after', score: 5, redFlags: none },
      end,
    );
    expect(r.status).toBe('warn');
    expect(await db.sessions.get(s.id)).toMatchObject({
      status: 'completed',
      finishedAt: end.toISOString(),
    });
  });

  it('finishing a stale session stamps its last logged activity, not now', async () => {
    const s = await startSession(db, 'A', DAY1);
    const logged = new Date(2026, 9, 12, 8, 25);
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
      logged,
    );
    await finishSession(db, s.id, DAY3);
    expect((await db.sessions.get(s.id))?.finishedAt).toBe(
      logged.toISOString(),
    );
  });

  it('finishing a stale session with no sets uses its start time', async () => {
    const s = await startSession(db, 'A', DAY1);
    await finishSession(db, s.id, DAY3);
    expect((await db.sessions.get(s.id))?.finishedAt).toBe(s.startedAt);
  });
});

describe('programme start', () => {
  const old = {
    templateId: 'A' as const,
    startedAt: '2026-09-21T08:00:00.000Z',
    finishedAt: '2026-09-21T08:30:00.000Z',
    status: 'completed' as const,
    programWeek: 1,
    plan: [],
    feedback: {},
  };

  it('derives the start from the earliest session when the meta is missing', async () => {
    await createSession(db, { ...old, date: '2026-09-28' });
    await createSession(db, { ...old, date: '2026-09-21' });
    expect(await programStartDate(db)).toBe('2026-09-21');
  });

  it('ignores a bad stored value', async () => {
    await createSession(db, { ...old, date: '2026-09-21' });
    await db.meta.put({ key: 'program', value: { startDate: 5 } });
    expect(await programStartDate(db)).toBe('2026-09-21');
  });

  it('is null on a fresh install, and startSession then stores today', async () => {
    expect(await programStartDate(db)).toBeNull();
    await startSession(db, 'A', DAY3);
    expect(await getMeta(db, 'program')).toEqual({ startDate: '2026-10-14' });
  });

  it('a missing meta with history does not reset the programme week to 1', async () => {
    await createSession(db, { ...old, date: '2026-09-21' });
    const s = await startSession(db, 'A', DAY3);
    expect(s.programWeek).toBe(4);
    await setMeta(db, 'backup', {});
  });
});
