import { focusPresets, type WorkoutFocus } from '../content/focusPresets';
import { bodyRegions } from '../content/muscles';
import type { BodyRegionId, TrainingPreferences } from '../domain/types';

/** Untrusted URL input never reaches the roster without this whitelist. */
export function parseFocus(search: string): WorkoutFocus | undefined {
  const params = new URLSearchParams(search);
  const value = params.get('fokus');
  if (value === 'egen') {
    const parts = params.get('delar')?.split(',') ?? [];
    if (
      !parts.length ||
      new Set(parts).size !== parts.length ||
      parts.some((part) => !bodyRegions.some((r) => r.id === part))
    )
      return undefined;
    return { id: 'custom', regions: parts as BodyRegionId[] };
  }
  return focusPresets.some((p) => p.id !== 'custom' && p.id === value)
    ? { id: value as WorkoutFocus['id'] }
    : undefined;
}
export function defaultFocus(preferences: TrainingPreferences): WorkoutFocus {
  return preferences.bodyParts?.length
    ? { id: 'custom', regions: preferences.bodyParts }
    : { id: 'full' };
}
export function focusQuery(focus: WorkoutFocus): string {
  return focus.id === 'custom'
    ? `fokus=egen&delar=${(focus.regions ?? []).join(',')}`
    : `fokus=${focus.id}`;
}
