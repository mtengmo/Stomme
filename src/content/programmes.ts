import type {
  EquipmentChoice,
  ProgramId,
  RehabFocus,
  TrainingPreferences,
  WorkoutEquipment,
} from '../domain/types';
import { bodyRegions } from './muscles';

export const experienceLabels: Record<
  TrainingPreferences['experience'],
  string
> = {
  new: 'Ny eller på väg tillbaka',
  some: 'Viss vana',
  regular: 'Tränar regelbundet',
};

export const programmeNames: Record<ProgramId, string> = {
  general: 'Allmän styrka',

  running: 'Styrka för löpning',

  rehab: 'Mitt rehabprogram',
};

export const equipmentChoices: Record<EquipmentChoice, string> = {
  bodyweight: 'Kroppsvikt',

  chair: 'Stabil stol',

  support: 'Vägg eller stabilt stöd',

  step: 'Träningssteg',

  band: 'Träningsband',
  'pull-up-bar': 'Fast monterad chinsstång',
  'dip-bars': 'Stabil dipsställning',
};

export const defaultEquipment: EquipmentChoice[] = [
  'bodyweight',

  'chair',

  'support',

  'step',
];

export function isTrainingPreferences(
  value: unknown,
): value is TrainingPreferences {
  if (!value || typeof value !== 'object') return false;

  const v = value as Partial<TrainingPreferences>;

  return (
    typeof v.programId === 'string' &&
    Object.hasOwn(programmeNames, v.programId) &&
    ['new', 'some', 'regular'].includes(v.experience ?? '') &&
    (v.rehabFocus === undefined ||
      ['custom', 'knee', 'knee-physio'].includes(v.rehabFocus)) &&
    (v.rehabSide === undefined ||
      ['right', 'left', 'both'].includes(v.rehabSide)) &&
    (v.bodyParts === undefined ||
      (Array.isArray(v.bodyParts) &&
        v.bodyParts.length >= 1 &&
        v.bodyParts.length <= 6 &&
        new Set(v.bodyParts).size === v.bodyParts.length &&
        v.bodyParts.every((part) => bodyRegions.some((r) => r.id === part)))) &&
    (v.weights === undefined ||
      (Array.isArray(v.weights) &&
        v.weights.length <= 20 &&
        v.weights.every(
          (item) =>
            !!item &&
            (item.type === 'dumbbell' || item.type === 'kettlebell') &&
            Number.isFinite(item.kg) &&
            item.kg > 0 &&
            item.kg <= 100 &&
            (item.count === 1 || item.count === 2),
        ) &&
        new Set(v.weights.map((item) => `${item.type}:${item.kg}`)).size ===
          v.weights.length)) &&
    (v.adjustableWeights === undefined ||
      (Array.isArray(v.adjustableWeights) &&
        v.adjustableWeights.length <= 2 &&
        v.adjustableWeights.every(
          (item) =>
            !!item &&
            (item.type === 'dumbbell' || item.type === 'kettlebell') &&
            (item.count === 1 || item.count === 2) &&
            Array.isArray(item.settingsKg) &&
            item.settingsKg.length >= 1 &&
            item.settingsKg.length <= 20 &&
            item.settingsKg.every(
              (kg) => Number.isFinite(kg) && kg > 0 && kg <= 100,
            ) &&
            new Set(item.settingsKg).size === item.settingsKg.length,
        ) &&
        new Set(v.adjustableWeights.map((item) => item.type)).size ===
          v.adjustableWeights.length)) &&
    Array.isArray(v.equipment) &&
    v.equipment.every(
      (item) =>
        typeof item === 'string' && Object.hasOwn(equipmentChoices, item),
    )
  );
}

/** A workout override is a full effective selection, not a change to home settings. */
export function isWorkoutEquipment(value: unknown): value is WorkoutEquipment {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return (
    Object.keys(item).every((key) =>
      ['equipment', 'weights', 'adjustableWeights'].includes(key),
    ) &&
    isTrainingPreferences({
      programId: 'general',
      experience: 'new',
      equipment: item.equipment,
      weights: item.weights,
      adjustableWeights: item.adjustableWeights,
    }) &&
    Array.isArray(item.equipment) &&
    item.equipment.length <= 7 &&
    new Set(item.equipment).size === item.equipment.length
  );
}

/** Returns home as-is when no override is selected; otherwise a detached effective copy. */
export function withWorkoutEquipment(
  home: TrainingPreferences,
  override?: WorkoutEquipment,
): TrainingPreferences {
  return override
    ? {
        ...home,
        equipment: [...override.equipment],
        weights: structuredClone(override.weights ?? []),
        adjustableWeights: structuredClone(override.adjustableWeights ?? []),
      }
    : home;
}

export type RehabGroup = 'custom' | 'aaos' | 'physio';

/** Maps a stored focus to its group; absent means custom. Never test the raw focus string. */
export function rehabGroupOf(focus: RehabFocus | undefined): RehabGroup {
  if (focus === 'knee') return 'aaos';
  if (focus === 'knee-physio') return 'physio';
  return 'custom';
}

export function rehabGroup(value: { rehabFocus?: RehabFocus }): RehabGroup {
  return rehabGroupOf(value.rehabFocus);
}

export function trainingName(value: {
  programId?: ProgramId;
  rehabFocus?: RehabFocus;
}): string {
  const group = rehabGroup(value);
  return value.programId === 'rehab' && group === 'aaos'
    ? 'Knärehab · AAOS'
    : value.programId === 'rehab' && group === 'physio'
      ? 'Knärehab · Fysioterapeutens program'
      : value.programId
        ? programmeNames[value.programId]
        : 'Knä och löpning · ursprungligt program';
}
