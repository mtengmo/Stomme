import { exerciseMetadata } from '../content/exerciseMetadata';
import { exercises } from '../content/exercises';
import type { ExerciseId, SetLog } from '../domain/types';
import { easeInOut } from '../figures/lerp';

/** Counted by hand: the pace is the user's. */
const MANUAL_REPS: readonly ExerciseId[] = [
  'mountain-climber',
  // Each alternating arm lift counts once; the demo cycle shows both arms.
  'plank-arm-lift',
  // One forward landing is one rep; the demo cycle shows two alternating steps.
  'walking-lunge',
  // Often taken to failure, so a fixed beat would be wrong.
  'pull-up',
  'chin-up',
  'parallel-dip',
];

/** Ballistic and plyometric work gets one suggested beat per rep, no holds. */
const FIXED_REP_MS: Partial<Record<ExerciseId, number>> = {
  'squat-jump': 3_000,
  'jumping-lunge': 3_000,
  'kettlebell-swing': 2_000,
  burpee: 6_000,
};
/** Figures whose animation is one whole repetition per cycle, not up and down. */
const SEQUENCE_FIGURES: readonly ExerciseId[] = ['squat-jump', 'burpee'];

export type RepPhase = 'up' | 'hold' | 'down' | 'relax';

export interface RepTempo {
  upMs: number;
  holdMs: number;
  downMs: number;
  relaxMs: number;
  /** One whole repetition. */
  repMs: number;
  /** True when the repetition has a hold the voice should call out. */
  hasHold: boolean;
  /** The figure plays one whole rep per cycle, so progress is linear. */
  sequence: boolean;
}

/** Tempo for rep-based exercises that count automatically; null means count by hand. */
export function repTempo(id: ExerciseId): RepTempo | null {
  const exercise = exercises[id];
  if (exercise.unit !== 'reps' || MANUAL_REPS.includes(id)) return null;
  const fixed = FIXED_REP_MS[id];
  if (fixed !== undefined)
    return {
      upMs: fixed / 2,
      holdMs: 0,
      downMs: fixed / 2,
      relaxMs: 0,
      repMs: fixed,
      hasHold: false,
      sequence: SEQUENCE_FIGURES.includes(id),
    };
  const { relaxSeconds } = exerciseMetadata[id];
  // The physio catalogue prescribes no hold; the beat still pauses 3 s at the top.
  const holdSeconds = id === 'quad-set' ? 3 : exerciseMetadata[id].holdSeconds;
  const hasHold = holdSeconds !== undefined;
  const upMs = hasHold ? 1_500 : 2_000;
  const holdMs = (holdSeconds ?? 0) * 1_000;
  const downMs = upMs;
  const relaxMs = hasHold ? (relaxSeconds ?? 1) * 1_000 : 0;
  return {
    upMs,
    holdMs,
    downMs,
    relaxMs,
    repMs: upMs + holdMs + downMs + relaxMs,
    hasHold,
    sequence: false,
  };
}

/** Pace steps for the quicker/slower buttons; a bigger factor is a slower beat. */
export const PACE_FACTORS = [0.7, 0.85, 1, 1.25, 1.5, 1.8] as const;
export const DEFAULT_PACE = 2;

/** Scales the movement and relax phases; prescribed holds keep their length. */
export function scaleTempo(tempo: RepTempo, factor: number): RepTempo {
  if (factor === 1) return tempo;
  const upMs = Math.round(tempo.upMs * factor);
  const downMs = Math.round(tempo.downMs * factor);
  const relaxMs = Math.round(tempo.relaxMs * factor);
  return {
    ...tempo,
    upMs,
    downMs,
    relaxMs,
    repMs: upMs + tempo.holdMs + downMs + relaxMs,
  };
}

export interface RepPosition {
  /** Repetitions finished: counted when the movement is back at the start. */
  completed: number;
  phase: RepPhase;
}

/** Where the set is after `elapsedMs` of active (unpaused) time. */
export function repPosition(tempo: RepTempo, elapsedMs: number): RepPosition {
  const time = Math.max(0, elapsedMs);
  // A rep counts when the downward movement ends, before the relax pause.
  const completed = Math.floor((time + tempo.relaxMs) / tempo.repMs);
  const within = time % tempo.repMs;
  const phase: RepPhase =
    within < tempo.upMs
      ? 'up'
      : within < tempo.upMs + tempo.holdMs
        ? 'hold'
        : within < tempo.upMs + tempo.holdMs + tempo.downMs
          ? 'down'
          : 'relax';
  return { completed, phase };
}

/** Movement 0 (start) to 1 (top of the rep) at `elapsedMs`; matches repPosition. */
export function repProgress(tempo: RepTempo, elapsedMs: number): number {
  const within = Math.max(0, elapsedMs) % tempo.repMs;
  if (tempo.sequence) return within / tempo.repMs;
  if (within < tempo.upMs) return easeInOut(within / tempo.upMs);
  if (within < tempo.upMs + tempo.holdMs) return 1;
  const down = within - tempo.upMs - tempo.holdMs;
  if (down < tempo.downMs) return 1 - easeInOut(down / tempo.downMs);
  return 0;
}

/** Whole-second length of one repetition for the one-line tempo hint. */
export function repSeconds(tempo: RepTempo): number {
  return Math.round(tempo.repMs / 1_000);
}

/**
 * Amount to prefill the next set with. What the user logged carries over,
 * except after an auto-counted early stop: that count says nothing about the
 * plan, so the plan target returns.
 */
export function prefillAmount(
  prior: Pick<SetLog, 'amount' | 'counting' | 'endedEarly'> | undefined,
  target: number,
): number {
  return prior?.counting === 'auto' && prior.endedEarly
    ? target
    : (prior?.amount ?? target);
}
