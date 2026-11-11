import { describe, expect, it } from 'vitest';
import { readyWorkouts } from '../content/readyWorkouts';
import { proposals } from '../content/runningProposals';
import type { TrainingPreferences } from '../domain/types';
import { readyProgramPass } from './readyProgramPass';

const prefs = (
  experience: TrainingPreferences['experience'],
  equipment: TrainingPreferences['equipment'] = [
    'bodyweight',
    'chair',
    'support',
    'step',
    'bench',
  ],
): TrainingPreferences => ({ programId: 'general', experience, equipment });

describe('readyProgramPass', () => {
  it('returns null for an unknown id', () => {
    expect(readyProgramPass('nope', prefs('some'))).toBeNull();
  });

  it('uses Grund for new and Medel otherwise for running-strength', () => {
    const [grund, medel] = proposals(prefs('new'));
    expect(
      readyProgramPass('running-strength', prefs('new'))?.exerciseIds,
    ).toEqual(grund?.exerciseIds);
    for (const level of ['some', 'regular'] as const)
      expect(
        readyProgramPass('running-strength', prefs(level))?.exerciseIds,
      ).toEqual(proposals(prefs(level))[1]?.exerciseIds);
    expect(medel?.exerciseIds.length).toBeGreaterThan(0);
  });

  it('labels the pass and keeps lower / A', () => {
    expect(readyProgramPass('runner-ten', prefs('regular'))).toMatchObject({
      focus: 'lower',
      template: 'A',
      ready: { id: 'runner-ten', name: 'Löparens tio' },
    });
  });

  it('drops the jump for new and filters by equipment', () => {
    expect(
      readyProgramPass('runner-ten', prefs('new'))?.exerciseIds,
    ).not.toContain('plate-pogos');
    const bare = readyProgramPass(
      'runner-ten',
      prefs('regular', ['bodyweight']),
    );
    expect(bare?.exerciseIds.length).toBeLessThan(10);
  });

  it('returns null for a ready workout that is not a running start', () => {
    expect(readyProgramPass('dumbbell-full-body', prefs('regular'))).toBeNull();
  });

  it('returns a copy, not the workout list', () => {
    const pass = readyProgramPass('runner-home', prefs('regular'));
    const source = readyWorkouts.find((w) => w.id === 'runner-home');
    expect(pass?.exerciseIds).not.toBe(source?.exerciseIds);
  });
});
