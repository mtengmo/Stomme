import { describe, expect, it } from 'vitest';
import { movementPose, proneOnForearmsReducedFrames } from './Figure';
import { checkPoseGeometry } from './keyframes';
import { figures, type Pose } from './poses';
import { proneRelaxedPose } from './rehabPoses';
import {
  SQUAT_CURL_BOTTOM,
  SQUAT_CURL_TOP,
  SQUAT_FAMILY_IDS,
  squatFamilyPose,
  squatFamilyStills,
  THRUSTER_PRESS_START,
} from './squatFamilyKeyframes';

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
          : id === 'squat-curl'
            ? squatFamilyPose(id, SQUAT_CURL_BOTTOM)
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
    const rack = squatFamilyPose('thruster', THRUSTER_PRESS_START);
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

  it('squat-curl starts standing with hanging arms and loops without a seam', () => {
    const start = squatFamilyPose('squat-curl', 0);
    expect(start.hip).toEqual([98, 118]);
    // Hands hang below the elbows, which sit below the neck.
    expect(start.hR[1]).toBeGreaterThan(start.eR[1] + 15);
    expect(squatFamilyPose('squat-curl', 1)).toEqual(start);
  });
  it('squat-curl curls only while rising and lowers the dumbbells standing', () => {
    const bottom = squatFamilyPose('squat-curl', SQUAT_CURL_BOTTOM);
    const top = squatFamilyPose('squat-curl', SQUAT_CURL_TOP);
    expect(bottom.hR[1]).toBeGreaterThan(bottom.eR[1] + 15);
    expect(top.hip).toEqual([98, 118]);
    expect(top.hR[1]).toBeLessThan(top.eR[1]);
    // On the way back the arms extend while the legs stay straight.
    for (let i = 0; i <= 20; i++) {
      const p = squatFamilyPose('squat-curl', 0.75 + (0.15 * i) / 20);
      expect(p.hip).toEqual([98, 118]);
      expect(p.kR).toEqual(start().kR);
    }
    const lowering = squatFamilyPose('squat-curl', 0.82);
    expect(lowering.hR[1]).toBeGreaterThan(top.hR[1]);
    expect(lowering.hR[1]).toBeLessThan(start().hR[1]);
    expect(figures['squat-curl'].motion).toBe('sequence');
  });
  it('reduced-motion stills start standing and name the bottom', () => {
    expect(squatFamilyStills('goblet-squat')).toBeUndefined();
    for (const id of ['thruster', 'single-arm-thruster'] as const) {
      const stills = squatFamilyStills(id) ?? [];
      expect(stills[0]?.[0]).toBe('Start');
      const rack = movementPose(id, stills[0]?.[1] ?? -1);
      expect(dist(rack.hip, [98, 118])).toBeLessThan(2);
      expect(dist(rack.hR, [rack.neck[0] + 13, rack.neck[1] - 2])).toBeLessThan(
        0.5,
      );
      const bottom = movementPose(id, stills[1]?.[1] ?? -1);
      expect(stills[1]?.[0]).toBe('Botten');
      expect(bottom.hip[1]).toBeGreaterThan(rack.hip[1] + 15);
    }
    const curl = squatFamilyStills('squat-curl') ?? [];
    expect(curl.map(([label]) => label)).toEqual([
      'Start',
      'Botten',
      'Upp med curl',
    ]);
    expect(movementPose('squat-curl', curl[0]?.[1] ?? -1).hip).toEqual([
      98, 118,
    ]);
  });
  it('prone-on-forearms reduced stills show a relaxed lying pose and the forearm hold', () => {
    const [rest, hold] = proneOnForearmsReducedFrames();
    expect(rest[0]).toBe('Vila');
    expect(hold[0]).toBe('Håll');
    const flat = rest[1];
    expect(flat).toEqual(proneRelaxedPose());
    // Torso lies flat; the held pose lifts the chest well above it.
    expect(Math.abs(flat.neck[1] - flat.hip[1])).toBeLessThan(2);
    expect(hold[1].neck[1]).toBeLessThan(flat.neck[1] - 25);
    expect(dist(flat.neck, flat.hip)).toBeCloseTo(
      dist(hold[1].neck, hold[1].hip),
      1,
    );
    expect(dist(flat.neck, flat.eR)).toBeCloseTo(38, 1);
    expect(dist(flat.eR, flat.hR)).toBeCloseTo(22, 1);
  });
});

const start = () => squatFamilyPose('squat-curl', 0);
