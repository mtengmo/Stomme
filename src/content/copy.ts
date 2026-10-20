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

/** Reason codes from the rules, as short Swedish lines (the rules never write text). */
export const REASON_TEXT: Record<ReasonCode, string> = {
  first_time: 'Första gången: startnivå.',
  week1_bodyweight: 'Första veckan: kroppsvikt.',
  start_load: 'Från vecka 2: startvikt.',
  added_set: 'Från vecka 3: ett set till.',
  increase_amount: 'Du klarade alla set. Mängden ökar lite denna gång.',
  next_load: 'Alla set på högsta mängden kändes lätta. Nästa vikt föreslås.',
  hold_incomplete:
    'Du slutförde inte alla set sist. Samma mängd och vikt föreslås.',
  hold_hard: 'Övningen kändes tung. Samma mängd och vikt föreslås.',
  hold_not_easy_at_max:
    'Högsta mängden kändes inte lätt. Samma mängd och vikt föreslås.',
  hold_waiting_for_3_sets: 'Tre set först, sedan tyngre vikt.',
  max_level: 'Du har nått högsta mängden och vikten i programmet. Behåll dem.',
  pain_hold: 'Du har rapporterat knäsmärta. Samma mängd och vikt föreslås.',
  pain_stop_hold: 'Knäet gav stopp. Fråga fysioterapeuten.',
};

export const SEE_PHYSIO = 'Fråga fysioterapeuten';

/** First programme week has a fixed plan; after a stop it is held as is. */
export const WEEK1_PAIN_HOLD = 'Första veckan: oförändrad nivå efter smärta.';

export function reasonText(code: ReasonCode): string {
  return REASON_TEXT[code];
}

/** One line for the pass preview: reason code plus the week-1 pain case. */
export function suggestionReason(
  s: { reason: ReasonCode; seePhysio: boolean },
  programWeek: number,
): string {
  if (s.seePhysio && programWeek <= 1) return WEEK1_PAIN_HOLD;
  return reasonText(s.reason);
}

/** "2×8" */
export function setsByAmount(sets: number, amount: number): string {
  return `${sets}×${amount}`;
}

/** Short load: "Kroppsvikt", "2×5 kg" or "16 kg". */
export function loadShort(
  load: { kg: number; label: string } | undefined,
): string {
  if (!load) return '';
  if (load.kg === 0) return 'Kroppsvikt';
  return /^\d+×\d+ kg$/.test(load.label) ? load.label : `${load.kg} kg`;
}

/** "2×8 · 2×5 kg" for the Förra gången / Idag lines. */
export function resultLine(
  ex: Exercise,
  sets: number,
  amount: number,
  loadIndex: number,
): string {
  return [setsByAmount(sets, amount), loadShort(ex.loadLadder[loadIndex])]
    .filter(Boolean)
    .join(' · ');
}

/* ---------- Pain ---------- */

export const PAIN_COPY = {
  title: {
    before: 'Hur känns högra knäet nu?',
    after: 'Hur känns högra knäet efter passet?',
    dayAfter: 'Hur känns högra knäet idag?',
  },
  scoreLabel: 'Smärta 0 till 10',
  anchorLow: 'Ingen',
  anchorHigh: 'Värsta',
  flagsLabel: 'Något av detta?',
  flags: {
    sharp: 'Skarp smärta',
    swelling: 'Svullnad',
    locking: 'Knät låser sig',
  },
  yes: 'Ja',
  no: 'Nej',
  save: 'Spara',
  pickFirst: 'Välj ett värde först',
  stopTitle: 'Avbryt passet.',
  stopTitleDayAfter: 'Fråga fysioterapeuten innan nästa pass.',
  stopTitleAfter: 'Passet är klart. Fråga fysioterapeuten innan nästa pass.',
  stopAbortKnee: 'Avbryt på grund av knäet',
  stopBody: 'Fråga fysioterapeuten.',
  stopDone: 'Till träningen',
  warnTitle: 'Smärtan är över 3.',
  warnTitleDayAfter: 'Knäet är värre än efter passet.',
  warnBody: 'Fråga fysioterapeuten innan du ökar något.',
  warnContinue: 'Fortsätt ändå',
  warnEnd: 'Avsluta',
  warnAfterContinue: 'Gå vidare',
  warnBackHome: 'Till träningen',
  wallSit: 'Lägg till väggsittning sist (3 × 30 s, valfri)',
  banner:
    'Senast stoppade du på grund av knäet. Fråga fysioterapeuten innan nästa pass.',
  dayAfterCardTitle: 'Hur känns knäet idag?',
  dayAfterAnswer: 'Svara',
  dayAfterWarn: 'Knäet var värre dagen efter. Fråga fysioterapeuten.',
  dayAfterWarnHigh: 'Knäet kändes av dagen efter. Fråga fysioterapeuten.',
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
