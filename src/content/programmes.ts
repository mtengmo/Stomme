import type {
  EquipmentChoice,
  ProgramId,
  RehabFocus,
  TrainingPreferences,
} from '../domain/types';

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
    (v.rehabFocus === undefined ||
      ['custom', 'knee', 'knee-physio'].includes(v.rehabFocus)) &&
    (v.rehabSide === undefined ||
      ['right', 'left', 'both'].includes(v.rehabSide)) &&
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
    Array.isArray(v.equipment) &&
    v.equipment.every(
      (item) =>
        typeof item === 'string' && Object.hasOwn(equipmentChoices, item),
    )
  );
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
