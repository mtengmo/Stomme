import type { BodyRegionId } from '../domain/types';
import { bodyRegions, type MuscleGroupId } from './muscles';

export type FocusId =
  | 'full'
  | 'upper'
  | 'lower'
  | 'push'
  | 'pull'
  | 'legs'
  | 'custom';
export type RoutineFocus = Exclude<FocusId, 'custom'>;
export type WorkoutGroup =
  | 'push'
  | 'pull'
  | 'legs'
  | 'upper'
  | 'full'
  | 'other';
export interface WorkoutFocus {
  id: FocusId;
  regions?: BodyRegionId[];
}

export const pushMuscles: MuscleGroupId[] = ['chest', 'shoulders', 'triceps'];
export const pullMuscles: MuscleGroupId[] = ['back', 'biceps', 'forearms'];
export const legMuscles: MuscleGroupId[] = [
  ...(bodyRegions.find((r) => r.id === 'legs') as (typeof bodyRegions)[number])
    .muscles,
];
export const upperMuscles = [...pushMuscles, ...pullMuscles];
const allMuscles = [...upperMuscles, ...legMuscles, 'core' as const];
export const focusPresets: {
  id: FocusId;
  label: string;
  targets: MuscleGroupId[];
  slots: string[];
}[] = [
  { id: 'full', label: 'Helkropp', targets: allMuscles, slots: [] },
  {
    id: 'upper',
    label: 'Överkropp',
    targets: upperMuscles,
    slots: [
      'horizontal-press',
      'row',
      'overhead',
      'vertical-pull',
      'lateral-raise',
      'curl',
      'arm-extension',
      'carry',
    ],
  },
  {
    id: 'lower',
    label: 'Underkropp & bål',
    targets: [...legMuscles, 'core'],
    slots: ['squat', 'hinge', 'split-leg', 'calf', 'core', 'side-core'],
  },
  {
    id: 'push',
    label: 'Press',
    targets: pushMuscles,
    slots: ['horizontal-press', 'overhead', 'lateral-raise', 'arm-extension'],
  },
  {
    id: 'pull',
    label: 'Drag',
    targets: pullMuscles,
    slots: ['row', 'vertical-pull', 'curl', 'carry'],
  },
  {
    id: 'legs',
    label: 'Ben',
    targets: legMuscles,
    slots: ['squat', 'hinge', 'split-leg', 'calf'],
  },
  { id: 'custom', label: 'Välj själv', targets: [], slots: [] },
];
export const routineFocusIds = focusPresets
  .filter((p) => p.id !== 'custom')
  .map((p) => p.id as RoutineFocus);
export const workoutGroupLabels: Record<WorkoutGroup, string> = {
  push: 'Press',
  pull: 'Drag',
  legs: 'Ben',
  upper: 'Överkropp',
  full: 'Helkropp',
  other: 'Övrigt',
};
export const workoutGroups = Object.keys(workoutGroupLabels) as WorkoutGroup[];
export function focusLabel(id: FocusId): string {
  return (
    focusPresets.find((p) => p.id === id) as (typeof focusPresets)[number]
  ).label;
}
export function focusTargets(focus: WorkoutFocus): MuscleGroupId[] {
  return focus.id === 'custom'
    ? [
        ...new Set(
          bodyRegions
            .filter((r) => focus.regions?.includes(r.id))
            .flatMap((r) => r.muscles),
        ),
      ]
    : (
        focusPresets.find(
          (p) => p.id === focus.id,
        ) as (typeof focusPresets)[number]
      ).targets;
}
