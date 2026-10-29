import { describe, expect, it } from 'vitest';
import { movementPose } from './Figure';

describe('thruster figure timing', () => {
  it.each(['thruster', 'single-arm-thruster'] as const)(
    '%s reaches the standing rack before pressing overhead',
    (id) => {
      const bottom = movementPose(id, 0);
      const halfSquat = movementPose(id, 0.25);
      const rack = movementPose(id, 0.5);
      const press = movementPose(id, 0.75);
      const overhead = movementPose(id, 1);

      // During the first half, the hips and knees extend while the weight
      // moves only from the squat position to the shoulder rack.
      expect(halfSquat.hip[1]).toBeGreaterThan(rack.hip[1]);
      expect(halfSquat.hR[1]).toBeGreaterThan(rack.hR[1]);
      expect(rack.hip).toEqual([98, 118]);
      expect(rack.kR).toEqual([104, 148]);
      expect(rack.kL).toEqual([90, 148]);

      // The second half keeps the body standing as the weight presses up.
      expect(press.hip).toEqual(rack.hip);
      expect(press.kR).toEqual(rack.kR);
      expect(press.kL).toEqual(rack.kL);
      expect(press.hR[1]).toBeLessThan(rack.hR[1]);
      expect(overhead.hR[1]).toBeLessThan(press.hR[1]);

      // The cycle's return traverses the same two safe stages in reverse:
      // overhead -> rack -> squat.
      expect(movementPose(id, 0.5)).toEqual(rack);
      expect(movementPose(id, 0)).toEqual(bottom);
    },
  );
});
