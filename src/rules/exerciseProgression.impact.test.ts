import { describe, expect, it, vi } from 'vitest';
import type {
  ExerciseId,
  Session,
  SetLog,
  TrainingPreferences,
} from '../domain/types';
import { harderExerciseSuggestions } from './exerciseProgression';

// No real data reaches the impact filter any more, so mock one impact exercise
// to keep the guard covered.
vi.mock('../content/rosterSlots', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../content/rosterSlots')>()),
  impactExercises: new Set(['diamond-push-up']),
}));

const preferences: TrainingPreferences = {
  programId: 'general',
  experience: 'regular',
  equipment: ['bodyweight', 'chair', 'support'],
};
const symptom = { area: 'shoulder', side: 'right' as const, score: 2 };
function fixture(id: ExerciseId = 'push-up') {
  const sessions: Session[] = [1, 2].map((n) => ({
    id: `session-${n}`,
    programId: 'general',
    templateId: 'A',
    date: `2026-10-2${n}`,
    startedAt: `2026-10-2${n}T08:00:00Z`,
    status: 'completed',
    programWeek: 1,
    plan: [
      {
        exerciseId: id,
        sets: 2,
        target: 12,
        variantId: 'bodyweight',
        sides: ['both'],
        loadIndex: 0,
        weightKg: 0,
        restSec: 60,
        reason: 'first_time',
      },
    ],
    feedback: { [id]: { effort: 'easy' } },
    checkins: {
      after: {
        feeling: 'good',
        symptoms: null,
        recordedAt: '2026-10-22T09:00:00Z',
      },
    },
  }));
  const logs: SetLog[] = sessions.flatMap((session) =>
    [1, 2].map((setNumber) => ({
      id: `${session.id}-${setNumber}`,
      sessionId: session.id,
      exerciseId: id,
      setNumber,
      side: 'both',
      amount: 15,
      weightKg: 0,
      loadIndex: 0,
      variantId: 'bodyweight',
      loggedAt: session.startedAt,
    })),
  );
  return { sessions, logs };
}
const suggest = (
  data = fixture(),
  id: ExerciseId = 'push-up',
  prefs = preferences,
  painOnRecord = false,
) =>
  harderExerciseSuggestions(id, prefs, data.sessions, data.logs, painOnRecord);

describe('impact filter guard', () => {
  it('drops impact candidates only when global pain is recorded', () => {
    expect(suggest(fixture(), 'push-up', preferences, true)).toEqual([
      'decline-push-up',
      'blast-off-push-up',
    ]);
    expect(suggest(fixture(), 'push-up', preferences, false)).toEqual([
      'decline-push-up',
      'diamond-push-up',
      'blast-off-push-up',
    ]);
  });
});
