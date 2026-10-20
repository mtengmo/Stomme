import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exercises } from '../content/exercises';
import type {
  PlannedExercise,
  Session,
  TrainingCheckin,
  TrainingPreferences,
} from '../domain/types';
import { buildSteps } from '../rules/sessionPlan';
import { exportAll, importAll, parseBackup, serializeBackup } from './backup';
import { StommeDB } from './db';
import { logSet, setFeedback } from './repo';
import {
  recordTrainingCheckin,
  saveTrainingPreferences,
  startTrainingSession,
} from './training';

const now = new Date('2026-10-20T08:00:00.000Z');
const preferences: TrainingPreferences = {
  programId: 'general',
  experience: 'some',
  equipment: ['bodyweight', 'dumbbell-1'],
};
const plan: PlannedExercise = {
  exerciseId: 'single-leg-rdl',
  sets: 2,
  target: 8,
  loadIndex: 1,
  weightKg: 7.5,
  restSec: 60,
  reason: 'first_time',
  variantId: 'dumbbell',
  sides: ['left'],
};
const before: TrainingCheckin = {
  recordedAt: now.toISOString(),
  feeling: 'ready',
  symptoms: null,
};
const after: TrainingCheckin = {
  recordedAt: '2026-10-20T08:30:00.000Z',
  feeling: 'good',
  symptoms: null,
};
const input = {
  exerciseId: plan.exerciseId,
  setNumber: 1,
  side: 'left' as const,
  amount: 8,
  loadIndex: 1,
};
let db: StommeDB;
beforeEach(() => {
  db = new StommeDB(`training-${crypto.randomUUID()}`);
});
afterEach(async () => {
  vi.useRealTimers();
  db.close();
  await db.delete();
});

describe('programme persistence and safety boundaries', () => {
  it('opens a real version1 database without rewriting legacy pain, effort or active plan', async () => {
    const old = new Dexie(db.name);
    old.version(1).stores({
      sessions: 'id, date, status, templateId',
      setLogs: 'id, sessionId, [exerciseId+loggedAt]',
      painLogs: 'id, sessionId, date, [sessionId+timing]',
      meta: 'key',
    });
    const legacy: Session = {
      id: 'legacy',
      templateId: 'A',
      date: '2026-10-20',
      startedAt: now.toISOString(),
      status: 'in_progress',
      programWeek: 3,
      plan: [{ ...plan, variantId: undefined, sides: undefined, weightKg: 5 }],
      feedback: { 'single-leg-rdl': { effort: 'hard', skipped: false } },
    };
    const pain = {
      id: 'pain',
      sessionId: legacy.id,
      date: legacy.date,
      timing: 'before',
      score: 4,
      location: 'right_knee',
      redFlags: { sharp: false, swelling: false, locking: false },
      createdAt: now.toISOString(),
    };
    await old.table('sessions').put(legacy);
    await old.table('painLogs').put(pain);
    old.close();
    await db.open();
    expect(db.verno).toBe(2);
    expect(await db.sessions.get(legacy.id)).toEqual(legacy);
    expect(await db.painLogs.get(pain.id)).toEqual(pain);
    expect((await db.sessions.get(legacy.id))?.programId).toBeUndefined();
  });

  it('imports a v1 backup additively and retains separate legacy effort and knee pain', async () => {
    const legacy: Session = {
      id: 'legacy',
      templateId: 'A',
      date: '2026-10-20',
      startedAt: now.toISOString(),
      status: 'completed',
      programWeek: 1,
      plan: [],
      feedback: { 'step-up': { effort: 'hard' } },
    };
    const pain = {
      id: 'p',
      sessionId: legacy.id,
      date: legacy.date,
      timing: 'after',
      score: 2,
      location: 'right_knee',
      redFlags: { sharp: false, swelling: false, locking: false },
      createdAt: now.toISOString(),
    };
    await importAll(
      db,
      JSON.stringify({
        schemaVersion: 1,
        exportedAt: now.toISOString(),
        sessions: [legacy],
        setLogs: [],
        painLogs: [pain],
        meta: [],
      }),
    );
    const result = await exportAll(db, now);
    expect(result.schemaVersion).toBe(2);
    expect(result.sessions).toEqual([legacy]);
    expect(result.painLogs).toEqual([pain]);
    expect(result.sessions[0]?.checkins).toBeUndefined();
  });

  it('round-trips programme policy, independent questions, custom weight, variant and selected side', async () => {
    await saveTrainingPreferences(db, preferences);
    const session = await startTrainingSession(
      db,
      preferences,
      'A',
      [plan],
      now,
    );
    await recordTrainingCheckin(db, session.id, 'before', before);
    const logged = await logSet(db, session.id, input, now);
    expect(logged).toMatchObject({
      weightKg: 7.5,
      variantId: 'dumbbell',
      side: 'left',
    });
    await setFeedback(db, session.id, plan.exerciseId, {
      effort: 'easy',
      symptoms: { area: 'Höft', side: 'left', score: 2 },
    });
    await recordTrainingCheckin(db, session.id, 'after', after);
    const backup = await exportAll(db, now);
    await importAll(db, serializeBackup(backup));
    expect(await exportAll(db, now)).toEqual(backup);
    expect(await db.sessions.get(session.id)).toMatchObject({
      programId: 'general',
      policyVersion: 1,
      checkins: { before, after },
      feedback: {
        'single-leg-rdl': { effort: 'easy', symptoms: { score: 2 } },
      },
      status: 'completed',
    });
    expect(
      buildSteps([plan], (id) => exercises[id])
        .filter((step) => step.kind === 'set')
        .map((step) => step.side),
    ).toEqual(['left', 'left']);
  });

  it('requires the before question before logging and finishing and keeps an unanswered symptom unknown', async () => {
    const session = await startTrainingSession(
      db,
      preferences,
      'A',
      [plan],
      now,
    );
    await expect(logSet(db, session.id, input, now)).rejects.toThrow(/före/);
    await expect(
      recordTrainingCheckin(db, session.id, 'after', after),
    ).rejects.toThrow(/före/);
    expect(await db.setLogs.count()).toBe(0);
    expect((await db.sessions.get(session.id))?.checkins).toEqual({});
    await recordTrainingCheckin(db, session.id, 'before', before);
    await expect(logSet(db, session.id, input, now)).resolves.toMatchObject({
      weightKg: 7.5,
    });
    await expect(
      recordTrainingCheckin(db, session.id, 'before', before),
    ).rejects.toThrow(/redan/);
  });

  it('prevents changing programmes during an active session and returns its unchanged snapshot on repeated start', async () => {
    await saveTrainingPreferences(db, preferences);
    const active = await startTrainingSession(
      db,
      preferences,
      'A',
      [plan],
      now,
    );
    const changed = { ...preferences, programId: 'rehab' as const };
    await expect(saveTrainingPreferences(db, changed)).rejects.toThrow(
      /pågående/,
    );
    const resumed = await startTrainingSession(
      db,
      changed,
      'B',
      [{ ...plan, target: 12 }],
      now,
    );
    expect(resumed).toEqual(active);
    expect((await db.meta.get('training'))?.value).toEqual(preferences);
    expect(await db.sessions.count()).toBe(1);
  });

  it.each([
    {
      name: 'unavailable pair',
      prefs: preferences,
      item: { ...plan, exerciseId: 'step-up' as const, variantId: 'dumbbell' },
    },
    {
      name: 'wrong side',
      prefs: preferences,
      item: { ...plan, sides: ['both' as const] },
    },
    {
      name: 'duplicate side',
      prefs: preferences,
      item: { ...plan, sides: ['left' as const, 'left' as const] },
    },
    {
      name: 'missing variant',
      prefs: preferences,
      item: { ...plan, variantId: 'unknown' },
    },
    {
      name: 'zero external weight',
      prefs: preferences,
      item: { ...plan, weightKg: 0 },
    },
    {
      name: 'bodyweight with weight',
      prefs: preferences,
      item: { ...plan, loadIndex: 0, variantId: 'bodyweight', weightKg: 5 },
    },
  ])('rejects $name before creating a session', async ({ prefs, item }) => {
    await expect(
      startTrainingSession(db, prefs, 'A', [item], now),
    ).rejects.toThrow();
    expect(await db.sessions.count()).toBe(0);
  });

  it.each([
    { side: 'right' as const },
    { weightKg: 0 },
    { weightKg: -1 },
    { weightKg: Infinity },
    { loadIndex: 2 },
    { setNumber: 3 },
    { exerciseId: 'dead-bug' as const },
  ])('rejects a set outside its saved side/variant/dose: %j', async (patch) => {
    const session = await startTrainingSession(
      db,
      preferences,
      'A',
      [plan],
      now,
    );
    await recordTrainingCheckin(db, session.id, 'before', before);
    await expect(
      logSet(db, session.id, { ...input, ...patch }, now),
    ).rejects.toThrow();
    expect(await db.setLogs.count()).toBe(0);
  });

  it('rejects a before answer with after-feeling choices and an after answer with readiness choices', async () => {
    const session = await startTrainingSession(
      db,
      preferences,
      'A',
      [plan],
      now,
    );
    await expect(
      recordTrainingCheckin(db, session.id, 'before', after),
    ).rejects.toThrow();
    await recordTrainingCheckin(db, session.id, 'before', before);
    await expect(
      recordTrainingCheckin(db, session.id, 'after', before),
    ).rejects.toThrow();
  });

  it('accepts a due next-day answer once and preserves the original exercise effort', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-21T08:00:00.000Z'));
    const session = await startTrainingSession(
      db,
      { ...preferences, programId: 'rehab' },
      'A',
      [plan],
      now,
    );
    await recordTrainingCheckin(db, session.id, 'before', before);
    await setFeedback(db, session.id, plan.exerciseId, { effort: 'hard' });
    await recordTrainingCheckin(db, session.id, 'after', after);
    const followup = {
      ...after,
      recordedAt: new Date().toISOString(),
      feeling: 'mixed' as const,
      symptoms: { area: 'Höft', side: 'left' as const, score: 3 },
    };
    await recordTrainingCheckin(db, session.id, 'dayAfter', followup);
    await expect(
      recordTrainingCheckin(db, session.id, 'dayAfter', followup),
    ).rejects.toThrow(/redan/);
    expect(await db.sessions.get(session.id)).toMatchObject({
      checkins: { before, after, dayAfter: followup },
      feedback: { 'single-leg-rdl': { effort: 'hard' } },
    });
  });

  it('rejects crafted schema2 plans and sets without replacing existing data', async () => {
    const session = await startTrainingSession(
      db,
      preferences,
      'A',
      [plan],
      now,
    );
    await recordTrainingCheckin(db, session.id, 'before', before);
    await logSet(db, session.id, input, now);
    const valid = await exportAll(db, now);
    const mutations = [
      (b: typeof valid) => {
        const s = b.sessions[0];
        if (s) s.plan[0] = { ...plan, variantId: 'bodyweight' };
      },
      (b: typeof valid) => {
        const s = b.sessions[0];
        if (s) s.plan[0] = { ...plan, sides: ['left', 'left'] };
      },
      (b: typeof valid) => {
        const s = b.sessions[0];
        if (s) s.checkins = {};
      },
      (b: typeof valid) => {
        const l = b.setLogs[0];
        if (l) l.side = 'right';
      },
      (b: typeof valid) => {
        const l = b.setLogs[0];
        if (l) l.weightKg = 0;
      },
      (b: typeof valid) => {
        const s = b.sessions[0];
        if (s) s.policyVersion = undefined;
      },
    ];
    for (const mutate of mutations) {
      const backup = structuredClone(valid);
      mutate(backup);
      expect(() => parseBackup(serializeBackup(backup))).toThrow();
      await expect(importAll(db, serializeBackup(backup))).rejects.toThrow();
      expect(await exportAll(db, now)).toEqual(valid);
    }
  });
});
