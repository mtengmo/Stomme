import type {
  ExerciseFeedback,
  ExerciseId,
  PlannedExercise,
  SetLog,
} from '../domain/types';

export type SetSide = 'right' | 'left' | 'both';

export type SetStep = {
  kind: 'set';
  exerciseId: ExerciseId;
  planIndex: number;
  setNumber: number;
  side: SetSide;
};

export type Step =
  | SetStep
  | { kind: 'rest'; exerciseId: ExerciseId; planIndex: number; restSec: number }
  | { kind: 'effort'; exerciseId: ExerciseId; planIndex: number };

export type Catalog = (id: ExerciseId) => { perSide: boolean };
export type FeedbackMap = Partial<Record<ExerciseId, ExerciseFeedback>>;
type LogKey = Pick<SetLog, 'exerciseId' | 'setNumber' | 'side'>;

/**
 * Flattens a plan into the ordered steps of a session.
 * Per-side exercises do right then left for every set, with no rest between the
 * sides. A rest follows each set except the last one of an exercise; the effort
 * step comes after the last set, and the rest before the next exercise after
 * that. Nothing follows the last exercise's effort step.
 */
export function buildSteps(
  plan: readonly PlannedExercise[],
  catalog: Catalog,
): Step[] {
  const steps: Step[] = [];
  plan.forEach((p, planIndex) => {
    const sides: SetSide[] =
      p.sides ?? (catalog(p.exerciseId).perSide ? ['right', 'left'] : ['both']);
    for (let setNumber = 1; setNumber <= p.sets; setNumber++) {
      for (const side of sides) {
        steps.push({
          kind: 'set',
          exerciseId: p.exerciseId,
          planIndex,
          setNumber,
          side,
        });
      }
      if (setNumber < p.sets) {
        steps.push({
          kind: 'rest',
          exerciseId: p.exerciseId,
          planIndex,
          restSec: p.restSec,
        });
      }
    }
    steps.push({ kind: 'effort', exerciseId: p.exerciseId, planIndex });
    if (planIndex < plan.length - 1) {
      steps.push({
        kind: 'rest',
        exerciseId: p.exerciseId,
        planIndex,
        restSec: p.restSec,
      });
    }
  });
  return steps;
}

function isSkipped(step: Step, feedback: FeedbackMap): boolean {
  return feedback[step.exerciseId]?.skipped === true;
}

function isDone(
  step: Step,
  logs: readonly LogKey[],
  feedback: FeedbackMap,
): boolean {
  if (isSkipped(step, feedback)) return true;
  if (step.kind === 'set') {
    return logs.some(
      (l) =>
        l.exerciseId === step.exerciseId &&
        l.setNumber === step.setNumber &&
        l.side === step.side,
    );
  }
  if (step.kind === 'effort') {
    return (
      feedback[step.exerciseId]?.effort !== undefined ||
      feedback[step.exerciseId]?.effortSkipped === true
    );
  }
  return true; // rests are not persisted, so they never block a resume
}

/**
 * Where a session continues after a reload: the first set or effort step that
 * is not logged yet. Returns steps.length when everything is done. Rests are
 * not persisted, so a resume lands on the step after the rest.
 */
export function resumeIndex(
  steps: readonly Step[],
  logs: readonly LogKey[],
  feedback: FeedbackMap,
): number {
  const i = steps.findIndex((s) => !isDone(s, logs, feedback));
  return i === -1 ? steps.length : i;
}

/**
 * The step to show after `from`: skips steps of skipped exercises and rests
 * that would end the session. Returns steps.length at the end.
 */
export function nextIndex(
  steps: readonly Step[],
  from: number,
  feedback: FeedbackMap,
): number {
  for (let i = from + 1; i < steps.length; i++) {
    const s = steps[i];
    if (!s || isSkipped(s, feedback)) continue;
    if (s.kind !== 'rest') return i;
    for (let j = i + 1; j < steps.length; j++) {
      const t = steps[j];
      if (t && t.kind !== 'rest' && !isSkipped(t, feedback)) return i;
    }
    return steps.length;
  }
  return steps.length;
}

/** The first set step at or after `from` that is not skipped, for "Nästa". */
export function nextSetStep(
  steps: readonly Step[],
  from: number,
  feedback: FeedbackMap,
): SetStep | undefined {
  for (let i = from; i < steps.length; i++) {
    const s = steps[i];
    if (s && s.kind === 'set' && !isSkipped(s, feedback)) return s;
  }
  return undefined;
}

/** Index of the first step of an exercise. */
export function firstStepOf(steps: readonly Step[], planIndex: number): number {
  return steps.findIndex((s) => s.planIndex === planIndex);
}
