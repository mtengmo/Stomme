import type { ExerciseId } from '../domain/types';

export type ExerciseSide = 'right' | 'left' | 'both';

export interface ExerciseSideCue {
  /** Compact Swedish text for a badge or side selector. */
  label: string;
  /** Explains what the selected side means for this exercise. */
  explanation: string;
}

type CueFactory = (side: Exclude<ExerciseSide, 'both'>) => ExerciseSideCue;

const sideWord = (side: 'right' | 'left') =>
  side === 'right' ? 'höger' : 'vänster';
const sideAdjective = (side: 'right' | 'left') =>
  side === 'right' ? 'högra' : 'vänstra';
const otherWord = (side: 'right' | 'left') =>
  side === 'right' ? 'vänster' : 'höger';
const otherAdjective = (side: 'right' | 'left') =>
  side === 'right' ? 'vänstra' : 'högra';

const movingLeg: CueFactory = (side) => ({
  label: `${sideWord(side)} ben rör sig`,
  explanation: `Det valda ${sideAdjective(side)} benet rör sig; det andra benet ger stöd.`,
});

const plantedFoot: CueFactory = (side) => ({
  label: `Stå på ${sideWord(side)} ben`,
  explanation: `Stå på det ${sideAdjective(side)} benet; det andra benet rör sig.`,
});

const bridgeFoot: CueFactory = (side) => ({
  label: `${sideWord(side)} fot i golvet`,
  explanation: `Pressa genom den ${sideAdjective(side)} foten i golvet; håll den andra foten lyft.`,
});
const stretchLeg: CueFactory = (side) => ({
  label: `${sideWord(side)} ben sträcks`,
  explanation: `Håll sträckningen på det ${sideAdjective(side)} benet under tiden som visas.`,
});

const cues: Partial<Record<ExerciseId, CueFactory>> = {
  'step-up': plantedFoot,
  'single-leg-rdl': plantedFoot,
  'dead-bug': (side) => ({
    label: `${sideWord(side)} arm + ${otherWord(side)} ben`,
    explanation: `Sträck ${sideWord(side)} arm och ${otherWord(side)} ben; håll den andra armen upp och det andra knät böjt.`,
  }),
  'side-plank': (side) => ({
    label: `${sideWord(side)} sida nedåt`,
    explanation: `Stöd dig på underarmen på den ${sideAdjective(side)} sidan.`,
  }),
  'split-squat': (side) => ({
    label: `${sideWord(side)} ben fram`,
    explanation: `Det ${sideAdjective(side)} benet står fram och böjs under rörelsen.`,
  }),
  'single-leg-hip-thrust': bridgeFoot,
  'single-leg-calf-raise': plantedFoot,
  'suitcase-carry': (side) => ({
    label: `Vikt i ${sideWord(side)} hand`,
    explanation: `Håll vikten i ${sideWord(side)} hand och gå upprätt.`,
  }),
  'bird-dog': (side) => ({
    label: `${sideWord(side)} arm + ${otherWord(side)} ben`,
    explanation: `Sträck ${sideWord(side)} arm och ${otherWord(side)} ben; motsatt arm och knä ger stöd.`,
  }),
  'supported-row': (side) => ({
    label: `Vikt i ${sideWord(side)} hand`,
    explanation: `Dra vikten med ${sideWord(side)} arm och stöd dig med den andra handen.`,
  }),
  'triceps-kickback': (side) => ({
    label: `${sideWord(side)} arm rör sig`,
    explanation: `Sträck och böj ${sideWord(side)} armbåge; den andra handen ger stöd.`,
  }),
  'reverse-lunge': (side) => ({
    label: `${sideWord(side)} ben fram`,
    explanation: `Det ${sideAdjective(side)} benet står fram och driver dig tillbaka till stående.`,
  }),
  'forward-lunge': (side) => ({
    label: `${sideWord(side)} ben fram`,
    explanation: `Kliv fram med det ${sideAdjective(side)} benet och pressa genom den foten tillbaka.`,
  }),
  'side-lunge': (side) => ({
    label: `Kliv åt ${sideWord(side)}`,
    explanation: `Kliv ut med det ${sideAdjective(side)} benet, böj det knät och pressa tillbaka till mitten.`,
  }),
  'single-arm-thruster': (side) => ({
    label: `Vikt i ${sideWord(side)} hand`,
    explanation: `Pressa vikten med ${sideWord(side)} arm; den andra armen vilar.`,
  }),
  'kettlebell-press': (side) => ({
    label: `Vikt i ${sideWord(side)} hand`,
    explanation: `Pressa vikten med ${sideWord(side)} arm.`,
  }),
  'hamstring-curl': movingLeg,
  'seated-knee-extension': movingLeg,
  'straight-leg-raise': movingLeg,
  'prone-leg-raise': movingLeg,
  'side-lying-hip-abduction': (side) => ({
    label: `${sideWord(side)} ben överst`,
    explanation: `Ligg på den motsatta sidan och lyft det ${sideAdjective(side)} benet överst.`,
  }),
  'side-lying-hip-adduction': (side) => ({
    label: `${sideWord(side)} sida nedåt`,
    explanation: `Ligg på den ${sideAdjective(side)} sidan och lyft det undre benet.`,
  }),
  'calf-stretch': stretchLeg,
  'quadriceps-stretch': stretchLeg,
  'hamstring-stretch': stretchLeg,
  'band-leg-press': movingLeg,
  'kettlebell-floor-press': (side) => ({
    label: `Vikt i ${sideWord(side)} hand`,
    explanation: `Pressa vikten med ${sideWord(side)} arm medan den andra armen vilar.`,
  }),
  'kettlebell-rack-carry': (side) => ({
    label: `Vikt i ${sideWord(side)} hand`,
    explanation: `Håll kettlebellen vid ${sideWord(side)} axel och gå upprätt.`,
  }),
  'rear-foot-split-squat': (side) => ({
    label: `${sideWord(side)} ben fram`,
    explanation: `Det ${sideAdjective(side)} benet står fram; den andra foten vilar på bänken.`,
  }),
  'bench-side-plank-leg-lift': (side) => ({
    label: `${sideWord(side)} sida nedåt`,
    explanation: `Den ${sideAdjective(side)} kroppssidan är nedåt. Den övre foten stöder på bänken och den nedre foten rör sig.`,
  }),
  'kneeling-hip-flexor-stretch': (side) => ({
    label: `${sideWord(side)} knä i golvet`,
    explanation: `Det ${sideAdjective(side)} knäet är i golvet och höftböjaren på den sidan sträcks.`,
  }),
  'balance-pendulum': plantedFoot,
  'single-leg-chair-squat': plantedFoot,
  'single-leg-floor-bridge': bridgeFoot,
  'quad-set': (side) => ({
    label: `${sideWord(side)} lår spänns`,
    explanation: `Spänn det ${sideAdjective(side)} låret och pressa knät mjukt mot underlaget.`,
  }),
  'seated-knee-flexion': movingLeg,
  'band-knee-extension': movingLeg,
  'band-hip-extension': movingLeg,
  'balance-clock': (side) => ({
    label: `${sideWord(side)} fot rör sig · stå på ${otherWord(side)} ben`,
    explanation: `Den ${sideAdjective(side)} foten nuddar punkterna; stå på det ${otherAdjective(side)} benet.`,
  }),
};

/**
 * Resolves the existing stored side value into exercise-specific meaning.
 * `both` and non-unilateral exercises intentionally have no side cue.
 */
export function exerciseSideCue(
  id: ExerciseId,
  side: ExerciseSide,
): ExerciseSideCue | undefined {
  if (side === 'both') return undefined;
  return cues[id]?.(side);
}
