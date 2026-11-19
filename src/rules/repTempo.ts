import { exerciseMetadata } from '../content/exerciseMetadata';
import { exercises } from '../content/exercises';
import type { ExerciseId, SetLog } from '../domain/types';
import { easeInOut } from '../figures/lerp';

/** Counted by hand: the pace is the user's. */
const MANUAL_REPS: readonly ExerciseId[] = [
  'nordic-hamstring-curl',
  'mountain-climber',
  // Each alternating arm lift counts once; the demo cycle shows both arms.
  'plank-arm-lift',
  // One forward landing is one rep; the demo cycle shows two alternating steps.
  'walking-lunge',
  // One controlled left-right-return cycle is one rep, at the user's pace.
  'russian-twist',
  // Often taken to failure, so a fixed beat would be wrong.
  'pull-up',
  'chin-up',
  'parallel-dip',
  // Full reset and step down between jumps; no fixed pace.
  'box-jump',
];

/** Ballistic and plyometric work gets one suggested beat per rep, no holds. */
const FIXED_REP_MS: Partial<Record<ExerciseId, number>> = {
  'squat-jump': 3_000,
  'jumping-lunge': 3_000,
  'kettlebell-swing': 2_000,
  'one-arm-kettlebell-swing': 2_000,
  burpee: 6_000,
};
/**
 * Rep exercises whose first movement (progress 0 to 1) is a slower, controlled
 * lowering and whose return is quicker. Without a hold, one rep counts when
 * the return ends.
 */
const MOVEMENT_MS: Partial<
  Record<ExerciseId, { upMs: number; downMs: number }>
> = {
  // Stand, lower to the chair on 3 s (the written instruction), stand up on 2 s.
  'goblet-chair-squat': { upMs: 3_000, downMs: 2_000 },
};
/** Figures whose animation is one whole repetition per cycle, not up and down. */
const SEQUENCE_FIGURES: readonly ExerciseId[] = [
  'squat-jump',
  'burpee',
  // Stand, squat, drive and press, lower to the shoulders: one pass per rep.
  'squat-curl',
  'thruster',
  'single-arm-thruster',
  // One hop with a leg switch per rep, so the figure's cycle is two reps
  // (`cycleReps`): the switch alternates, never swaps twice inside one count.
  'jumping-lunge',
];
/** Sequence figures whose cycle is more than one counted repetition long. */
const CYCLE_REPS: Partial<Record<ExerciseId, number>> = { 'jumping-lunge': 2 };
const cycleExtra = (id: ExerciseId): { cycleReps?: number } =>
  CYCLE_REPS[id] ? { cycleReps: CYCLE_REPS[id] } : {};

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
  /** Counted reps in one figure cycle (alternating figures); 1 when left out. */
  cycleReps?: number;
  /** Spoken words for isometric work where Upp/Ner would say lift/lower. */
  cues?: Partial<Record<RepPhase, string>>;
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
      ...cycleExtra(id),
    };
  const { relaxSeconds } = exerciseMetadata[id];
  // The physio catalogue prescribes no hold; the beat still pauses 3 s at the top.
  const holdSeconds = id === 'quad-set' ? 3 : exerciseMetadata[id].holdSeconds;
  const hasHold = holdSeconds !== undefined;
  const movement = hasHold ? undefined : MOVEMENT_MS[id];
  const upMs = movement?.upMs ?? (hasHold ? 1_500 : 2_000);
  const holdMs = (holdSeconds ?? 0) * 1_000;
  const downMs = movement?.downMs ?? upMs;
  const relaxMs = hasHold ? (relaxSeconds ?? 1) * 1_000 : 0;
  return {
    upMs,
    holdMs,
    downMs,
    relaxMs,
    repMs: upMs + holdMs + downMs + relaxMs,
    hasHold,
    sequence: SEQUENCE_FIGURES.includes(id),
    ...cycleExtra(id),
    ...(CUE_WORDS[id] ? { cues: CUE_WORDS[id] } : {}),
  };
}

/**
 * Spoken words where the generic Upp/Ner would say the wrong thing: a quad set
 * is a muscle contraction (tense, hold, release), the band leg press moves out
 * and back as the written instruction says, the half squat sinks first and
 * then rises.
 */
const CUE_WORDS: Partial<
  Record<ExerciseId, Partial<Record<RepPhase, string>>>
> = {
  'quad-set': { up: 'Spänn', hold: 'Håll', down: 'Slappna av' },
  'band-leg-press': { up: 'Ut', hold: 'Håll', down: 'Tillbaka' },
  // The figure sinks first (progress 0 to 1), holds, then rises: Ner, håll, upp.
  'half-squat': { up: 'Ner', hold: 'Håll', down: 'Upp' },
};

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
  if (tempo.sequence) {
    // An alternating figure plays its cycle over `cycleReps` counted reps.
    const cycle = tempo.cycleReps ?? 1;
    const rep = Math.floor(Math.max(0, elapsedMs) / tempo.repMs) % cycle;
    return (rep + within / tempo.repMs) / cycle;
  }
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
