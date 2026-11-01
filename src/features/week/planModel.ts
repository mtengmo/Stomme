import { focusLabel } from '../../content/focusPresets';
import type { CustomWorkout } from '../../db/customWorkouts';
import type { TemplateId, WeeklyDayPlan } from '../../domain/types';
import { focusQuery } from '../../lib/focus';

export const weekdayNames = [
  'Måndag',
  'Tisdag',
  'Onsdag',
  'Torsdag',
  'Fredag',
  'Lördag',
  'Söndag',
];
export function planLabel(
  plan: WeeklyDayPlan,
  workouts: readonly CustomWorkout[],
): string {
  if (plan.kind === 'focus') return focusLabel(plan.focus);
  if (plan.kind === 'workout')
    return workouts.find((w) => w.id === plan.workoutId)?.name ?? 'Nästa pass';
  return 'Nästa pass';
}
export function planHref(
  plan: WeeklyDayPlan,
  workouts: readonly CustomWorkout[],
  nextId: TemplateId,
): string {
  if (plan.kind === 'focus')
    return `/traning/${nextId}?${focusQuery({ id: plan.focus })}`;
  if (plan.kind === 'workout' && workouts.some((w) => w.id === plan.workoutId))
    return `/traning/A?workout=${encodeURIComponent(plan.workoutId)}`;
  return `/traning/${nextId}`;
}
