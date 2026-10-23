import type {
  ExerciseId,
  PlannedExercise,
  TrainingPreferences,
} from '../domain/types';
import { equipmentFits } from '../rules/equipment';
import { exerciseMetadata } from './exerciseMetadata';
import { exercises } from './exercises';

export interface PhysioKneeItem {
  /** Position on the physiotherapist's paper, 1-based. */
  sheetNo: number;
  /** Name as written on the paper. */
  sheetLabel: string;
  exerciseId: ExerciseId;
  variantId: string;
  sets: number;
  target: number;
  /** Sheet number of the earlier item this one is a progression of. */
  progressionOf?: number;
}

export const physioKneeItems: readonly PhysioKneeItem[] = [
  {
    sheetNo: 1,
    sheetLabel: 'Ryggliggande lårmuskelspänning',
    exerciseId: 'quad-set',
    variantId: 'bodyweight',
    sets: 1,
    target: 10,
  },
  {
    sheetNo: 2,
    sheetLabel: 'Bäckenlyft',
    exerciseId: 'glute-bridge',
    variantId: 'bodyweight',
    sets: 2,
    target: 10,
  },
  {
    sheetNo: 3,
    sheetLabel: 'Sittande knäböjning',
    exerciseId: 'seated-knee-flexion',
    variantId: 'bodyweight',
    sets: 1,
    target: 10,
  },
  {
    sheetNo: 4,
    sheetLabel: 'Sittande knästräckning',
    exerciseId: 'seated-knee-extension',
    variantId: 'bodyweight',
    sets: 2,
    target: 10,
  },
  {
    sheetNo: 5,
    sheetLabel: 'Knästräckning med gummiband',
    exerciseId: 'band-knee-extension',
    variantId: 'band',
    sets: 2,
    target: 10,
    progressionOf: 4,
  },
  {
    sheetNo: 6,
    sheetLabel: 'Stående knäböjning',
    exerciseId: 'hamstring-curl',
    variantId: 'bodyweight',
    sets: 2,
    target: 10,
  },
  {
    sheetNo: 7,
    sheetLabel: 'Höftextension med gummiband',
    exerciseId: 'band-hip-extension',
    variantId: 'band',
    sets: 2,
    target: 10,
    progressionOf: 6,
  },
  {
    sheetNo: 8,
    sheetLabel: 'Knäböj vid stol',
    exerciseId: 'goblet-chair-squat',
    variantId: 'bodyweight',
    sets: 2,
    target: 10,
  },
  {
    sheetNo: 9,
    sheetLabel: 'Balansklockan',
    exerciseId: 'balance-clock',
    variantId: 'bodyweight',
    sets: 1,
    target: 5,
  },
];

export const physioKneeTotal = physioKneeItems.length;

export const physioKneeBanner =
  'Gäller bara om ditt papper innehåller just de här övningarna. Appen ökar aldrig rehab automatiskt. Fråga fysioterapeuten vid osäkerhet.';

export const physioKneeConfirmLabel =
  'Jag har jämfört övningar, sida och antal med mitt papper från fysioterapeuten.';

export const physioHoldNote =
  'Hållningen på 5 sekunder (övning 4 och 6) kommer från AAOS: följ ditt papper om det skiljer sig.';

export const physioSwapNote =
  'Byt till ett nästa steg först när du och din fysioterapeut kommit överens.';

export const physioForm =
  'Förifyllt från fysioterapeutens knäprogram. Kontrollera mot ditt papper och ändra vid behov.';

export function physioKneeItemFor(
  exerciseId: ExerciseId,
): PhysioKneeItem | undefined {
  return physioKneeItems.find((item) => item.exerciseId === exerciseId);
}

/**
 * Short informational notes derived at draw time from `progressionOf`.
 * Nothing is stored and the app never swaps an exercise by itself.
 */
export function physioProgressionNotes(exerciseId: ExerciseId): string[] {
  const item = physioKneeItemFor(exerciseId);
  if (!item) return [];
  const notes: string[] = [];
  if (item.progressionOf !== undefined)
    notes.push(`Stegring av övning ${item.progressionOf}.`);
  const next = physioKneeItems.find(
    (entry) => entry.progressionOf === item.sheetNo,
  );
  if (next) notes.push(`Nästa steg på papperet: övning ${next.sheetNo}.`);
  return notes;
}

function fitsItem(item: PhysioKneeItem, preferences: TrainingPreferences) {
  const variant = exerciseMetadata[item.exerciseId].variants.find(
    (v) => v.id === item.variantId,
  );
  return variant && equipmentFits(variant.equipment, preferences.equipment)
    ? variant
    : undefined;
}

/** Number of the nine paper items that fit the user's equipment. */
export function physioKneeFitCount(preferences: TrainingPreferences): number {
  return physioKneeItems.filter((item) => fitsItem(item, preferences)).length;
}

/** Plan row for one paper item, or undefined when the equipment is missing. */
export function physioKneePlanItem(
  item: PhysioKneeItem,
  preferences: TrainingPreferences,
): PlannedExercise | undefined {
  const exercise = exercises[item.exerciseId];
  const variant = fitsItem(item, preferences);
  if (!variant) return undefined;
  return {
    exerciseId: item.exerciseId,
    sets: item.sets,
    target: item.target,
    loadIndex: variant.defaultLoadIndex,
    weightKg: 0,
    restSec: 60,
    reason: 'first_time',
    variantId: variant.id,
    sides: exercise.perSide
      ? preferences.rehabSide && preferences.rehabSide !== 'both'
        ? [preferences.rehabSide]
        : ['right', 'left']
      : ['both'],
    explanation: `Förifyllt från fysioterapeutens knäprogram: ${item.sets} × ${item.target}${exercise.unit === 'laps' ? ' varv' : ''}${exercise.perSide ? ' per vald sida' : ''}. Kontrollera mot ditt papper och ändra vid behov.`,
  };
}

export function physioKneePlan(
  preferences: TrainingPreferences,
): PlannedExercise[] {
  return physioKneeItems.flatMap((item) => {
    const row = physioKneePlanItem(item, preferences);
    return row ? [row] : [];
  });
}
