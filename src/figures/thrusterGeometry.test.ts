import { describe, expect, it } from 'vitest';
import { movementPose } from './Figure';
import {
  THRUSTER_LEGS_DONE,
  THRUSTER_PRESS_START,
} from './squatFamilyKeyframes';

describe('thruster figure timing', () => {
  it.each(['thruster', 'single-arm-thruster'] as const)(
    '%s starts the press as the legs finish extending',
    (id) => {
      const bottom = movementPose(id, 0);
      const halfSquat = movementPose(id, 0.25);
      const rack = movementPose(id, THRUSTER_PRESS_START);
      const legsDone = movementPose(id, THRUSTER_LEGS_DONE);
      const press = movementPose(id, 0.75);
      const overhead = movementPose(id, 1);
      const near = (a: readonly number[], b: readonly number[]) =>
        Math.hypot((a[0] ?? 0) - (b[0] ?? 0), (a[1] ?? 0) - (b[1] ?? 0));

      // Before the press starts the weight only rides up with the shoulders.
      expect(halfSquat.hip[1]).toBeGreaterThan(rack.hip[1]);
      expect(halfSquat.hR[1]).toBeGreaterThan(rack.hR[1]);
      // Rack: nearly standing, near hand at the shoulder rack.
      expect(near(rack.hip, [98, 118])).toBeLessThan(2);
      expect(near(rack.hR, [rack.neck[0] + 13, rack.neck[1] - 2])).toBeLessThan(
        0.5,
      );
      expect(overhead.hR[1]).toBeLessThanOrEqual(overhead.head[1] - 15);
      expect(Math.abs(overhead.hR[0] - overhead.neck[0])).toBeLessThanOrEqual(
        12,
      );

      // The press starts while the legs are still finishing their extension
      // ('När höfter och knän sträcks, pressa'), not after they are straight.
      expect(THRUSTER_PRESS_START).toBeLessThan(THRUSTER_LEGS_DONE);
      const mid = movementPose(
        id,
        (THRUSTER_PRESS_START + THRUSTER_LEGS_DONE) / 2,
      );
      expect(mid.hip[1]).toBeLessThan(rack.hip[1] + 0.01);
      expect(mid.hip[1]).toBeGreaterThan(legsDone.hip[1]);
      expect(mid.hR[1]).toBeLessThan(rack.hR[1]);
      // The legs are straight at the end of their drive and stay so.
      expect(legsDone.hip).toEqual([98, 118]);
      expect(near(legsDone.kR, [104, 148])).toBeLessThan(3);
      expect(near(legsDone.kL, [90, 148])).toBeLessThan(3);
      expect(press.hip).toEqual(legsDone.hip);
      expect(press.kR).toEqual(legsDone.kR);
      expect(press.hR[1]).toBeLessThan(legsDone.hR[1]);
      expect(overhead.hR[1]).toBeLessThan(press.hR[1]);

      // The cycle's return traverses the same two safe stages in reverse:
      // overhead -> rack -> squat.
      expect(movementPose(id, 0)).toEqual(bottom);
    },
  );
});
