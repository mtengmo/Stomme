import type { ExerciseId } from '../domain/types';

export type MuscleGroupId =
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'hip-abductors'
  | 'back';

export const muscleGroups: Record<MuscleGroupId, { label: string }> = {
  quads: { label: 'Framsida lår' },
  hamstrings: { label: 'Baksida lår' },
  glutes: { label: 'Säte' },
  calves: { label: 'Vader' },
  core: { label: 'Bål' },
  'hip-abductors': { label: 'Sidan av höften' },
  back: { label: 'Rygg' },
};

export const trainingQualities = {
  balance: { label: 'Balans' },
  grip: { label: 'Grepp' },
};

/** Display guidance only; independent of persisted exercise and pain rules. */
export const exerciseMuscles: Record<
  ExerciseId,
  {
    primary: MuscleGroupId[];
    secondary: MuscleGroupId[];
    qualities: ('balance' | 'grip')[];
  }
> = {
  'goblet-chair-squat': {
    primary: ['quads', 'glutes'],
    secondary: ['core'],
    qualities: [],
  },
  'step-up': {
    primary: ['quads', 'glutes'],
    secondary: [],
    qualities: [],
  },
  'single-leg-rdl': {
    primary: ['hamstrings', 'glutes'],
    secondary: ['core'],
    qualities: ['balance'],
  },
  'dead-bug': { primary: ['core'], secondary: [], qualities: [] },
  'side-plank': {
    primary: ['core'],
    secondary: ['hip-abductors'],
    qualities: [],
  },
  'split-squat': {
    primary: ['quads', 'glutes'],
    secondary: [],
    qualities: [],
  },
  'single-leg-hip-thrust': {
    primary: ['glutes'],
    secondary: ['hamstrings'],
    qualities: [],
  },
  'single-leg-calf-raise': {
    primary: ['calves'],
    secondary: [],
    qualities: [],
  },
  'suitcase-carry': {
    primary: ['core'],
    secondary: [],
    qualities: ['grip'],
  },
  'bird-dog': {
    primary: ['back', 'core'],
    secondary: ['glutes'],
    qualities: [],
  },
  'wall-sit': { primary: ['quads'], secondary: [], qualities: [] },
};

export function primaryMuscleLabel(exerciseId: ExerciseId): string {
  return exerciseMuscles[exerciseId].primary
    .map((id) => muscleGroups[id].label)
    .join(', ');
}

export function muscleFilterHref(group: MuscleGroupId): string {
  return `/ovningar?muskel=${group}`;
}

export function parseMuscleFilter(search: string): MuscleGroupId | null {
  const value = new URLSearchParams(search).get('muskel');
  return value !== null && Object.hasOwn(muscleGroups, value)
    ? (value as MuscleGroupId)
    : null;
}
