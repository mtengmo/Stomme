import { describe, expect, it } from 'vitest';
import { movementPose } from './movementPose';
import {
  type Body3,
  fitLengths,
  fromProfile,
  mirrorAbout,
  type ObliqueSpec,
  obliqueFrame,
  type P3,
  project,
  projectBody,
  type SegmentLengths,
  viewLengths,
} from './obliqueBody';
import { POSE_KEYS, type Pose } from './poses';

const dist = (a: readonly [number, number], b: readonly [number, number]) =>
  Math.hypot(a[0] - b[0], a[1] - b[1]);

const LENGTHS: SegmentLengths = {
  headNeck: 12,
  trunk: 40,
  upperArm: 15,
  forearm: 14,
  thigh: 30,
  shin: 28,
  foot: 8,
};

const segmentsOf = (pose: Pose, l: SegmentLengths) => [
  [dist(pose.head, pose.neck), l.headNeck],
  [dist(pose.neck, pose.hip), l.trunk],
  [dist(pose.neck, pose.eR), l.upperArm],
  [dist(pose.eR, pose.hR), l.forearm],
  [dist(pose.neck, pose.eL), l.upperArm],
  [dist(pose.eL, pose.hL), l.forearm],
  [dist(pose.hip, pose.kR), l.thigh],
  [dist(pose.kR, pose.aR), l.shin],
  [dist(pose.aR, pose.tR), l.foot],
  [dist(pose.hip, pose.kL), l.thigh],
  [dist(pose.kL, pose.aL), l.shin],
  [dist(pose.aL, pose.tL), l.foot],
];

/** A deliberately wrong-sized raw pose, so every mode has work to do. */
const RAW: Pose = {
  head: [30, 150],
  neck: [48, 160],
  hip: [100, 165],
  eR: [60, 150],
  hR: [75, 140],
  eL: [58, 172],
  hL: [70, 176],
  kR: [125, 150],
  aR: [150, 140],
  tR: [158, 142],
  kL: [128, 172],
  aL: [155, 176],
  tL: [162, 177],
};

describe('project', () => {
  it('is the identity at yaw 0 for z = 0', () => {
    for (const [x, y] of [
      [10, 20],
      [96, 100],
      [180, 170],
    ] as const)
      expect(project([x, y, 0], 0)).toEqual([x, y]);
  });

  it('never changes y at elevation 0, whatever the yaw and depth', () => {
    for (const yaw of [-60, -35, 0, 35, 90])
      for (const z of [-12, 0, 7, 20])
        expect(project([40, 123.5, z], yaw)[1]).toBe(123.5);
  });

  it('shifts y by exactly z * sin(elev) and never depends on x', () => {
    for (const elev of [10, 25, 40])
      for (const z of [-13, 0, 7, 18]) {
        const a = project([40, 120, z], 35, elev);
        const b = project([170, 120, z], 35, elev);
        expect(a[1]).toBeCloseTo(120 + z * Math.sin((elev * Math.PI) / 180), 9);
        expect(b[1]).toBe(a[1]);
      }
  });

  it('shifts the camera-near side (z > 0) against the yaw direction', () => {
    const near = project([100, 100, 10], 35);
    const far = project([100, 100, -10], 35);
    expect(near[0]).toBeLessThan(far[0]);
  });
});

describe('fitLengths', () => {
  it.each([['free'], ['straight'], ['pinned']] as const)(
    'keeps every segment at its exact length in %s mode',
    (mode) => {
      const pose = fitLengths(RAW, LENGTHS, {
        armR: mode,
        armL: mode,
        legR: mode,
        legL: mode,
      });
      for (const [actual, expected] of segmentsOf(pose, LENGTHS))
        expect(actual).toBeCloseTo(expected as number, 6);
      expect(pose.hip).toEqual(RAW.hip);
    },
  );

  it('draws a straight limb as one line of length L1 + L2', () => {
    const pose = fitLengths(RAW, LENGTHS, {
      armR: 'free',
      armL: 'free',
      legR: 'straight',
      legL: 'straight',
    });
    expect(dist(pose.hip, pose.aR)).toBeCloseTo(
      LENGTHS.thigh + LENGTHS.shin,
      6,
    );
    expect(dist(pose.hip, pose.aL)).toBeCloseTo(
      LENGTHS.thigh + LENGTHS.shin,
      6,
    );
  });

  it('puts a pinned end on a reachable contact point', () => {
    const target: [number, number] = [150, 168];
    const raw = { ...RAW, aR: target };
    const pose = fitLengths(raw, LENGTHS, {
      armR: 'free',
      armL: 'free',
      legR: 'pinned',
      legL: 'free',
    });
    expect(pose.aR[0]).toBeCloseTo(target[0], 6);
    expect(pose.aR[1]).toBeCloseTo(target[1], 6);
  });

  it('picks the knee side nearest the raw knee', () => {
    for (const side of [-1, 1]) {
      const raw: Pose = {
        ...RAW,
        aR: [150, 165],
        kR: [125, 165 + side * 14],
      };
      const pose = fitLengths(raw, LENGTHS, {
        armR: 'free',
        armL: 'free',
        legR: 'pinned',
        legL: 'free',
      });
      expect(Math.sign(pose.kR[1] - 165)).toBe(side);
    }
  });

  it('clamps an unreachable pinned target without changing lengths', () => {
    const raw = { ...RAW, aR: [260, 165] as const };
    const pose = fitLengths(raw, LENGTHS, {
      armR: 'free',
      armL: 'free',
      legR: 'pinned',
      legL: 'free',
    });
    expect(dist(pose.hip, pose.kR)).toBeCloseTo(LENGTHS.thigh, 6);
    expect(dist(pose.kR, pose.aR)).toBeCloseTo(LENGTHS.shin, 6);
  });
});

const TEST_SPEC: ObliqueSpec = {
  profile: 'prone-leg-raise',
  yawDeg: 35,
  near: 'working',
  body: (t: number): Body3 => fromProfile(movementPose('prone-leg-raise', t)),
  limbs: { armR: 'free', armL: 'free', legR: 'free', legL: 'free' },
  props: () => [{ type: 'mat', x1: 16, x2: 184 }],
};

describe('viewLengths', () => {
  const lengths = viewLengths(TEST_SPEC);

  it('never exceeds the profile segment lengths', () => {
    for (let i = 0; i <= 20; i++) {
      const p = movementPose('prone-leg-raise', i / 20);
      const profile = (side: 'R' | 'L') => ({
        headNeck: dist(p.head, p.neck),
        trunk: dist(p.neck, p.hip),
        upperArm: dist(p.neck, p[`e${side}`]),
        forearm: dist(p[`e${side}`], p[`h${side}`]),
        thigh: dist(p.hip, p[`k${side}`]),
        shin: dist(p[`k${side}`], p[`a${side}`]),
        foot: dist(p[`a${side}`], p[`t${side}`]),
      });
      for (const side of ['R', 'L'] as const)
        for (const [key, value] of Object.entries(profile(side)))
          expect(lengths[key as keyof SegmentLengths]).toBeLessThanOrEqual(
            value + 1e-9,
          );
    }
  });

  it('is shared by the right and left limbs', () => {
    for (let i = 0; i <= 10; i++) {
      const { pose } = obliqueFrame(TEST_SPEC, i / 10, 'right');
      expect(dist(pose.hip, pose.kR)).toBeCloseTo(dist(pose.hip, pose.kL), 9);
      expect(dist(pose.neck, pose.eR)).toBeCloseTo(dist(pose.neck, pose.eL), 9);
    }
  });

  it('is cached per spec', () => {
    expect(viewLengths(TEST_SPEC)).toBe(lengths);
  });
});

describe('mirrorAbout', () => {
  it('swaps right and left and flips x about the axis', () => {
    const mirrored = mirrorAbout(RAW, 192);
    expect(mirrored.kR).toEqual([192 - RAW.kL[0], RAW.kL[1]]);
    expect(mirrored.kL).toEqual([192 - RAW.kR[0], RAW.kR[1]]);
    expect(mirrored.eR).toEqual([192 - RAW.eL[0], RAW.eL[1]]);
    expect(mirrored.tL).toEqual([192 - RAW.tR[0], RAW.tR[1]]);
    expect(mirrored.hip).toEqual([192 - RAW.hip[0], RAW.hip[1]]);
  });

  it('is its own inverse', () => {
    const twice = mirrorAbout(mirrorAbout(RAW, 192), 192);
    for (const k of POSE_KEYS) expect(twice[k]).toEqual(RAW[k]);
  });
});

describe('obliqueFrame', () => {
  it('mirrors the left side of the frame, props and near side included', () => {
    const right = obliqueFrame(TEST_SPEC, 0.5, 'right');
    const left = obliqueFrame(TEST_SPEC, 0.5, 'left');
    expect(right.near).toBe('R');
    expect(left.near).toBe('L');
    for (const k of POSE_KEYS) {
      const mirror = mirrorAbout(right.pose, 192);
      expect(left.pose[k][0]).toBeCloseTo(mirror[k][0], 9);
      expect(left.pose[k][1]).toBeCloseTo(mirror[k][1], 9);
    }
    expect(left.props).toEqual([{ type: 'mat', x1: 8, x2: 176 }]);
    expect(left.pelvis[0][0]).toBeCloseTo(192 - right.pelvis[0][0], 9);
  });

  it('projects the raw body with only a yaw', () => {
    const body = TEST_SPEC.body(0.3);
    const raw = projectBody(body, 35);
    for (const k of POSE_KEYS) expect(raw[k][1]).toBe((body[k] as P3)[1]);
  });
});

describe('surfaces', () => {
  const spec: ObliqueSpec = {
    ...TEST_SPEC,
    elevDeg: 25,
    surfaces: () => [
      {
        kind: 'mat',
        corners: [
          [16, 177, -18],
          [184, 177, -18],
          [184, 177, 18],
          [16, 177, 18],
        ],
      },
    ],
  };

  it('are projected like the body (yaw and depth shear)', () => {
    const { surfaces } = obliqueFrame(spec, 0, 'right');
    expect(surfaces[0]?.kind).toBe('mat');
    expect(surfaces[0]?.pts[0]).toEqual(project([16, 177, -18], 0 + 35, 25));
    expect(surfaces[0]?.pts[2]).toEqual(project([184, 177, 18], 35, 25));
  });

  it('are mirrored about 192 on the left side', () => {
    const right = obliqueFrame(spec, 0, 'right').surfaces[0];
    const left = obliqueFrame(spec, 0, 'left').surfaces[0];
    right?.pts.forEach((pt, i) => {
      expect(left?.pts[i]?.[0]).toBeCloseTo(192 - pt[0], 9);
      expect(left?.pts[i]?.[1]).toBeCloseTo(pt[1], 9);
    });
  });
});
