import {
  type ExerciseVariant,
  exerciseMetadata,
  type TechnicalLevel,
} from '../content/exerciseMetadata';
import type { ExerciseId, TrainingPreferences } from '../domain/types';
import { equipmentFits } from './equipment';
import { variantWeights } from './weightInventory';

type Experience = TrainingPreferences['experience'];

/** Explicit movement slots prevent a liked curl replacing a squat or row. */
export const movementSlots: Partial<Record<ExerciseId, string>> = {
  'goblet-squat': 'squat',
  'goblet-chair-squat': 'squat',
  'half-squat': 'squat',
  'dumbbell-rdl': 'hinge',
  'kettlebell-deadlift': 'hinge',
  'single-leg-rdl': 'hinge',
  'supported-row': 'row',
  'bent-over-row': 'row',
  'sumo-squat': 'squat',
  'kettlebell-goblet-squat': 'squat',
  'floor-press': 'horizontal-press',
  'kettlebell-floor-press': 'horizontal-press',
  'push-up': 'horizontal-press',
  'decline-push-up': 'horizontal-press',
  'diamond-push-up': 'horizontal-press',
  'plank-arm-lift': 'core',
  woodchop: 'core',
  'kettlebell-halo': 'core',
  'russian-twist': 'core',
  'knee-push-up': 'horizontal-press',
  'wall-push-up': 'horizontal-press',
  'shoulder-press': 'overhead-press',
  'overhead-triceps-extension': 'arm-extension',
  'dumbbell-pullover': 'pullover',
  'triceps-kickback': 'arm-extension',
  'kettlebell-press': 'overhead-press',
  'farmer-carry': 'carry',
  'suitcase-carry': 'carry',
  'kettlebell-rack-carry': 'carry',
  'reverse-lunge': 'split-leg',
  'forward-lunge': 'split-leg',
  'side-lunge': 'split-leg',
  'walking-lunge': 'split-leg',
  'split-squat': 'split-leg',
  'biceps-curl': 'curl',
  'squat-curl': 'squat',
  thruster: 'squat',
  'single-arm-thruster': 'squat',
  'hammer-curl': 'curl',
  'glute-bridge': 'bridge',
  'weighted-glute-bridge': 'bridge',
  'single-leg-floor-bridge': 'bridge',
  'dead-bug': 'core',
  'bird-dog': 'core',
  'side-plank': 'core',
};

const levelRank: Record<TechnicalLevel, number> = {
  basic: 0,
  practiced: 1,
  technical: 2,
};

export function allowedLevels(experience: Experience): TechnicalLevel[] {
  return experience === 'new'
    ? ['basic']
    : experience === 'some'
      ? ['basic', 'practiced']
      : ['basic', 'practiced', 'technical'];
}

export function levelRankOf(level: TechnicalLevel): number {
  return levelRank[level];
}

/** Two-footed squat, hinge, row and floor press may start on the heaviest owned weight. */
const heavySlots = new Set(['squat', 'hinge', 'row', 'horizontal-press']);
/** One-sided or overhead work stays below the heaviest weight even in a heavy slot. */
export const limitedExercises = new Set<ExerciseId>([
  'single-leg-rdl',
  'bent-over-row',
  'squat-curl',
  'thruster',
  'single-arm-thruster',
  'overhead-triceps-extension',
  'dumbbell-pullover',
  'side-lunge',
  'walking-lunge',
  'russian-twist',
  'woodchop',
  'one-arm-kettlebell-swing',
  'kettlebell-halo',
]);
export function heavyStartAllowed(id: ExerciseId): boolean {
  const slot = movementSlots[id];
  return !!slot && heavySlots.has(slot) && !limitedExercises.has(id);
}

function isWeighted(variant: ExerciseVariant): boolean {
  return variant.equipment.some(
    (item) => item.type === 'dumbbell' || item.type === 'kettlebell',
  );
}

/** A weighted variant is only usable once the user has registered a weight for it. */
export function variantUsable(
  preferences: TrainingPreferences,
  variant: ExerciseVariant,
): boolean {
  return (
    !isWeighted(variant) || variantWeights(preferences, variant).length > 0
  );
}

export function variantsThatFit(
  id: ExerciseId,
  preferences: TrainingPreferences,
): ExerciseVariant[] {
  return exerciseMetadata[id].variants.filter((variant) =>
    equipmentFits(variant.equipment, preferences),
  );
}

/**
 * The variant a first session starts on. New starts with the first variant at
 * an allowed level; others take the heaviest one the user can actually load.
 * A weighted variant without a registered weight falls back to bodyweight.
 */
export function chooseVariant(
  id: ExerciseId,
  preferences: TrainingPreferences,
): ExerciseVariant | undefined {
  const fits = variantsThatFit(id, preferences);
  if (preferences.programId === 'rehab') return fits[0];
  const levels = allowedLevels(preferences.experience);
  const atLevel = fits.filter((variant) =>
    levels.includes(variant.technicalLevel),
  );
  const pool = atLevel.length ? atLevel : fits;
  const usable = pool.filter((variant) => variantUsable(preferences, variant));
  const candidates = usable.length ? usable : pool;
  if (preferences.experience === 'new') return candidates[0];
  const top = (variant: ExerciseVariant) =>
    Math.max(0, ...variantWeights(preferences, variant).map((w) => w.totalKg));
  // Weighted with a registered weight, then unweighted; later variants are heavier.
  return candidates.reduce<ExerciseVariant | undefined>((best, variant) => {
    if (!best) return variant;
    const score = (item: ExerciseVariant) =>
      isWeighted(item) ? 1 + top(item) / 1000 : 0.5;
    return score(variant) >= score(best) ? variant : best;
  }, undefined);
}

/** New 2 sets, some 3, regular 4 for the first two exercises and 3 after. */
export function startingSets(experience: Experience, index?: number): number {
  if (experience === 'new') return 2;
  if (experience === 'some') return 3;
  return index !== undefined && index < 2 ? 4 : 3;
}

export interface StartingWeight {
  totalKg: number;
  /** True when the heaviest owned weight was chosen. */
  heavy: boolean;
}

/**
 * Heavy-start policy for the first-session roster. Pain or symptoms on record
 * always start on the lightest weight.
 */
export function chooseStartingWeight(
  preferences: TrainingPreferences,
  variant: ExerciseVariant,
  options: { heavyAllowed: boolean; painOnRecord: boolean },
): StartingWeight {
  const choices = variantWeights(preferences, variant);
  if (!choices.length) return { totalKg: 0, heavy: false };
  const last = choices.length - 1;
  const index = options.painOnRecord
    ? 0
    : preferences.experience === 'new'
      ? 0
      : preferences.experience === 'some'
        ? Math.min(Math.floor(last / 2), Math.max(last - 1, 0))
        : options.heavyAllowed
          ? last
          : // Upper-middle, but never the heaviest outside the heavy slots.
            last === 0
            ? 0
            : Math.min(Math.ceil(last / 2), last - 1);
  return {
    // choices is non-empty and every branch clamps index to [0, last].
    totalKg: (choices[index] as (typeof choices)[number]).totalKg,
    heavy: index === last && last > 0 && options.heavyAllowed,
  };
}
