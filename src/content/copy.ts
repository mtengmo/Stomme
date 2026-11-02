import type { Effort, Exercise, PlannedExercise, Unit } from '../domain/types';
import { exerciseSideCue } from './exerciseSideCues';

export const UNIT_WORD: Record<Unit, string> = {
  reps: 'reps',
  seconds: 'sek',
  meters: 'm',
  laps: 'varv',
};

export const AMOUNT_LABEL: Record<Unit, string> = {
  reps: 'Antal',
  seconds: 'Sekunder',
  meters: 'Meter',
  laps: 'Varv',
};

export const EFFORT_LABEL: Record<Effort, string> = {
  easy: 'Lätt',
  ok: 'Lagom',
  hard: 'Tungt',
};

const SIDE_NOUN = { ben: 'ben', sida: 'sida', hand: 'hand' } as const;

/** "Höger ben", "Vänster sida", "Höger hand"; empty for two-sided exercises. */
export function sideLabel(
  ex: Pick<Exercise, 'perSide' | 'sideKind'> & Partial<Pick<Exercise, 'id'>>,
  side: 'right' | 'left' | 'both',
): string {
  if (!ex.perSide || side === 'both') return '';
  const cue = ex.id ? exerciseSideCue(ex.id, side) : undefined;
  if (cue) return cue.label.charAt(0).toUpperCase() + cue.label.slice(1);
  const noun = SIDE_NOUN[ex.sideKind ?? 'ben'];
  return `${side === 'right' ? 'Höger' : 'Vänster'} ${noun}`;
}

/** Short marker for the figure slot: H for right, V for left. */
export function sideLetter(side: 'right' | 'left' | 'both'): string {
  return side === 'right' ? 'H' : side === 'left' ? 'V' : '';
}

/* ---------- Pain ---------- */

/** Shown when an idle session was ended automatically. */
export const TIMEOUT_NOTICE =
  'Passet avslutades automatiskt eftersom inget loggats på 90 minuter. Det du hann logga är sparat.';

/** Stop and abort texts. Rehab asks the physiotherapist; regular training points to care (1177). */
export const PAIN_COPY = {
  stopTitle: 'Avbryt passet.',
  stopAbortPain: 'Avbryt – det gör ont',
  stopAbortPainHint: 'Vid skarp smärta, svullnad eller om en led låser sig.',
  stopBody: 'Fråga fysioterapeuten.',
  stopBodyRegular:
    'Vila och ta det lugnt. Vid skarp smärta, svullnad eller om en led låser sig: kontakta vården (1177).',
  stopDone: 'Till träningen',
  error: 'Något gick fel. Försök igen.',
} as const;

/** "2 × 10 reps · Kroppsvikt". */
export function prescriptionText(p: PlannedExercise, ex: Exercise): string {
  const load = ex.loadLadder[p.loadIndex];
  const loadText = !load ? '' : load.kg === 0 ? load.label : `${load.kg} kg`;
  return [`${p.sets} × ${p.target} ${UNIT_WORD[ex.unit]}`, loadText]
    .filter(Boolean)
    .join(' · ');
}
