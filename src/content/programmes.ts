import type {
  EquipmentChoice,
  ProgramId,
  TrainingPreferences,
} from '../domain/types';

export const programmeNames: Record<ProgramId, string> = {
  general: 'Allmän styrka',

  running: 'Styrka för löpning',

  rehab: 'Mitt rehabprogram',
};

export const equipmentChoices: Record<EquipmentChoice, string> = {
  bodyweight: 'Kroppsvikt',

  'dumbbell-1': 'En hantel',

  'dumbbell-2': 'Två hantlar',

  'kettlebell-1': 'En kettlebell',

  'kettlebell-2': 'Två kettlebells',

  chair: 'Stabil stol',

  support: 'Vägg eller stabilt stöd',

  step: 'Träningssteg',

  band: 'Träningsband',
};

export const defaultEquipment: EquipmentChoice[] = [
  'bodyweight',

  'dumbbell-2',

  'kettlebell-1',

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
    (v.rehabFocus === undefined || ['custom', 'knee'].includes(v.rehabFocus)) &&
    (v.rehabSide === undefined ||
      ['right', 'left', 'both'].includes(v.rehabSide)) &&
    Array.isArray(v.equipment) &&
    v.equipment.every(
      (item) =>
        typeof item === 'string' && Object.hasOwn(equipmentChoices, item),
    )
  );
}

export function trainingName(value: {
  programId?: ProgramId;
  rehabFocus?: 'custom' | 'knee';
}): string {
  return value.programId === 'rehab' && value.rehabFocus === 'knee'
    ? 'Knärehab · AAOS'
    : value.programId
      ? programmeNames[value.programId]
      : 'Knä och löpning · ursprungligt program';
}
