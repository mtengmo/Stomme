import { describe, expect, it } from 'vitest';
import type { TrainingPreferences } from '../domain/types';
import { favouriteAlternatives } from '../rules/favouriteSuggestions';
import { buildRoster } from '../rules/programRosters';
import { exerciseAliases } from './exerciseAliases';
import { readAuditLog } from './exerciseAudit';
import { exerciseMetadata } from './exerciseMetadata';
import { exerciseList, exercises } from './exercises';
import {
  activeExerciseList,
  isRetiredExercise,
  retiredExerciseIds,
  retiredExercises,
} from './retiredExercises';
import { focusSlots, generalSlots, rehabAdditionIds } from './rosterSlots';

describe('retired exercises', () => {
  it('retires exactly the approved duplicates and keeps the rehab addition active', () => {
    expect([...retiredExerciseIds].sort()).toEqual([
      'blast-off-push-up',
      'fast-feet',
      'squat-curl',
    ]);
    expect(retiredExerciseIds.has('bench-side-plank-leg-lift')).toBe(false);
    expect(rehabAdditionIds.has('bench-side-plank-leg-lift')).toBe(true);
  });

  it('keeps every retired id in the catalogue, metadata, aliases and audit log', () => {
    const logged = new Set(readAuditLog().map((e) => e.id));
    for (const id of retiredExerciseIds) {
      expect(exercises[id]).toBeDefined();
      expect(exerciseList.some((e) => e.id === id)).toBe(true);
      expect(exerciseMetadata[id]).toBeDefined();
      expect(exerciseAliases[id]?.length).toBeGreaterThan(0);
      expect(logged.has(id)).toBe(true);
    }
  });

  it('names an existing, active replacement and a reason for each', () => {
    for (const [id, info] of Object.entries(retiredExercises)) {
      expect(info.reason.length).toBeGreaterThan(10);
      expect(info.replacedBy.length).toBeGreaterThan(0);
      for (const replacement of info.replacedBy) {
        expect(exercises[replacement]).toBeDefined();
        expect(isRetiredExercise(replacement)).toBe(false);
      }
      expect(info.replacedBy).not.toContain(id as never);
    }
  });

  it('leaves retired exercises out of the active list only', () => {
    expect(activeExerciseList).toHaveLength(
      exerciseList.length - retiredExerciseIds.size,
    );
    for (const id of retiredExerciseIds)
      expect(activeExerciseList.some((e) => e.id === id)).toBe(false);
  });

  it('is never a roster candidate or an easier/harder link', () => {
    const candidates = [
      ...Object.values(generalSlots).flat(),
      ...focusSlots,
    ].flatMap((slot) => slot.candidates);
    for (const id of retiredExerciseIds) expect(candidates).not.toContain(id);
    for (const [from, metadata] of Object.entries(exerciseMetadata)) {
      if (isRetiredExercise(from as never)) continue;
      expect(retiredExerciseIds.has(metadata.easierExerciseId as never)).toBe(
        false,
      );
      expect(retiredExerciseIds.has(metadata.harderExerciseId as never)).toBe(
        false,
      );
    }
  });

  it('is not offered as a favourite alternative or in any built roster', () => {
    const preferences: TrainingPreferences = {
      programId: 'general',
      experience: 'regular',
      equipment: ['bodyweight', 'chair', 'support'],
    };
    expect(
      favouriteAlternatives(
        'goblet-squat',
        ['squat-curl', 'thruster'],
        [],
        preferences,
      ),
    ).not.toContain('squat-curl');
    for (const template of ['A', 'B'] as const)
      for (const experience of ['new', 'some', 'regular'] as const) {
        const { ids } = buildRoster({ ...preferences, experience }, template);
        for (const id of retiredExerciseIds) expect(ids).not.toContain(id);
      }
  });
});
