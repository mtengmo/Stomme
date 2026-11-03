import type { ExerciseId } from '../domain/types';

/** Copy for a timed exercise that is moved through (not held) while the timer runs. */
export interface TimedMovementCue {
  /** Status line while the timer runs. */
  status: string;
  /** Spoken when the timer starts. */
  startVoice: string;
  /** Instruction under the animation. */
  hint: string;
}

const HINT =
  'Starta och gör dig redo under 5 sekunder. Rör dig i jämn takt under hela tiden och vila vid signalen. Appen sparar automatiskt. Timern pausas om du lämnar appen.';
const LEG_SWAP_HINT =
  'Starta och gör dig redo under 5 sekunder. Växla ben lugnt under hela tiden och vila vid signalen. Appen sparar automatiskt. Timern pausas om du lämnar appen.';
const SAVED = 'Setet sparas automatiskt.';

/**
 * Timed exercises that move. Every other timed exercise is a hold and keeps the
 * hold copy ("Hålltid", "Börja hålla.", "Klart. Släpp positionen.").
 */
export const timedMovementCue: Partial<Record<ExerciseId, TimedMovementCue>> = {
  'heel-slide': {
    status: `Växla ben lugnt tills signalen. Tiden gäller båda benen tillsammans. ${SAVED}`,
    startVoice: 'Börja rörelsen. Växla ben lugnt.',
    hint: LEG_SWAP_HINT,
  },
  'mountain-climber': {
    status: `Växla ben lugnt tills signalen. Tiden gäller båda benen tillsammans. ${SAVED}`,
    startVoice: 'Börja rörelsen. Växla ben lugnt.',
    hint: LEG_SWAP_HINT,
  },
  'single-leg-lateral-hop': {
    status: `Hoppa från sida till sida i jämn takt tills signalen. Tiden gäller per ben. ${SAVED}`,
    startVoice: 'Börja rörelsen.',
    hint: HINT,
  },
  'fast-feet': {
    status: `Trippa snabbt och jämnt tills signalen. Tiden gäller båda benen tillsammans. ${SAVED}`,
    startVoice: 'Börja rörelsen.',
    hint: HINT,
  },
  'in-and-out-jump': {
    status: `Hoppa in och ut i jämn takt tills signalen och landa mjukt. ${SAVED}`,
    startVoice: 'Börja rörelsen.',
    hint: HINT,
  },
  'lateral-shuffle': {
    status: `Ta snabba sidosteg fram och tillbaka tills signalen. ${SAVED}`,
    startVoice: 'Börja rörelsen.',
    hint: HINT,
  },
  'knee-drive': {
    status: `Lyft knäna växelvis i jämn takt tills signalen. Tiden gäller båda benen tillsammans. ${SAVED}`,
    startVoice: 'Börja rörelsen.',
    hint: HINT,
  },
};
