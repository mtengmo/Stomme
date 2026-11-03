import { describe, expect, it } from 'vitest';
import { applyEquipmentPose } from './equipmentPose';
import { movementPose } from './Figure';
import {
  HINGE_FAMILY_IDS,
  hingeFamilyPose,
  isHingeFamily,
} from './hingeFamilyKeyframes';
import { checkPoseGeometry } from './keyframes';
import { figures, type Pose } from './poses';

const dist = (a: readonly number[], b: readonly number[]) =>
  Math.hypot((a[0] ?? 0) - (b[0] ?? 0), (a[1] ?? 0) - (b[1] ?? 0));

const SEGMENTS = [
  ['head', 'neck'],
  ['neck', 'hip'],
  ['neck', 'eR'],
  ['eR', 'hR'],
  ['neck', 'eL'],
  ['eL', 'hL'],
  ['hip', 'kR'],
  ['kR', 'aR'],
  ['hip', 'kL'],
  ['kL', 'aL'],
] as const;

const sweep = (make: (t: number) => Pose): Pose[] =>
  Array.from({ length: 81 }, (_, i) => make(i / 80));

describe('hip hinge family (W9: kettlebell deadlift, dumbbell RDL)', () => {
  it('recognises exactly the two hinge exercises', () => {
    expect([...HINGE_FAMILY_IDS]).toEqual([
      'dumbbell-rdl',
      'kettlebell-deadlift',
    ]);
    expect(isHingeFamily('dumbbell-rdl')).toBe(true);
    expect(isHingeFamily('goblet-squat')).toBe(false);
  });

  it.each(HINGE_FAMILY_IDS)(
    '%s keeps both ankles on the floor throughout',
    (id) => {
      const first = movementPose(id, 0);
      for (const p of sweep((t) => movementPose(id, t))) {
        expect(p.aR).toEqual(first.aR);
        expect(p.aL).toEqual(first.aL);
        expect(p.aR[1]).toBe(174);
        expect(p.aL[1]).toBe(174);
      }
    },
  );

  it.each(HINGE_FAMILY_IDS)(
    '%s keeps every segment length constant (thighs, shins, torso, arms)',
    (id) => {
      const frames = sweep((t) => movementPose(id, t));
      for (const [a, b] of SEGMENTS) {
        const lengths = frames.map((f) => dist(f[a], f[b]));
        expect(Math.max(...lengths) - Math.min(...lengths)).toBeLessThan(0.05);
      }
      // Both thighs and both shins are one length each (far knee via IK too).
      const f = frames[40] as Pose;
      expect(dist(f.hip, f.kL)).toBeCloseTo(dist(f.hip, f.kR), 6);
      expect(dist(f.kL, f.aL)).toBeCloseTo(dist(f.kR, f.aR), 6);
    },
  );

  it.each(HINGE_FAMILY_IDS)(
    '%s passes the geometry gate over a full out-and-back loop',
    (id) => {
      const out = sweep((t) => movementPose(id, t));
      const loop = [...out, ...out.slice(0, -1).reverse()];
      expect(
        checkPoseGeometry(loop, {
          floorY: 178,
          viewBox: [14, 20, 164, 168],
          props: figures[id].props,
          minHeadClearance: 9,
        }),
      ).toEqual([]);
    },
  );

  it.each(HINGE_FAMILY_IDS)(
    '%s returns along the same path (no snap on the way back)',
    (id) => {
      let prev = movementPose(id, 0);
      for (let i = 1; i <= 100; i++) {
        const cur = movementPose(id, i / 100);
        for (const k of ['neck', 'hip', 'kR', 'kL', 'hR'] as const)
          expect(dist(cur[k], prev[k])).toBeLessThan(2.5);
        prev = cur;
      }
      expect(figures[id].start).toEqual(movementPose(id, 0));
      expect(figures[id].end).toEqual(movementPose(id, 1));
    },
  );

  it('dumbbell RDL starts standing and hinges back at the hip', () => {
    const start = hingeFamilyPose('dumbbell-rdl', 0);
    const end = hingeFamilyPose('dumbbell-rdl', 1);
    expect(start.hip).toEqual([98, 118]);
    expect(Math.abs(start.neck[0] - start.hip[0])).toBeLessThan(5);
    // The hip travels back (away from the facing direction) and the trunk leans forward.
    expect(end.hip[0]).toBeLessThan(start.hip[0] - 10);
    expect(end.neck[0]).toBeGreaterThan(end.hip[0] + 25);
    // The weights hang below the shoulders, clear of the floor.
    expect(end.hR[1]).toBeGreaterThan(end.neck[1] + 35);
    expect(end.hR[1]).toBeLessThan(160);
  });

  it('kettlebell deadlift starts with the bell low and ends standing with the hands at the thigh', () => {
    const start = hingeFamilyPose('kettlebell-deadlift', 0);
    const end = hingeFamilyPose('kettlebell-deadlift', 1);
    expect(end.hip).toEqual([98, 118]);
    expect(dist(end.hR, [102, 121])).toBeLessThan(2);
    expect(start.hR[1]).toBeGreaterThan(end.hR[1] + 25);
    // One bell, one grip point.
    for (const p of [start, end]) {
      expect(p.hR).toEqual(p.hL);
      expect(p.eR).toEqual(p.eL);
    }
    // Setup: hips lower than standing, bell still above the floor line.
    expect(start.hip[1]).toBeGreaterThan(end.hip[1] + 12);
    expect(start.hR[1]).toBeLessThan(160);
  });

  it('dumbbell RDL with a kettlebell shares one grip without changing any length', () => {
    for (let i = 0; i <= 20; i++) {
      const raw = movementPose('dumbbell-rdl', i / 20);
      const { p } = applyEquipmentPose('dumbbell-rdl', raw, 'kettlebell');
      expect(p.hR).toEqual(p.hL);
      expect(p.eR).toEqual(p.eL);
      expect(dist(p.neck, p.eR)).toBeCloseTo(dist(raw.neck, raw.eR), 8);
      expect(dist(p.eR, p.hR)).toBeCloseTo(dist(raw.eR, raw.hR), 8);
      expect(p.aR).toEqual(raw.aR);
      expect(p.kR).toEqual(raw.kR);
    }
  });
});
