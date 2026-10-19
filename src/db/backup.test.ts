import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exercises } from '../content/exercises';
import type { PainLog, Session, SetLog } from '../domain/types';
import {
  BACKUP_SCHEMA_VERSION,
  BackupError,
  backupFileName,
  exportAll,
  importAll,
  MAX_IMPORT_BYTES,
  serializeBackup,
} from './backup';
import { StommeDB } from './db';
import { setMeta } from './repo';

let db: StommeDB;
let n = 0;

beforeEach(() => {
  n += 1;
  db = new StommeDB(`stomme-backup-${n}-${Math.random()}`);
});
afterEach(async () => {
  db.close();
  await db.delete();
});

const session = (id: string, over: Partial<Session> = {}): Session => ({
  id,
  templateId: 'A',
  date: '2026-10-19',
  startedAt: '2026-10-19T08:00:00.000Z',
  finishedAt: '2026-10-19T08:30:00.000Z',
  status: 'completed',
  programWeek: 2,
  plan: [
    {
      exerciseId: 'step-up',
      sets: 2,
      target: 8,
      loadIndex: 0,
      weightKg: 0,
      restSec: 60,
      reason: 'first_time',
    },
  ],
  feedback: { 'step-up': { effort: 'ok' } },
  ...over,
});
const setLog = (
  id: string,
  sessionId: string,
  over: Partial<SetLog> = {},
): SetLog => ({
  id,
  sessionId,
  exerciseId: 'step-up',
  setNumber: 1,
  side: 'right',
  amount: 8,
  loadIndex: 0,
  weightKg: 0,
  loggedAt: '2026-10-19T08:05:00.000Z',
  ...over,
});
const painLog = (
  id: string,
  sessionId: string,
  over: Partial<PainLog> = {},
): PainLog => ({
  id,
  sessionId,
  date: '2026-10-19',
  timing: 'before',
  score: 3,
  location: 'right_knee',
  redFlags: { sharp: false, swelling: false, locking: false },
  createdAt: '2026-10-19T08:00:00.000Z',
  ...over,
});

async function seed(note = 'hej') {
  await db.sessions.add(session('s1', { note }));
  await db.setLogs.add(setLog('l1', 's1'));
  await db.painLogs.add(painLog('p1', 's1'));
  await setMeta(db, 'program', { startDate: '2026-10-12' });
}

async function valid() {
  await seed();
  return exportAll(db, new Date('2026-10-20T10:00:00Z'));
}
const text = (b: object) => JSON.stringify(b);

async function snapshot() {
  const { exportedAt: _ignored, ...rest } = await exportAll(db);
  return rest;
}

describe('backup', () => {
  it('names the file by local date', () => {
    expect(backupFileName(new Date(2026, 9, 5, 23, 30))).toBe(
      'stomme-backup-2026-10-05.json',
    );
  });

  it('round-trips into a fresh database', async () => {
    const b = await valid();
    expect(b.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    const before = await snapshot();
    await db.sessions.clear();
    await db.setLogs.clear();
    const res = await importAll(db, serializeBackup(b));
    expect(res.counts).toEqual({
      sessions: 1,
      setLogs: 1,
      painLogs: 1,
      meta: 1,
    });
    expect(await snapshot()).toEqual(before);
  });

  it('returns the previous data as a safety backup and replaces everything', async () => {
    const b = await valid();
    await db.sessions.add(session('old'));
    const seen = vi.fn();
    const res = await importAll(db, text(b), { beforeReplace: seen });
    expect(seen).toHaveBeenCalledOnce();
    expect(res.safetyBackup.sessions.map((s) => s.id).sort()).toEqual([
      'old',
      's1',
    ]);
    expect((await db.sessions.toArray()).map((s) => s.id)).toEqual(['s1']);
  });

  it('aborts untouched if beforeReplace fails', async () => {
    const b = await valid();
    const before = await snapshot();
    await expect(
      importAll(db, text(b), {
        beforeReplace: () => {
          throw new Error('disk full');
        },
      }),
    ).rejects.toThrow('disk full');
    expect(await snapshot()).toEqual(before);
  });

  it('rejects wrong schemaVersion', async () => {
    const b = await valid();
    for (const v of [0, 2, '1']) {
      await expect(
        importAll(db, text({ ...b, schemaVersion: v })),
      ).rejects.toMatchObject({
        code: 'schema_version',
      });
    }
  });

  it('rejects malformed input', async () => {
    const b = await valid();
    const bad: unknown[] = [
      '{nope',
      '[]',
      { ...b, sessions: 'x' },
      { ...b, extra: 1 },
      { ...b, sessions: [{ ...b.sessions[0], status: 'weird' }] },
      { ...b, painLogs: [{ ...b.painLogs[0], score: 11 }] },
      { ...b, painLogs: [{ ...b.painLogs[0], score: -1 }] },
      { ...b, painLogs: [{ ...b.painLogs[0], score: 2.5 }] },
      { ...b, setLogs: [{ ...b.setLogs[0], exerciseId: 'nope' }] },
      {
        ...b,
        setLogs: [
          {
            ...b.setLogs[0],
            loadIndex: exercises['step-up'].loadLadder.length,
          },
        ],
      },
      { ...b, setLogs: [{ ...b.setLogs[0], sessionId: 'ghost' }] },
      { ...b, sessions: [b.sessions[0], b.sessions[0]] },
      { ...b, setLogs: [b.setLogs[0], b.setLogs[0]] },
      { ...b, meta: [{ key: 'evil', value: 1 }] },
      { ...b, meta: [b.meta[0], b.meta[0]] },
    ];
    const before = await snapshot();
    for (const x of bad) {
      const t = typeof x === 'string' ? x : text(x as object);
      await expect(importAll(db, t)).rejects.toBeInstanceOf(BackupError);
    }
    expect(await snapshot()).toEqual(before);
  });

  it('rejects oversized input before parsing', async () => {
    const big = `{"pad":"${'x'.repeat(MAX_IMPORT_BYTES)}"}`;
    await expect(importAll(db, big)).rejects.toMatchObject({
      code: 'too_large',
    });
  });

  it('leaves the database unchanged when the write fails mid-import', async () => {
    const b = await valid();
    await db.sessions.add(session('keep'));
    const before = await snapshot();
    vi.spyOn(db.painLogs, 'bulkAdd').mockRejectedValue(new Error('boom'));
    await expect(importAll(db, text(b))).rejects.toThrow();
    vi.restoreAllMocks();
    expect(await snapshot()).toEqual(before);
  });

  it('stores hostile text verbatim as data', async () => {
    const note = '<img src=x onerror="alert(1)"><script>alert(2)</script>';
    await seed(note);
    const b = await exportAll(db);
    await db.sessions.clear();
    await importAll(db, serializeBackup(b));
    expect((await db.sessions.get('s1'))?.note).toBe(note);
  });

  it('rejects an in-progress session with sets but no before-pain reading', async () => {
    const b = await valid();
    const bad = {
      ...b,
      sessions: [
        session('s2', { status: 'in_progress', finishedAt: undefined }),
      ],
      setLogs: [setLog('l9', 's2')],
      painLogs: [],
    };
    await expect(importAll(db, text(bad))).rejects.toMatchObject({
      code: 'invalid',
    });
    const ok = { ...bad, painLogs: [painLog('p9', 's2')] };
    await expect(importAll(db, text(ok))).resolves.toBeDefined();
  });
});
