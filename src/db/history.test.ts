import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { PainLog, SetLog } from '../domain/types';
import { StommeDB } from './db';
import { deleteSession } from './history';
import { createSession } from './repo';

let db: StommeDB;

beforeEach(() => {
  db = new StommeDB(`stomme-history-${Math.random()}`);
});

afterEach(async () => {
  db.close();
  await db.delete();
});

const base = {
  templateId: 'A' as const,
  status: 'completed' as const,
  programWeek: 1,
  plan: [],
  feedback: {},
};

function setLog(id: string, sessionId: string): SetLog {
  return {
    id,
    sessionId,
    exerciseId: 'step-up',
    setNumber: 1,
    side: 'right',
    amount: 10,
    loadIndex: 0,
    weightKg: 0,
    loggedAt: '2026-10-12T10:00:00.000Z',
  };
}

function painLog(id: string, sessionId: string): PainLog {
  return {
    id,
    sessionId,
    date: '2026-10-12',
    timing: 'before',
    score: 1,
    location: 'right_knee',
    redFlags: { sharp: false, swelling: false, locking: false },
    createdAt: '2026-10-12T10:00:00.000Z',
  };
}

describe('deleteSession', () => {
  it('removes the session with its sets and pain logs, and only those', async () => {
    await createSession(db, {
      ...base,
      id: 'a',
      date: '2026-10-12',
      startedAt: '2026-10-12T10:00:00.000Z',
    });
    await createSession(db, {
      ...base,
      id: 'b',
      date: '2026-10-13',
      startedAt: '2026-10-13T10:00:00.000Z',
    });
    await db.setLogs.bulkAdd([
      setLog('1', 'a'),
      setLog('2', 'a'),
      setLog('3', 'b'),
    ]);
    await db.painLogs.bulkAdd([painLog('p1', 'a'), painLog('p2', 'b')]);

    await deleteSession(db, 'a');

    expect((await db.sessions.toArray()).map((s) => s.id)).toEqual(['b']);
    expect((await db.setLogs.toArray()).map((l) => l.id)).toEqual(['3']);
    expect((await db.painLogs.toArray()).map((l) => l.id)).toEqual(['p2']);
  });

  it('is a no-op for an unknown id', async () => {
    await createSession(db, {
      ...base,
      id: 'a',
      date: '2026-10-12',
      startedAt: '2026-10-12T10:00:00.000Z',
    });
    await deleteSession(db, 'nope');
    expect(await db.sessions.count()).toBe(1);
  });

  it('rolls everything back if a step fails mid-transaction', async () => {
    await createSession(db, {
      ...base,
      id: 'a',
      date: '2026-10-12',
      startedAt: '2026-10-12T10:00:00.000Z',
    });
    await db.setLogs.add(setLog('1', 'a'));
    await db.painLogs.add(painLog('p1', 'a'));
    const original = db.sessions.delete.bind(db.sessions);
    db.sessions.delete = (() => Promise.reject(new Error('boom'))) as never;
    await expect(deleteSession(db, 'a')).rejects.toThrow();
    db.sessions.delete = original;
    expect(await db.setLogs.count()).toBe(1);
    expect(await db.painLogs.count()).toBe(1);
    expect(await db.sessions.count()).toBe(1);
  });
});
