import { describe, expect, it } from 'vitest';
import { initialTrainingRoster } from '../rules/programRosters';
import { inventory } from '../test/inventory';
import { exerciseMetadata } from './exerciseMetadata';
import { exerciseReferences } from './exerciseReferences';
import { exerciseList, exercises } from './exercises';
import { exerciseMuscles } from './muscles';

const ids = [
  'rear-foot-split-squat',
  'bench-side-plank-leg-lift',
  'kneeling-hip-flexor-stretch',
  'prone-on-forearms',
  'heel-slide',
  'balance-pendulum',
  'single-leg-chair-squat',
  'single-leg-floor-bridge',
] as const;

describe('new rehab-source catalogue additions', () => {
  it('allocates the permanent E41–E48 references and sourced metadata', () => {
    expect(ids.map((id) => exerciseReferences[id])).toEqual([
      'E41',
      'E42',
      'E43',
      'E44',
      'E45',
      'E46',
      'E47',
      'E48',
    ]);
    for (const id of ids) {
      expect(exerciseList.some((exercise) => exercise.id === id)).toBe(true);
      expect(exerciseMetadata[id].sources.length).toBeGreaterThan(0);
      expect(exerciseMetadata[id].sources[0]?.url).toMatch(/^https:\/\//);
      expect(exerciseMetadata[id].sources[0]?.title).toBeTruthy();
    }
  });

  it('keeps these entries out of default strength and rehab rosters', () => {
    for (const programId of ['general', 'running', 'rehab'] as const) {
      for (const template of ['A', 'B'] as const) {
        const roster = initialTrainingRoster(
          {
            programId,
            experience: 'regular',
            ...inventory({
              dumbbells: [[5, 2]],
              kettlebells: [[8, 2]],
              support: ['chair', 'support', 'step', 'band'],
            }),
            equipment: ['bodyweight', 'chair', 'support', 'step', 'band'],
          },
          template,
        );
        expect(ids.some((id) => roster.includes(id))).toBe(false);
      }
    }
    for (const id of ids)
      expect(
        exerciseMetadata[id].sources.some((source) =>
          source.publisher.includes('AAOS'),
        ),
      ).toBe(false);
  });

  it('keeps the prone position unassigned to muscle targets and the heel slide as total timed work', () => {
    expect(exerciseMetadata['prone-on-forearms'].kind).toBe('mobility');
    expect(exerciseMuscles['prone-on-forearms'].primary).toEqual([]);
    expect(exercises['heel-slide']).toMatchObject({
      unit: 'seconds',
      perSide: false,
    });
    expect(exercises['heel-slide'].tips[2]).toContain('det andra benet');
  });

  it('keeps the seated/E07 elevated-back thrust distinct from the new floor bridge', () => {
    expect(exercises['single-leg-hip-thrust'].tips[0]).toContain('övre ryggen');
    expect(
      exerciseMetadata['single-leg-hip-thrust'].variants[0]?.equipment,
    ).toContainEqual({ type: 'step', count: 1 });
    expect(exercises['single-leg-floor-bridge'].tips[0]).toContain(
      'Ligg på rygg',
    );
    expect(exercises['single-leg-floor-bridge'].tips[2]).toContain(
      '2 sekunder',
    );
    expect(exerciseMetadata['single-leg-floor-bridge'].holdSeconds).toBe(2);
    expect(
      exerciseMetadata['single-leg-floor-bridge'].variants[0]?.equipment,
    ).toEqual([{ type: 'bodyweight', count: 1 }]);
  });
});
