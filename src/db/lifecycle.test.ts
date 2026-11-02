import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { startSession } from '../test/legacySession';
import { StommeDB } from './db';
import { finishSession, logSet } from './repo';

let db: StommeDB;
beforeEach(() => {
  db = new StommeDB(`stomme-life-${Math.random()}`);
});
afterEach(async () => {
  db.close();
  await db.delete();
});

const DAY1 = new Date(2026, 9, 12, 8, 0);
const DAY3 = new Date(2026, 9, 14, 9, 0);

describe('open sessions', () => {
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
