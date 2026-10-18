import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { StommeDB } from './db';
import type { NewSession } from './repo';
import { createSession, getMeta, listSessions, setMeta } from './repo';

let db: StommeDB;
let counter = 0;

beforeEach(() => {
  counter += 1;
  db = new StommeDB(`stomme-test-${counter}-${Math.random()}`);
});

afterEach(async () => {
  db.close();
  await db.delete();
});

function newSession(
  startedAt: string,
  templateId: 'A' | 'B' = 'A',
): NewSession {
  return {
    templateId,
    date: startedAt.slice(0, 10),
    startedAt,
    status: 'in_progress',
    programWeek: 1,
    plan: [],
    feedback: {},
  };
}

describe('sessions', () => {
  it('starts empty', async () => {
    expect(await listSessions(db)).toEqual([]);
  });

  it('creates a session with a generated id and lists newest first', async () => {
    const first = await createSession(db, newSession('2026-10-12T10:00:00Z'));
    const second = await createSession(
      db,
      newSession('2026-10-15T10:00:00Z', 'B'),
    );
    expect(first.id).toBeTruthy();
    expect(first.id).not.toBe(second.id);
    const list = await listSessions(db);
    expect(list.map((s) => s.id)).toEqual([second.id, first.id]);
  });

  it('keeps a supplied id and rejects duplicates', async () => {
    const s = await createSession(db, {
      ...newSession('2026-10-12T10:00:00Z'),
      id: 'fixed',
    });
    expect(s.id).toBe('fixed');
    await expect(
      createSession(db, { ...newSession('2026-10-13T10:00:00Z'), id: 'fixed' }),
    ).rejects.toThrow();
  });
});

describe('meta', () => {
  it('returns undefined for missing keys', async () => {
    expect(await getMeta(db, 'program')).toBeUndefined();
  });

  it('sets, reads and overwrites values', async () => {
    await setMeta(db, 'program', { startDate: '2026-10-19' });
    expect(await getMeta(db, 'program')).toEqual({ startDate: '2026-10-19' });
    await setMeta(db, 'program', { startDate: '2026-10-26' });
    expect(await getMeta(db, 'program')).toEqual({ startDate: '2026-10-26' });
  });
});

describe('isolation', () => {
  it('a fresh DB name does not see data from another DB', async () => {
    await createSession(db, newSession('2026-10-12T10:00:00Z'));
    const other = new StommeDB(`stomme-other-${Math.random()}`);
    expect(await listSessions(other)).toEqual([]);
    other.close();
    await other.delete();
  });
});
