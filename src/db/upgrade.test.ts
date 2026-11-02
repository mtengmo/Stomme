import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Session, SetLog } from '../domain/types';
import { exportAll, parseBackup, serializeBackup } from './backup';
import { StommeDB } from './db';

let name: string;
let db: StommeDB | undefined;

beforeEach(() => {
  name = `stomme-upgrade-${Math.random()}`;
});
afterEach(async () => {
  db?.close();
  await Dexie.delete(name);
  db = undefined;
});

const session: Session = {
  id: 's1',
  templateId: 'A',
  programId: 'general',
  date: '2026-10-20',
  startedAt: '2026-10-20T08:00:00.000Z',
  finishedAt: '2026-10-20T08:30:00.000Z',
  status: 'completed',
  programWeek: 1,
  plan: [],
  feedback: { 'step-up': { effort: 'ok', hurt: true } },
};
const setLog: SetLog = {
  id: 'l1',
  sessionId: 's1',
  exerciseId: 'step-up',
  setNumber: 1,
  side: 'right',
  amount: 8,
  loadIndex: 0,
  weightKg: 0,
  loggedAt: '2026-10-20T08:05:00.000Z',
};

/** A database exactly as version 2 of the app left it, with pain readings in it. */
async function writeVersion2() {
  const old = new Dexie(name);
  old.version(1).stores({
    sessions: 'id, date, status, templateId',
    setLogs: 'id, sessionId, [exerciseId+loggedAt]',
    painLogs: 'id, sessionId, date, [sessionId+timing]',
    meta: 'key',
  });
  old.version(2).stores({
    sessions: 'id, date, status, templateId',
    setLogs: 'id, sessionId, [exerciseId+loggedAt]',
    painLogs: 'id, sessionId, date, [sessionId+timing]',
    meta: 'key',
  });
  await old.table('sessions').put(session);
  await old.table('setLogs').put(setLog);
  await old.table('painLogs').put({
    id: 'p1',
    sessionId: 's1',
    date: '2026-10-20',
    timing: 'before',
    score: 4,
    location: 'right_knee',
    redFlags: { sharp: false, swelling: false, locking: false },
    createdAt: '2026-10-20T08:00:00.000Z',
  });
  await old.table('meta').put({ key: 'program', value: { startDate: 'x' } });
  old.close();
}

describe('Dexie version 3', () => {
  it('upgrades a version 2 database: keeps sessions, sets and meta, drops painLogs', async () => {
    await writeVersion2();
    db = new StommeDB(name);
    await db.open();
    expect(db.verno).toBe(3);
    expect(db.tables.map((table) => table.name).sort()).toEqual([
      'meta',
      'sessions',
      'setLogs',
    ]);
    expect(await db.sessions.get('s1')).toEqual(session);
    expect(await db.setLogs.get('l1')).toEqual(setLog);
    expect(await db.table('meta').get('program')).toBeUndefined();
    expect(await db.sessions.where('status').equals('completed').count()).toBe(
      1,
    );
    expect(
      await db.setLogs
        .where('[exerciseId+loggedAt]')
        .between(['step-up', Dexie.minKey], ['step-up', Dexie.maxKey])
        .count(),
    ).toBe(1);
  });

  it('removes the painLogs object store from the stored database', async () => {
    await writeVersion2();
    db = new StommeDB(name);
    await db.open();
    db.close();
    const raw = await new Dexie(name).open();
    expect(raw.tables.map((table) => table.name)).not.toContain('painLogs');
    raw.close();
  });

  it('opens a fresh database at version 3', async () => {
    db = new StommeDB(name);
    await db.open();
    expect(db.verno).toBe(3);
    expect(await db.sessions.count()).toBe(0);
  });

  it('upgrades a legacy device so that its own backup imports again', async () => {
    await writeVersion2();
    const old = new Dexie(name);
    old.version(2).stores({
      sessions: 'id, date, status, templateId',
      setLogs: 'id, sessionId, [exerciseId+loggedAt]',
      painLogs: 'id, sessionId, date, [sessionId+timing]',
      meta: 'key',
    });
    const step = {
      exerciseId: 'step-up',
      sets: 2,
      target: 8,
      loadIndex: 0,
      weightKg: 0,
      restSec: 60,
    };
    await old.table('sessions').clear();
    await old.table('setLogs').clear();
    await old.table('sessions').bulkPut([
      {
        ...session,
        id: 'legacy-done',
        programId: undefined,
        plan: [{ ...step, reason: 'pain_hold' }],
      },
      {
        ...session,
        id: 'legacy-open',
        programId: undefined,
        finishedAt: undefined,
        status: 'in_progress',
        plan: [{ ...step, reason: 'pain_stop_hold' }],
      },
    ]);
    old.close();
    db = new StommeDB(name);
    await db.open();
    expect(await db.table('meta').get('program')).toBeUndefined();
    expect((await db.sessions.get('legacy-open'))?.status).toBe('aborted');
    expect((await db.sessions.get('legacy-done'))?.plan[0]?.reason).toBe(
      'hold_incomplete',
    );
    const backup = await exportAll(db);
    expect(() => parseBackup(serializeBackup(backup))).not.toThrow();
  });
});
