import { describe, expect, it } from 'vitest';
import { checkPoseGeometry } from './keyframes';
import { figures, type Pose } from './poses';
import { SQUAT_FAMILY_IDS, squatFamilyPose } from './squatFamilyKeyframes';

const dist = (a: readonly number[], b: readonly number[]) =>
  Math.hypot((a[0] ?? 0) - (b[0] ?? 0), (a[1] ?? 0) - (b[1] ?? 0));

describe('squat family keyframes', () => {
  it.each(SQUAT_FAMILY_IDS)('%s passes the geometry gate mid-rep', (id) => {
    const frame = squatFamilyPose(id, 0.5);
    expect(
      checkPoseGeometry([frame], {
        floorY: 178,
        viewBox: [14, 20, 164, 168],
        props: figures[id].props,
        minHeadClearance: 9,
      }),
    ).toEqual([]);
  });
  it.each(SQUAT_FAMILY_IDS)(
    '%s keeps its ankles fixed and reaches a deep squat',
    (id) => {
      const first = squatFamilyPose(id, 0);
      for (let i = 0; i <= 40; i++) {
        const p: Pose = squatFamilyPose(id, i / 40);
        expect(p.aR).toEqual(first.aR);
        expect(p.aL).toEqual(first.aL);
      }
      const bottom =
        id === 'goblet-squat' || id === 'kettlebell-goblet-squat'
          ? squatFamilyPose(id, 1)
          : squatFamilyPose(id, 0);
      expect(bottom.hip[1]).toBeGreaterThanOrEqual(bottom.kR[1] - 10);
    },
  );
  it.each(SQUAT_FAMILY_IDS)('%s keeps every segment length', (id) => {
    const frames = Array.from({ length: 41 }, (_, i) =>
      squatFamilyPose(id, i / 40),
    );
    for (const [a, b] of [
      ['hip', 'kR'],
      ['kR', 'aR'],
      ['hip', 'kL'],
      ['neck', 'hip'],
    ] as const) {
      const lengths = frames.map((f) => dist(f[a], f[b]));
      expect(Math.max(...lengths) - Math.min(...lengths)).toBeLessThan(0.05);
    }
  });
  it('thruster: rack hand sits 13 right of and 2 above the neck, and overhead is above the head', () => {
    const rack = squatFamilyPose('thruster', 0.5);
    expect(dist(rack.hR, [rack.neck[0] + 13, rack.neck[1] - 2])).toBeLessThan(
      0.5,
    );
    const top = squatFamilyPose('thruster', 1);
    expect(top.hR[1]).toBeLessThanOrEqual(top.head[1] - 15);
  });
  it('kettlebell goblet squat shares one grip point', () => {
    const p = squatFamilyPose('kettlebell-goblet-squat', 0.7);
    expect(p.hR).toEqual(p.hL);
    expect(p.eR).toEqual(p.eL);
  });
});
