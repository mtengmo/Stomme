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
  canReplaceTrainingPreparation,
  deferAfterCheckin,
  recordTrainingCheckin,
  saveRehabPlan,
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
  it('allows changing preferences during preparation without recording an aborted workout', async () => {
    await saveTrainingPreferences(db, preferences);
    const prepared = await startTrainingSession(
      db,
      preferences,
      'A',
      [plan],
      now,
    );
    expect(await canReplaceTrainingPreparation(db, prepared)).toBe(true);
    await saveTrainingPreferences(db, {
      ...preferences,
      programId: 'running',
      experience: 'regular',
    });
    expect(await db.sessions.count()).toBe(0);
    expect((await db.meta.get('training'))?.value).toMatchObject({
      programId: 'running',
      experience: 'regular',
    });
  });
  it('restores the prepared plan if saving new preferences fails', async () => {
    await saveTrainingPreferences(db, preferences);
    const prepared = await startTrainingSession(
      db,
      preferences,
      'A',
      [plan],
      now,
    );
    vi.spyOn(db.meta, 'put').mockRejectedValueOnce(new Error('Storage full'));
    await expect(
      saveTrainingPreferences(db, { ...preferences, programId: 'running' }),
    ).rejects.toThrow('Storage full');
    expect(await db.sessions.get(prepared.id)).toEqual(prepared);
    expect((await db.meta.get('training'))?.value).toEqual(preferences);
  });
  it('replaces an unstarted A with B and snapshots experience; the clock starts with the answers', async () => {
    const prepared = await startTrainingSession(
      db,
      preferences,
      'A',
      [plan],
      now,
    );
    const replacement = await startTrainingSession(
      db,
      preferences,
      'B',
      [{ ...plan, target: 9 }],
      now,
    );
    expect(await db.sessions.get(prepared.id)).toBeUndefined();
    expect(await db.sessions.count()).toBe(1);
    expect(replacement).toMatchObject({
      templateId: 'B',
      experience: 'some',
      plan: [{ ...plan, target: 9 }],
    });
    const actualStart = '2026-10-21T00:15:00.000Z';
    await recordTrainingCheckin(db, replacement.id, 'before', {
      ...before,
      recordedAt: actualStart,
    });
    expect((await db.sessions.get(replacement.id))?.startedAt).toBe(
      actualStart,
    );
    expect((await db.sessions.get(replacement.id))?.date).toBe('2026-10-21');
  });
  it.each(['answers', 'sets', 'pain', 'feedback', 'legacy', 'note'] as const)(
    'keeps %s when changing preferences is requested',
    async (kind) => {
      const prepared = await startTrainingSession(
        db,
        preferences,
        'A',
        [plan],
        now,
      );
      if (kind === 'answers')
        await recordTrainingCheckin(db, prepared.id, 'before', before);
      if (kind === 'sets')
        await db.setLogs.put({
          id: 'set',
          sessionId: prepared.id,
          exerciseId: plan.exerciseId,
          setNumber: 1,
          side: 'left',
          amount: 8,
          loadIndex: 1,
          weightKg: 7.5,
          loggedAt: now.toISOString(),
        });
      if (kind === 'pain')
        await db.painLogs.put({
          id: 'pain',
          sessionId: prepared.id,
          date: prepared.date,
          timing: 'before',
          score: 2,
          location: 'right_knee',
          redFlags: { sharp: false, swelling: false, locking: false },
          createdAt: now.toISOString(),
        });
      if (kind === 'feedback')
        await db.sessions.update(prepared.id, {
          feedback: { [plan.exerciseId]: { skipped: true } },
        });
      if (kind === 'legacy')
        await db.sessions.update(prepared.id, { programId: undefined });
      if (kind === 'note')
        await db.sessions.update(prepared.id, { note: 'Min anteckning' });
      const snapshot = await db.sessions.get(prepared.id);
      await expect(
        saveTrainingPreferences(db, { ...preferences, programId: 'running' }),
      ).rejects.toThrow(/pågående/);
      expect(await db.sessions.get(prepared.id)).toEqual(snapshot);
    },
  );

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

  it('round-trips an owned-weight inventory, accepts old backups without one and rejects damaged weights', async () => {
    const owned = [
      { type: 'dumbbell' as const, kg: 5, count: 2 as const },
      { type: 'dumbbell' as const, kg: 10, count: 2 as const },
      { type: 'kettlebell' as const, kg: 16, count: 1 as const },
    ];
    await saveTrainingPreferences(db, { ...preferences, weights: owned });
    const backup = await exportAll(db, now);
    await importAll(db, serializeBackup(backup));
    expect(await exportAll(db, now)).toEqual(backup);
    expect((await db.meta.get('training'))?.value).toMatchObject({
      weights: owned,
    });

    const withoutWeights = JSON.parse(serializeBackup(backup));
    for (const row of withoutWeights.meta)
      if (row.key === 'training') row.value.weights = undefined;
    expect(() => parseBackup(JSON.stringify(withoutWeights))).not.toThrow();

    for (const damaged of [
      [{ type: 'dumbbell', kg: -5, count: 2 }],
      [{ type: 'dumbbell', kg: 5, count: 3 }],
      [
        { type: 'dumbbell', kg: 5, count: 2 },
        { type: 'dumbbell', kg: 5, count: 1 },
      ],
    ]) {
      const bad = JSON.parse(serializeBackup(backup));
      for (const row of bad.meta)
        if (row.key === 'training') row.value.weights = damaged;
      expect(() => parseBackup(JSON.stringify(bad))).toThrow();
    }
    await expect(
      saveTrainingPreferences(db, {
        ...preferences,
        weights: [{ type: 'dumbbell', kg: 0, count: 1 }],
      }),
    ).rejects.toThrow();
  });

  it('requires the before question before logging and finishing and keeps an unanswered symptom unknown', async () => {
    const session = await startTrainingSession(
      db,
      { ...preferences, programId: 'rehab', rehabFocus: 'custom' },
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
    await recordTrainingCheckin(db, active.id, 'before', before);
    const started = await db.sessions.get(active.id);
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
    expect(resumed).toEqual(started);
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

  it('completes a deferred after answer once, keeps the completion time and allows a late answer', async () => {
    const session = await startTrainingSession(
      db,
      preferences,
      'A',
      [plan],
      now,
    );
    const finished = new Date('2026-10-20T08:20:00.000Z');
    await deferAfterCheckin(db, session.id, finished);
    await deferAfterCheckin(
      db,
      session.id,
      new Date('2026-10-21T08:00:00.000Z'),
    );
    expect(await db.sessions.get(session.id)).toMatchObject({
      status: 'completed',
      finishedAt: finished.toISOString(),
    });
    expect(
      (await db.sessions.get(session.id))?.checkins?.after,
    ).toBeUndefined();
    await recordTrainingCheckin(db, session.id, 'after', after);
    expect(await db.sessions.get(session.id)).toMatchObject({
      status: 'completed',
      finishedAt: finished.toISOString(),
      checkins: { after },
    });
    await expect(
      recordTrainingCheckin(db, session.id, 'after', after),
    ).rejects.toThrow(/redan/);
    await deferAfterCheckin(db, session.id, new Date());
    expect((await db.sessions.get(session.id))?.finishedAt).toBe(
      finished.toISOString(),
    );
  });

  it('never defers an aborted or legacy session', async () => {
    const session = await startTrainingSession(
      db,
      preferences,
      'A',
      [plan],
      now,
    );
    await db.sessions.update(session.id, { status: 'aborted' });
    await deferAfterCheckin(db, session.id, new Date());
    expect((await db.sessions.get(session.id))?.status).toBe('aborted');
    await expect(
      recordTrainingCheckin(db, session.id, 'after', after),
    ).rejects.toThrow();
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

describe('saved knee rehabilitation programmes', () => {
  const knee: TrainingPreferences = {
    programId: 'rehab',
    experience: 'new',
    equipment: ['bodyweight'],
    rehabFocus: 'knee',
    rehabSide: 'left',
  };
  const kneePlan: PlannedExercise = {
    exerciseId: 'straight-leg-raise',
    sets: 2,
    target: 3,
    loadIndex: 0,
    weightKg: 0,
    restSec: 30,
    variantId: 'bodyweight',
    sides: ['left'],
    reason: 'first_time',
  };
  it('saves a reusable plan without a session, round-trips backup and snapshots the focus', async () => {
    await saveTrainingPreferences(db, knee);
    await saveRehabPlan(db, 'knee', [kneePlan]);
    expect(await db.sessions.count()).toBe(0);
    expect((await db.meta.get('rehabPlans'))?.value).toEqual({
      knee: [kneePlan],
    });
    const session = await startTrainingSession(db, knee, 'A', [kneePlan], now);
    expect(session.rehabFocus).toBe('knee');
    const backup = parseBackup(serializeBackup(await exportAll(db, now)));
    await importAll(db, serializeBackup(backup), { now });
    expect((await db.meta.get('training'))?.value).toEqual(knee);
    expect((await db.meta.get('rehabPlans'))?.value).toEqual({
      knee: [kneePlan],
    });
    expect((await db.sessions.get(session.id))?.rehabFocus).toBe('knee');
    await recordTrainingCheckin(db, session.id, 'before', before);
    await expect(saveRehabPlan(db, 'knee', [kneePlan])).rejects.toThrow(
      /pågående/,
    );
  });
  it('rejects incomplete dose, wrong collection and unavailable equipment', async () => {
    await saveTrainingPreferences(db, knee);
    await expect(
      saveRehabPlan(db, 'knee', [{ ...kneePlan, target: 0 }]),
    ).rejects.toThrow();
    await expect(saveRehabPlan(db, 'knee', [plan])).rejects.toThrow();
    await expect(
      startTrainingSession(db, knee, 'A', [plan], now),
    ).rejects.toThrow();
    await saveTrainingPreferences(db, { ...knee, rehabFocus: 'custom' });
    await expect(saveRehabPlan(db, 'custom', [plan])).rejects.toThrow(
      /utrustning/,
    );
    expect(await db.meta.get('rehabPlans')).toBeUndefined();
  });
  it('keeps custom and knee plans independent and rejects damaged saved backup plans', async () => {
    await saveTrainingPreferences(db, knee);
    await saveRehabPlan(db, 'knee', [kneePlan]);
    await saveTrainingPreferences(db, { ...knee, rehabFocus: 'custom' });
    await saveRehabPlan(db, 'custom', [{ ...kneePlan, target: 5 }]);
    expect((await db.meta.get('rehabPlans'))?.value).toEqual({
      knee: [kneePlan],
      custom: [{ ...kneePlan, target: 5 }],
    });
    const backup = await exportAll(db, now);
    const stored = backup.meta.find((m) => m.key === 'rehabPlans');
    if (!stored) throw new Error('Missing saved plan');
    stored.value = { knee: [{ ...kneePlan, sets: 0 }] };
    expect(() => parseBackup(serializeBackup(backup))).toThrow();
  });
});

describe('physio knee rehabilitation group', () => {
  const physio: TrainingPreferences = {
    programId: 'rehab',
    experience: 'new',
    equipment: ['bodyweight'],
    rehabFocus: 'knee-physio',
    rehabSide: 'both',
  };
  const item: PlannedExercise = {
    exerciseId: 'glute-bridge',
    sets: 2,
    target: 10,
    loadIndex: 0,
    weightKg: 0,
    restSec: 60,
    variantId: 'bodyweight',
    sides: ['both'],
    reason: 'first_time',
  };
  it('saves, starts and round-trips a plan without limiting it to the AAOS collection', async () => {
    await saveTrainingPreferences(db, physio);
    await saveRehabPlan(db, 'knee-physio', [item]);
    expect((await db.meta.get('rehabPlans'))?.value).toEqual({
      'knee-physio': [item],
    });
    const session = await startTrainingSession(db, physio, 'A', [item], now);
    expect(session.rehabFocus).toBe('knee-physio');
    await importAll(db, serializeBackup(await exportAll(db, now)), { now });
    expect((await db.sessions.get(session.id))?.rehabFocus).toBe('knee-physio');
    expect((await db.meta.get('training'))?.value).toEqual(physio);
  });
  it('rejects a plan saved under a different focus and unknown focus values in backups', async () => {
    await saveTrainingPreferences(db, physio);
    await expect(saveRehabPlan(db, 'custom', [item])).rejects.toThrow();
    await expect(saveRehabPlan(db, 'knee', [item])).rejects.toThrow();
    await saveRehabPlan(db, 'knee-physio', [item]);
    const backup = await exportAll(db, now);
    const training = backup.meta.find((m) => m.key === 'training');
    if (!training) throw new Error('Missing training');
    (training.value as { rehabFocus: string }).rehabFocus = 'knee-other';
    expect(() => parseBackup(serializeBackup(backup))).toThrow();
  });
});

describe('idle sessions', () => {
  it('ends a stale session with its sets when a new workout starts', async () => {
    const stale = await startTrainingSession(db, preferences, 'A', [plan], now);
    await logSet(db, stale.id, input, new Date(now.getTime() + 60_000));
    const later = new Date(now.getTime() + 3 * 3_600_000);
    const next = await startTrainingSession(
      db,
      preferences,
      'B',
      [plan],
      later,
    );
    expect(next.id).not.toBe(stale.id);
    expect(await db.sessions.get(stale.id)).toMatchObject({
      status: 'aborted',
      abortReason: 'timeout',
    });
    expect(await db.setLogs.count()).toBe(1);
  });
});
