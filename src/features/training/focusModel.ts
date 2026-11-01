import type { FocusId, WorkoutFocus } from '../../content/focusPresets';
import type {
  BodyRegionId,
  Session,
  TrainingPreferences,
} from '../../domain/types';
import { defaultFocus } from '../../lib/focus';
import { recentMuscles, suggestFocus } from '../../rules/recovery';

export function startingFocus(
  preferences: TrainingPreferences,
  sessions: readonly Session[],
  now: Date,
  available: readonly FocusId[],
  availableRegions: readonly BodyRegionId[],
): { focus: WorkoutFocus; suggested: boolean } {
  const recent = recentMuscles(sessions, now);
  const usable = (focus: WorkoutFocus): WorkoutFocus => {
    if (focus.id !== 'custom')
      return available.includes(focus.id) ? focus : { id: 'full' };
    const regions =
      focus.regions?.filter((region) => availableRegions.includes(region)) ??
      [];
    return regions.length ? { id: 'custom', regions } : { id: 'full' };
  };
  if (Object.keys(recent).length)
    return { focus: { id: suggestFocus(recent, available) }, suggested: true };
  const last = sessions.find(
    (s) =>
      s.programId === 'general' &&
      !s.customWorkoutId &&
      s.focus &&
      s.status !== 'in_progress',
  );
  if (last?.focus && available.includes(last.focus))
    return {
      focus: usable({
        id: last.focus,
        ...(last.regions ? { regions: last.regions } : {}),
      }),
      suggested: false,
    };
  return { focus: usable(defaultFocus(preferences)), suggested: false };
}
