import { describe, expect, it } from 'vitest';
import type {
  ExerciseId,
  PainLog,
  PlannedExercise,
  ProgramId,
  Session,
  SetLog,
} from '../domain/types';
import {
  buildPhysioReport,
  type ReportProgramme,
  reportProgrammeLabels,
} from './physioReport';

const planned = (exerciseId: ExerciseId = 'dead-bug'): PlannedExercise => ({
  exerciseId,
  sets: 2,
  target: 8,
  loadIndex: 0,
  weightKg: 0,
  restSec: 60,
  reason: 'first_time',
  sides: exerciseId === 'dead-bug' ? ['right', 'left'] : ['both'],
  variantId: 'bodyweight',
});

function session(
  id: string,
  date = '2026-10-20',
  programId?: ProgramId,
  patch: Partial<Session> = {},
): Session {
  return {
    id,
    templateId: 'A',
    ...(programId ? { programId } : {}),
    date,
    startedAt: `${date}T08:00:00.000Z`,
    status: 'completed',
    programWeek: 1,
    plan: [planned()],
    feedback: {},
    ...patch,
  };
}

function log(
  id: string,
  sessionId: string,
  exerciseId: ExerciseId = 'dead-bug',
  patch: Partial<SetLog> = {},
): SetLog {
  return {
    id,
    sessionId,
    exerciseId,
    setNumber: 1,
    side: 'right',
    amount: 7,
    loadIndex: 0,
    weightKg: 0,
    loggedAt: '2026-10-20T08:10:00.000Z',
    ...patch,
  };
}

function pain(
  id: string,
  sessionId: string,
  patch: Partial<PainLog> = {},
): PainLog {
  return {
    id,
    sessionId,
    date: '2026-10-20',
    timing: 'before',
    score: 0,
    location: 'right_knee',
    redFlags: { sharp: false, swelling: false, locking: false },
    createdAt: '2026-10-20T08:00:00.000Z',
    ...patch,
  };
}

const selection = {
  from: '2026-10-20',
  to: '2026-10-22',
  programme: 'all' as const,
};

describe('physiotherapist report data', () => {
  it.each([
    { ...selection, from: '2026-02-30' },
    { ...selection, to: 'bad' },
    { ...selection, from: '2026-10-23' },
  ])(
    'returns invalid without rendering records for bad date selection %#',
    (chosen) => {
      expect(buildPhysioReport([session('a')], [], [], chosen)).toEqual({
        selection: chosen,
        valid: false,
        sessions: [],
      });
    },
  );

  it('filters inclusive dates and each programme without changing input order', () => {
    const data = [
      session('before', '2026-10-19', 'general'),
      session('general', '2026-10-20', 'general'),
      session('running', '2026-10-21', 'running'),
      session('knee', '2026-10-22', 'rehab', { rehabFocus: 'knee' }),
      session('physio', '2026-10-22', 'rehab', { rehabFocus: 'knee-physio' }),
      session('custom', '2026-10-22', 'rehab', { rehabFocus: 'custom' }),
      session('old-custom', '2026-10-22', 'rehab'),
      session('legacy', '2026-10-22'),
      session('after', '2026-10-23', 'general'),
    ];
    const before = structuredClone(data);
    const ids = (programme: ReportProgramme) =>
      buildPhysioReport(data, [], [], { ...selection, programme }).sessions.map(
        (row) => row.session.id,
      );
    expect(ids('all')).toEqual([
      'custom',
      'knee',
      'legacy',
      'old-custom',
      'physio',
      'running',
      'general',
    ]);
    expect(ids('general')).toEqual(['general']);
    expect(ids('running')).toEqual(['running']);
    expect(ids('knee')).toEqual(['knee']);
    expect(ids('knee-physio')).toEqual(['physio']);
    expect(ids('rehab')).toEqual(['custom', 'old-custom']);
    expect(ids('legacy')).toEqual(['legacy']);
    expect(reportProgrammeLabels.rehab).toMatch(/rehabprogram/);
    expect(data).toEqual(before);
  });

  it('sorts sessions by date, then start time, then stable id', () => {
    const data = [
      session('b'),
      session('a'),
      session('newer', '2026-10-20', 'general', {
        startedAt: '2026-10-20T09:00:00.000Z',
      }),
      session('tomorrow', '2026-10-21'),
    ];
    expect(
      buildPhysioReport(data, [], [], selection).sessions.map(
        (row) => row.session.id,
      ),
    ).toEqual(['tomorrow', 'newer', 'a', 'b']);
  });

  it('shows the actual short plan and ordered raw doses, with early endings and unanswered checks intact', () => {
    const short = session('short', '2026-10-20', 'general', {
      workoutMode: 'short',
      plan: [planned('dead-bug')],
      fullPlan: [planned('dead-bug'), planned('push-up')],
      equipmentOverride: { equipment: ['bodyweight'], weights: [] },
      checkins: {
        before: {
          recordedAt: '2026-10-20T07:55:00.000Z',
          feeling: 'ready',
          symptoms: null,
        },
      },
      feedback: {
        'dead-bug': {
          effort: 'hard',
          symptoms: { area: 'Knä', side: 'right', score: 2 },
        },
      },
    });
    const raw = [
      log('set-2', 'short', 'dead-bug', {
        setNumber: 2,
        side: 'right',
        amount: 3,
        endedEarly: true,
        counting: 'auto',
        loggedAt: '2026-10-20T08:13:00.000Z',
      }),
      log('set-1-left', 'short', 'dead-bug', {
        side: 'left',
        amount: 6,
        loggedAt: '2026-10-20T08:11:00.000Z',
      }),
      log('set-1-right', 'short', 'dead-bug', {
        side: 'right',
        amount: 8,
        loggedAt: '2026-10-20T08:10:00.000Z',
      }),
      log('dangling', 'other', 'push-up'),
    ];
    const result = buildPhysioReport([short], raw, [], selection);
    expect(result.valid).toBe(true);
    expect(result.sessions[0]?.session.fullPlan).toHaveLength(2);
    expect(result.sessions[0]?.exercises.map((row) => row.exerciseId)).toEqual([
      'dead-bug',
    ]);
    expect(result.sessions[0]?.exercises[0]?.planned?.target).toBe(8);
    expect(result.sessions[0]?.exercises[0]?.logs.map((row) => row.id)).toEqual(
      ['set-1-left', 'set-1-right', 'set-2'],
    );
    expect(result.sessions[0]?.exercises[0]?.logs[2]).toMatchObject({
      amount: 3,
      endedEarly: true,
      counting: 'auto',
    });
    expect(result.sessions[0]?.session.checkins?.after).toBeUndefined();
    expect(result.sessions[0]?.exercises[0]?.feedback?.symptoms?.score).toBe(2);
  });

  it('keeps skipped and aborted plans even without logs, and adds legacy logged-only exercises', () => {
    const aborted = session('aborted', '2026-10-20', 'rehab', {
      status: 'aborted',
      abortReason: 'user',
      plan: [planned('push-up'), planned('dead-bug')],
      feedback: { 'push-up': { skipped: true } },
    });
    const legacy = session('legacy', '2026-10-21', undefined, { plan: [] });
    const logs = [
      log('legacy-later', 'legacy', 'plank', {
        loggedAt: '2026-10-21T08:12:00.000Z',
      }),
      log('legacy-first', 'legacy', 'push-up', {
        loggedAt: '2026-10-21T08:10:00.000Z',
      }),
      log('legacy-tie', 'legacy', 'crunch', {
        loggedAt: '2026-10-21T08:10:00.000Z',
      }),
      log('legacy-old', 'legacy', 'plank', {
        loggedAt: '2026-10-21T08:09:00.000Z',
      }),
      log('aborted-actual', 'aborted', 'dead-bug', { amount: 4 }),
    ];
    const result = buildPhysioReport([aborted, legacy], logs, [], selection);
    expect(result.sessions[0]?.exercises.map((row) => row.exerciseId)).toEqual([
      'plank',
      'crunch',
      'push-up',
    ]);
    expect(
      result.sessions[0]?.exercises.every((row) => row.planned === null),
    ).toBe(true);
    expect(result.sessions[1]?.session.status).toBe('aborted');
    expect(result.sessions[1]?.exercises.map((row) => row.exerciseId)).toEqual([
      'push-up',
      'dead-bug',
    ]);
    expect(result.sessions[1]?.exercises[0]?.logs).toEqual([]);
    expect(result.sessions[1]?.exercises[0]?.feedback?.skipped).toBe(true);
    expect(result.sessions[1]?.exercises[1]?.logs[0]?.amount).toBe(4);
  });

  it('keeps explicit zero pain and red flags separate from optional check-ins', () => {
    const legacy = session('legacy');
    const readings = [
      pain('after-b', 'legacy', {
        timing: 'after',
        createdAt: '2026-10-20T09:00:00.000Z',
      }),
      pain('before', 'legacy', {
        score: 0,
        redFlags: { sharp: true, swelling: false, locking: false },
      }),
      pain('after-a', 'legacy', {
        timing: 'after',
        createdAt: '2026-10-20T09:00:00.000Z',
      }),
      pain('other', 'other'),
    ];
    const result = buildPhysioReport([legacy], [], readings, selection);
    expect(result.sessions[0]?.painLogs.map((row) => row.id)).toEqual([
      'before',
      'after-a',
      'after-b',
    ]);
    expect(result.sessions[0]?.painLogs[0]).toMatchObject({
      score: 0,
      redFlags: { sharp: true },
    });
    expect(result.sessions[0]?.session.checkins).toBeUndefined();
  });

  it('orders same set logs by side, time and id without changing raw input', () => {
    const s = session('s');
    const raw = [
      log('z', 's', 'dead-bug', {
        side: 'right',
        loggedAt: '2026-10-20T08:10:00.000Z',
      }),
      log('b', 's', 'dead-bug', {
        side: 'left',
        loggedAt: '2026-10-20T08:11:00.000Z',
      }),
      log('a', 's', 'dead-bug', {
        side: 'left',
        loggedAt: '2026-10-20T08:11:00.000Z',
      }),
      log('old', 's', 'dead-bug', {
        side: 'left',
        loggedAt: '2026-10-20T08:09:00.000Z',
      }),
    ];
    const before = structuredClone(raw);
    expect(
      buildPhysioReport(
        [s],
        raw,
        [],
        selection,
      ).sessions[0]?.exercises[0]?.logs.map((row) => row.id),
    ).toEqual(['old', 'a', 'b', 'z']);
    expect(raw).toEqual(before);
  });
});
