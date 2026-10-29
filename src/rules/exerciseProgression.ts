import { exerciseMetadata } from '../content/exerciseMetadata';
import { exercises } from '../content/exercises';
import type {
  ExerciseId,
  Session,
  SetLog,
  TrainingPreferences,
} from '../domain/types';
import { equipmentFits } from './equipment';
import { allowedLevels } from './levelPolicy';

/** Optional exercise changes only: never mutates a plan or progresses rehab. */
export function harderExerciseSuggestions(
  id: ExerciseId,
  preferences: TrainingPreferences,
  sessions: readonly Session[],
  logs: readonly SetLog[],
): ExerciseId[] {
  const next = exerciseMetadata[id].harderExerciseId;
  if (preferences.programId === 'rehab' || !next) return [];
  // Include aborted and skipped attempts so an older success cannot hide a setback.
  const attempts = sessions
    .filter(
      (session) =>
        session.programId === preferences.programId &&
        session.workoutMode !== 'short' &&
        !session.equipmentOverride,
    )
    .flatMap((session) =>
      session.plan
        .filter((item) => item.exerciseId === id)
        .map((plan) => ({ session, plan })),
    )
    .sort((a, b) => b.session.startedAt.localeCompare(a.session.startedAt))
    .slice(0, 2);
  if (attempts.length < 2) return [];
  const oldest = attempts[1] as { session: Session };
  const symptomsSince = sessions.some(
    (session) =>
      session.programId === preferences.programId &&
      session.startedAt >= oldest.session.startedAt &&
      (session.abortReason === 'pain_stop' ||
        Object.values(session.feedback).some(
          (feedback) => feedback?.symptoms,
        ) ||
        Object.values(session.checkins ?? {}).some((check) => check?.symptoms)),
  );
  if (symptomsSince) return [];
  const exercise = exercises[id];
  const qualifies = attempts.every(({ session, plan }) => {
    const feedback = session.feedback[id];
    const mine = logs.filter(
      (log) => log.sessionId === session.id && log.exerciseId === id,
    );
    // The linked starting exercises are bilateral; explicit plan sides still apply.
    const sides = plan.sides ?? ['both'];
    return (
      session.status === 'completed' &&
      !feedback?.skipped &&
      feedback?.effort === 'easy' &&
      session.checkins?.after?.feeling === 'good' &&
      plan.sets > 0 &&
      sides.length > 0 &&
      Array.from({ length: plan.sets }, (_, index) => index + 1).every(
        (setNumber) =>
          sides.every((side) =>
            mine.some(
              (log) =>
                log.setNumber === setNumber &&
                log.side === side &&
                log.amount >= exercise.range.max &&
                !log.endedEarly &&
                log.weightKg === 0 &&
                log.variantId === plan.variantId,
            ),
          ),
      )
    );
  });
  if (!qualifies) return [];
  const candidates: ExerciseId[] =
    id === 'push-up' ? [next, 'diamond-push-up'] : [next];
  const levels = allowedLevels(preferences.experience);
  return candidates.filter((candidate) =>
    exerciseMetadata[candidate].variants.some(
      (variant) =>
        equipmentFits(variant.equipment, preferences.equipment) &&
        levels.includes(variant.technicalLevel),
    ),
  );
}
