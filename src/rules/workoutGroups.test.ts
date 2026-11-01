import { describe, expect, it } from 'vitest';
import { groupOf, workoutMuscles } from './workoutGroups';

describe('workout groups', () => {
  it.each([
    { label: 'press-only', exerciseIds: ['floor-press'], expected: 'push' },
    { label: 'pull-only', exerciseIds: ['supported-row'], expected: 'pull' },
    {
      label: 'leg-region muscle including hip flexors',
      exerciseIds: ['kneeling-hip-flexor-stretch'],
      expected: 'legs',
    },
    {
      label: 'mixed upper body',
      exerciseIds: ['floor-press', 'supported-row'],
      expected: 'upper',
    },
    {
      label: 'upper and lower body',
      exerciseIds: ['floor-press', 'goblet-chair-squat'],
      expected: 'full',
    },
    { label: 'core only', exerciseIds: ['dead-bug'], expected: 'other' },
    { label: 'empty workout', exerciseIds: [], expected: 'other' },
  ] as const)('groups $label as $expected', ({ exerciseIds, expected }) => {
    expect(groupOf({ exerciseIds: [...exerciseIds] })).toBe(expected);
  });

  it.each(['push', 'pull', 'legs', 'upper', 'full', 'other'] as const)(
    'honors an explicit %s group',
    (group) => {
      expect(groupOf({ exerciseIds: ['floor-press'], group })).toBe(group);
    },
  );

  it('deduplicates primary muscles across exercises and excludes core', () => {
    expect(
      workoutMuscles({
        exerciseIds: ['bird-dog', 'supported-row', 'bird-dog'],
      }),
    ).toEqual(['back']);
  });

  it('ignores secondary muscles when grouping', () => {
    expect(groupOf({ exerciseIds: ['supported-row', 'farmer-carry'] })).toBe(
      'pull',
    );
  });
});
