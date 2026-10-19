import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { selectedTemplate } from '../content/alternatives';
import { exercises } from '../content/exercises';
import { templates } from '../content/templates';
import type { ExerciseId } from '../domain/types';
import { exportAll, importAll, parseBackup, serializeBackup } from './backup';
import { StommeDB } from './db';
import {
  addWallSit,
  finishSession,
  getActiveSession,
  logSet,
  recordPainReading,
  replanSession,
  setFeedback,
  setMeta,
  startSession,
} from './repo';

let db: StommeDB;
const now = new Date('2026-10-19T10:00:00.000Z');
const none = { sharp: false, swelling: false, locking: false };
const chosen: ExerciseId[] = [
  'split-squat',
  'step-up',
  'single-leg-rdl',
  'bird-dog',
  'side-plank',
];

beforeEach(() => {
  db = new StommeDB(`choices-${crypto.randomUUID()}`);
});
afterEach(async () => {
  db.close();
  await db.delete();
});

describe('controlled exercise choices', () => {
  it('uses the replacement’s own history and load, then retains A/B identity', async () => {
    await setMeta(db, 'program', { startDate: '2026-10-05' });
    const previous = await startSession(
      db,
      'B',
      new Date('2026-10-12T10:00:00Z'),
    );
    const split = previous.plan[0];
    if (!split) throw new Error('Missing initial exercise');
    for (let set = 1; set <= split.sets; set++) {
      for (const side of ['right', 'left'] as const) {
        await logSet(
          db,
          previous.id,
          {
            exerciseId: 'split-squat',
            setNumber: set,
            side,
            amount: split.target,
            loadIndex: 1,
          },
          new Date('2026-10-12T10:05:00Z'),
        );
      }
    }
    await setFeedback(db, previous.id, 'split-squat', { effort: 'ok' });
    await finishSession(db, previous.id, new Date('2026-10-12T10:30:00Z'));
    const session = await startSession(db, 'A', now, chosen);
    expect(session.templateId).toBe('A');
    expect(session.plan[0]).toMatchObject({
      exerciseId: 'split-squat',
      sets: 3,
      target: split.target,
      loadIndex: 1,
      weightKg: exercises['split-squat'].loadLadder[1]?.kg,
      reason: 'added_set',
    });
    expect(session.plan[3]).toMatchObject({
      exerciseId: 'bird-dog',
      target: exercises['bird-dog'].range.start,
      loadIndex: exercises['bird-dog'].startLoadIndex,
      reason: 'first_time',
    });
    expect((await db.sessions.get(previous.id))?.plan).toEqual(previous.plan);
  });

  it('keeps choices, warning gates, base sets and optional wall sit through reload and backup', async () => {
    await setMeta(db, 'program', { startDate: '2026-10-05' });
    const session = await startSession(db, 'A', now, chosen);
    expect(session.plan[0]?.sets).toBe(3);
    await addWallSit(db, session.id);
    await recordPainReading(
      db,
      { sessionId: session.id, timing: 'before', score: 4, redFlags: none },
      now,
    );
    db.close();
    await db.open();
    const active = await getActiveSession(db);
    expect(active?.plan.map((item) => item.exerciseId)).toEqual([
      ...chosen,
      'wall-sit',
    ]);
    expect(active?.plan[0]).toMatchObject({
      sets: 2,
      restSec: 60,
      loadIndex: exercises['split-squat'].week1LoadIndex,
      reason: 'pain_hold',
    });
    expect(active?.plan.at(-1)).toMatchObject({
      exerciseId: 'wall-sit',
      sets: 3,
      target: 30,
    });
    await replanSession(db, session.id);
    expect((await getActiveSession(db))?.plan).toEqual(active?.plan);
    const backup = await exportAll(db, now);
    expect(backup.schemaVersion).toBe(1);
    await importAll(db, serializeBackup(backup));
    expect((await getActiveSession(db))?.plan).toEqual(active?.plan);
  });

  it('stops a chosen session atomically on a red flag', async () => {
    const session = await startSession(db, 'A', now, chosen);
    const result = await recordPainReading(
      db,
      {
        sessionId: session.id,
        timing: 'before',
        score: 0,
        redFlags: { ...none, sharp: true },
      },
      now,
    );
    expect(result.status).toBe('stop');
    expect(await getActiveSession(db)).toBeUndefined();
    expect(await db.sessions.get(session.id)).toMatchObject({
      abortReason: 'pain_stop',
      status: 'aborted',
      plan: session.plan,
    });
    expect(await db.painLogs.count()).toBe(1);
  });

  it.each(
    [
      [],
      chosen.slice(1),
      ['step-up', ...chosen.slice(1)],
      ['wall-sit', ...chosen.slice(1)],
      ['unknown-id', ...chosen.slice(1)],
      Array.from({ length: 5 }),
      Object.assign(new Array(5), {
        1: 'step-up',
        2: 'single-leg-rdl',
        3: 'dead-bug',
        4: 'side-plank',
      }),
    ].map((selection) => ({ selection })),
  )(
    'rejects an invalid selection before changing any table: $selection',
    async ({ selection }) => {
      await expect(
        startSession(db, 'A', now, selection as ExerciseId[]),
      ).rejects.toThrow();
      expect(await db.sessions.count()).toBe(0);
      expect(await db.meta.count()).toBe(0);
      expect(await db.setLogs.count()).toBe(0);
      expect(await db.painLogs.count()).toBe(0);
    },
  );

  it('defaults and reset use the original prescriptions', async () => {
    expect(selectedTemplate('A').items).toEqual(templates.A.items);
    expect(
      selectedTemplate(
        'A',
        templates.A.items.map((item) => item.exerciseId),
      ).items,
    ).toEqual(templates.A.items);
    const session = await startSession(db, 'A', now);
    expect(session.plan.map((item) => item.exerciseId)).toEqual(
      templates.A.items.map((item) => item.exerciseId),
    );
  });

  it('rejects duplicate backup roster entries, preserving older non-current rosters', async () => {
    await startSession(db, 'A', now);
    const backup = await exportAll(db, now);
    const valid = parseBackup(serializeBackup(backup));
    const validSession = valid.sessions[0];
    const backupSession = backup.sessions[0];
    const original = backupSession?.plan[0];
    if (!validSession || !backupSession || !original) {
      throw new Error('Missing backed-up session');
    }
    expect(validSession.plan).toHaveLength(5);
    // Import does not impose today's slot rules on past workout snapshots.
    validSession.plan = [original];
    expect(parseBackup(serializeBackup(valid)).sessions[0]?.plan).toHaveLength(
      1,
    );
    backupSession.plan.push(original);
    expect(() => parseBackup(serializeBackup(backup))).toThrow();
  });
});
