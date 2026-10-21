import type { ExerciseId } from '../domain/types';

export type MuscleGroupId =
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'hip-abductors'
  | 'back'
  | 'chest'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'hip-adductors'
  | 'hip-flexors';

export const muscleGroups: Record<MuscleGroupId, { label: string }> = {
  quads: { label: 'Framsida lår' },
  hamstrings: { label: 'Baksida lår' },
  glutes: { label: 'Säte' },
  calves: { label: 'Vader' },
  core: { label: 'Bål' },
  'hip-abductors': { label: 'Sidan av höften' },
  back: { label: 'Rygg' },
  chest: { label: 'Bröst' },
  shoulders: { label: 'Axlar' },
  biceps: { label: 'Biceps' },
  triceps: { label: 'Triceps' },
  forearms: { label: 'Underarmar' },
  'hip-adductors': { label: 'Insida lår' },
  'hip-flexors': { label: 'Höftböjare' },
};

export const trainingQualities = {
  balance: { label: 'Balans' },
  grip: { label: 'Grepp' },
  power: { label: 'Explosivitet' },
};

/** Display guidance only; independent of persisted exercise and pain rules. */
export const exerciseMuscles: Record<
  ExerciseId,
  {
    primary: MuscleGroupId[];
    secondary: MuscleGroupId[];
    qualities: ('balance' | 'grip' | 'power')[];
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
  'goblet-squat': {
    primary: ['quads', 'glutes'],
    secondary: ['core'],
    qualities: [],
  },
  'kettlebell-deadlift': {
    primary: ['glutes', 'hamstrings'],
    secondary: ['back', 'core', 'forearms'],
    qualities: ['grip'],
  },
  'dumbbell-rdl': {
    primary: ['hamstrings', 'glutes'],
    secondary: ['back', 'core'],
    qualities: ['grip'],
  },
  'supported-row': {
    primary: ['back'],
    secondary: ['biceps', 'shoulders', 'forearms'],
    qualities: ['grip'],
  },
  'floor-press': {
    primary: ['chest'],
    secondary: ['triceps', 'shoulders'],
    qualities: [],
  },
  'shoulder-press': {
    primary: ['shoulders'],
    secondary: ['triceps', 'core'],
    qualities: [],
  },
  'farmer-carry': {
    primary: ['forearms', 'core'],
    secondary: ['shoulders', 'back'],
    qualities: ['grip'],
  },
  'biceps-curl': {
    primary: ['biceps'],
    secondary: ['forearms'],
    qualities: [],
  },
  'hammer-curl': {
    primary: ['biceps', 'forearms'],
    secondary: [],
    qualities: [],
  },
  'lateral-raise': { primary: ['shoulders'], secondary: [], qualities: [] },
  'triceps-kickback': {
    primary: ['triceps'],
    secondary: ['shoulders'],
    qualities: [],
  },
  'glute-bridge': {
    primary: ['glutes'],
    secondary: ['hamstrings', 'core'],
    qualities: [],
  },
  'reverse-lunge': {
    primary: ['quads', 'glutes'],
    secondary: ['hamstrings', 'core'],
    qualities: ['balance'],
  },
  'forward-lunge': {
    primary: ['quads', 'glutes'],
    secondary: ['hamstrings', 'core'],
    qualities: ['balance'],
  },
  'kettlebell-swing': {
    primary: ['glutes', 'hamstrings'],
    secondary: ['core', 'back', 'forearms'],
    qualities: ['grip', 'power'],
  },
  'kettlebell-press': {
    primary: ['shoulders'],
    secondary: ['triceps', 'core'],
    qualities: [],
  },
  'half-squat': {
    primary: ['quads', 'glutes'],
    secondary: ['hamstrings'],
    qualities: [],
  },
  'hamstring-curl': { primary: ['hamstrings'], secondary: [], qualities: [] },
  'seated-knee-extension': { primary: ['quads'], secondary: [], qualities: [] },
  'straight-leg-raise': {
    primary: ['quads'],
    secondary: ['core'],
    qualities: [],
  },
  'prone-leg-raise': {
    primary: ['glutes', 'hamstrings'],
    secondary: [],
    qualities: [],
  },
  'side-lying-hip-abduction': {
    primary: ['hip-abductors', 'glutes'],
    secondary: [],
    qualities: [],
  },
  'side-lying-hip-adduction': {
    primary: ['hip-adductors'],
    secondary: [],
    qualities: [],
  },
  'calf-stretch': { primary: ['calves'], secondary: [], qualities: [] },
  'quadriceps-stretch': { primary: ['quads'], secondary: [], qualities: [] },
  'hamstring-stretch': {
    primary: ['hamstrings'],
    secondary: [],
    qualities: [],
  },
  'band-leg-press': {
    primary: ['quads', 'hamstrings'],
    secondary: ['core'],
    qualities: [],
  },
  'kettlebell-floor-press': {
    primary: ['chest'],
    secondary: ['triceps', 'shoulders', 'core'],
    qualities: [],
  },
  'kettlebell-rack-carry': {
    primary: ['core'],
    secondary: ['shoulders', 'back', 'forearms'],
    qualities: ['grip'],
  },
  'rear-foot-split-squat': {
    primary: ['quads', 'glutes'],
    secondary: ['core'],
    qualities: ['balance'],
  },
  'bench-side-plank-leg-lift': {
    primary: ['hip-adductors'],
    secondary: ['core', 'shoulders'],
    qualities: [],
  },
  'kneeling-hip-flexor-stretch': {
    primary: ['hip-flexors'],
    secondary: [],
    qualities: [],
  },
  'prone-on-forearms': { primary: [], secondary: [], qualities: [] },
  'heel-slide': { primary: ['core'], secondary: ['quads'], qualities: [] },
  'balance-pendulum': {
    primary: ['glutes', 'hamstrings'],
    secondary: ['core'],
    qualities: ['balance'],
  },
  'single-leg-chair-squat': {
    primary: ['quads', 'glutes'],
    secondary: ['core'],
    qualities: ['balance'],
  },
  'single-leg-floor-bridge': {
    primary: ['glutes'],
    secondary: ['hamstrings', 'core'],
    qualities: [],
  },
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
