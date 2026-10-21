import { describe, expect, it } from 'vitest';
import { movementPose } from './Figure';
import { figures } from './poses';

const distance = (a: readonly number[], b: readonly number[]) =>
  Math.hypot((a[0] ?? 0) - (b[0] ?? 0), (a[1] ?? 0) - (b[1] ?? 0));

describe('constrained leg interpolation', () => {
  it('keeps both E03 leg segments stable through the hinge', () => {
    const samples = [0, 0.2, 0.4, 0.6, 0.8, 1].map((phase) =>
      movementPose('single-leg-rdl', phase),
    );
    for (const side of ['R', 'L'] as const) {
      const knee = side === 'R' ? 'kR' : 'kL';
      const ankle = side === 'R' ? 'aR' : 'aL';
      const upper = samples.map((pose) => distance(pose.hip, pose[knee]));
      const lower = samples.map((pose) => distance(pose[knee], pose[ankle]));
      expect(Math.max(...upper) - Math.min(...upper)).toBeLessThan(0.1);
      expect(Math.max(...lower) - Math.min(...lower)).toBeLessThan(0.1);
    }
  });
  it.each([
    'step-up',
    'split-squat',
    'reverse-lunge',
    'forward-lunge',
  ] as const)(
    'keeps the shin and thigh lengths stable through %s',
    (exerciseId) => {
      const samples = [0.08, 0.2, 0.36, 0.64, 0.8, 0.92].map((phase) =>
        movementPose(exerciseId, phase),
      );
      for (const side of ['R', 'L'] as const) {
        const knee = side === 'R' ? 'kR' : 'kL';
        const ankle = side === 'R' ? 'aR' : 'aL';
        const upper = samples.map((pose) => distance(pose.hip, pose[knee]));
        const lower = samples.map((pose) => distance(pose[knee], pose[ankle]));
        for (const length of upper)
          expect(length).toBeCloseTo(upper[0] ?? 0, 5);
        for (const length of lower)
          expect(length).toBeCloseTo(lower[0] ?? 0, 5);
      }
    },
  );

  it.each(['reverse-lunge', 'forward-lunge'] as const)(
    'moves continuously through the authored middle of %s',
    (exerciseId) => {
      const before = movementPose(exerciseId, 0.49999);
      const middle = movementPose(exerciseId, 0.5);
      const after = movementPose(exerciseId, 0.50001);
      for (const key of ['kR', 'aR', 'kL', 'aL'] as const) {
        expect(distance(before[key], middle[key])).toBeLessThan(0.02);
        expect(distance(after[key], middle[key])).toBeLessThan(0.02);
      }
    },
  );

  it('keeps both split-squat feet planted while the knees travel', () => {
    const start = figures['split-squat'].start;
    for (const phase of [0, 0.2, 0.5, 0.8, 1]) {
      const pose = movementPose('split-squat', phase);
      expect(pose.aR).toEqual(start.aR);
      expect(pose.tR).toEqual(start.tR);
      expect(pose.aL).toEqual(start.aL);
      expect(pose.tL).toEqual(start.tL);
    }
    expect(movementPose('split-squat', 1).kR).not.toEqual(start.kR);
    expect(movementPose('split-squat', 1).kL).not.toEqual(start.kL);
  });
});
