import { describe, expect, it } from 'vitest';
import { bodyweightIds } from '../content/bodyweightExercises';
import { movementPose } from './Figure';
import type { Pt } from './lerp';
import { figures, POSE_KEYS } from './poses';

const distance = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
describe('bodyweight movement paths', () => {
  it.each(bodyweightIds)(
    '%s stays finite and above the floor throughout the movement',
    (id) => {
      for (let n = 0; n <= 80; n++) {
        const p = movementPose(id, n / 80);
        for (const key of POSE_KEYS) {
          expect(Number.isFinite(p[key][0]) && Number.isFinite(p[key][1])).toBe(
            true,
          );
          expect(p[key][1], `${id} ${key} phase ${n / 80}`).toBeLessThanOrEqual(
            178,
          );
        }
      }
    },
  );
  it('keeps push-up hand/toe contacts and the rigid trunk', () => {
    const start = movementPose('push-up', 0);
    for (let n = 0; n <= 40; n++) {
      const p = movementPose('push-up', n / 40);
      expect(p.hR).toEqual(start.hR);
      expect(p.aR).toEqual(start.aR);
      expect(distance(p.neck, p.hip)).toBeCloseTo(
        distance(start.neck, start.hip),
        8,
      );
    }
    expect(movementPose('push-up', 1).neck[1]).toBeGreaterThan(start.neck[1]);
  });
  it.each(['pull-up', 'chin-up', 'parallel-dip'] as const)(
    '%s retains both apparatus contacts',
    (id) => {
      const start = movementPose(id, 0);
      for (let n = 0; n <= 40; n++) {
        const p = movementPose(id, n / 40);
        expect(p.hR).toEqual(start.hR);
        expect(p.hL).toEqual(start.hL);
        expect(p.aR[1]).toBeLessThan(178);
      }
    },
  );
  it('jumps through continuous, constant-length thighs and shins with alternating front legs', () => {
    const first = movementPose('jumping-lunge', 0),
      last = movementPose('jumping-lunge', 1);
    expect(first.aR[0]).toBeGreaterThan(first.aL[0]);
    expect(last.aR[0]).toBeLessThan(last.aL[0]);
    for (let n = 0; n <= 80; n++) {
      const p = movementPose('jumping-lunge', n / 80);
      expect(distance(p.hip, p.kR)).toBeCloseTo(36, 8);
      expect(distance(p.kR, p.aR)).toBeCloseTo(34, 8);
      if (n > 0)
        expect(
          distance(p.kR, movementPose('jumping-lunge', (n - 1) / 80).kR),
        ).toBeLessThan(5);
    }
  });
  it('burpee has an ordered arm bend and airborne phase then returns to standing', () => {
    expect(figures.burpee.motion).toBe('sequence');
    expect(movementPose('burpee', 0)).toEqual(movementPose('burpee', 1));
    expect(movementPose('burpee', 0.375).neck[1]).toBeGreaterThan(
      movementPose('burpee', 0.25).neck[1],
    );
    expect(movementPose('burpee', 0.875).aR[1]).toBeLessThan(174);
  });
  it('keeps the climber upper body still while each knee travels towards the chest', () => {
    const first = movementPose('mountain-climber', 0);
    const right = movementPose('mountain-climber', 0.25),
      left = movementPose('mountain-climber', 0.75);
    expect(right.neck).toEqual(first.neck);
    expect(left.hR).toEqual(first.hR);
    expect(right.kR[0]).toBeLessThan(first.hip[0]);
    expect(left.kL[0]).toBeLessThan(first.hip[0]);
  });
});
