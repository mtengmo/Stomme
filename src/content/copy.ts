import type {
  Effort,
  Exercise,
  PlannedExercise,
  ReasonCode,
  Unit,
} from '../domain/types';

export const UNIT_WORD: Record<Unit, string> = {
  reps: 'reps',
  seconds: 'sek',
  meters: 'm',
};

export const AMOUNT_LABEL: Record<Unit, string> = {
  reps: 'Antal',
  seconds: 'Sekunder',
  meters: 'Meter',
};

export const EFFORT_LABEL: Record<Effort, string> = {
  easy: 'Lätt',
  ok: 'Lagom',
  hard: 'Tungt',
};

const SIDE_NOUN = { ben: 'ben', sida: 'sida', hand: 'hand' } as const;

/** "Höger ben", "Vänster sida", "Höger hand"; empty for two-sided exercises. */
export function sideLabel(
  ex: Pick<Exercise, 'perSide' | 'sideKind'>,
  side: 'right' | 'left' | 'both',
): string {
  if (!ex.perSide || side === 'both') return '';
  const noun = SIDE_NOUN[ex.sideKind ?? 'ben'];
  return `${side === 'right' ? 'Höger' : 'Vänster'} ${noun}`;
}

/** Short marker for the figure slot: H for right, V for left. */
export function sideLetter(side: 'right' | 'left' | 'both'): string {
  return side === 'right' ? 'H' : side === 'left' ? 'V' : '';
}

/** Reason codes from the rules, as short Swedish lines. */
export const REASON_TEXT: Partial<Record<ReasonCode, string>> = {
  first_time: 'Första gången: börja i nedre delen av intervallet.',
  week1_bodyweight: 'Första veckan: kroppsvikt.',
  start_load: 'Startvikt från vecka 2.',
};

export function reasonText(code: ReasonCode): string {
  return REASON_TEXT[code] ?? '';
}

/** "2 × 10 reps · Kroppsvikt". */
export function prescriptionText(p: PlannedExercise, ex: Exercise): string {
  const load = ex.loadLadder[p.loadIndex];
  const loadText = !load ? '' : load.kg === 0 ? load.label : `${load.kg} kg`;
  return [`${p.sets} × ${p.target} ${UNIT_WORD[ex.unit]}`, loadText]
    .filter(Boolean)
    .join(' · ');
}
