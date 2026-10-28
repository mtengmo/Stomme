import { describe, expect, it } from 'vitest';
import type { Session, TrainingPreferences } from '../../domain/types';
import { worstPainSince } from '../../rules/pain';
import { trainingDayAfterDue } from '../../rules/training';
import { defaultPlan } from '../training/defaultPlan';

const session = (abortReason: Session['abortReason']): Session => ({
  id: 's',
  templateId: 'A',
  programId: 'general',
  date: '2026-10-12',
  startedAt: '2026-10-12T08:00:00.000Z',
  finishedAt: '2026-10-12T08:20:00.000Z',
  status: 'aborted',
  abortReason,
  programWeek: 1,
  plan: [],
  feedback: {},
  checkins: {},
});

const prefs: TrainingPreferences = {
  programId: 'general',
  experience: 'regular',
  equipment: ['bodyweight', 'chair', 'support'],
};

describe('a timeout is not a pain stop', () => {
  it('does not put symptoms on record, so impact exercises stay in the plan', () => {
    const ids = (s: Session[]) =>
      defaultPlan(prefs, 'A', s, []).map((p) => p.exerciseId);
    expect(ids([session('pain_stop')])).not.toContain('squat-jump');
    expect(ids([session('timeout')])).toContain('squat-jump');
  });

  it('holds no progression: the worst pain status stays ok', () => {
    expect(worstPainSince([session('pain_stop')], [], '2026-10-01')).toBe(
      'stop',
    );
    expect(worstPainSince([session('timeout')], [], '2026-10-01')).toBe('ok');
  });

  it('asks for no day-after answer', () => {
    expect(trainingDayAfterDue(session('timeout'), '2026-10-13')).toBe(false);
  });
});
