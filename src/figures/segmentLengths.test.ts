import { describe, expect, it } from 'vitest';
import type { ExerciseId } from '../domain/types';
import { applyEquipmentPose } from './equipmentPose';
import { movementPose, stillFramePhase } from './Figure';
import {
  frontMovementPose,
  obliqueMovementPose,
  SPLIT_REAR_LINE_Y,
} from './frontViews';
import type { Pt } from './lerp';
import { figures, type Pose, type PoseKey } from './poses';
import { arm, bone, keepSegmentLengths, leg } from './segmentLengths';

const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const PHASES = Array.from({ length: 41 }, (_, i) => i / 40);
/** Pixel tolerance for "same length": keyframes are authored to 0.1. */
const TOL = 0.12;

const spread = (values: number[]) => Math.max(...values) - Math.min(...values);
const length = (pose: Pose, a: PoseKey, b: PoseKey) => dist(pose[a], pose[b]);

const SEGMENTS: readonly (readonly [PoseKey, PoseKey])[] = [
  ['head', 'neck'],
  ['neck', 'hip'],
  ['neck', 'eR'],
  ['eR', 'hR'],
  ['neck', 'eL'],
  ['eL', 'hL'],
  ['hip', 'kR'],
  ['kR', 'aR'],
  ['aR', 'tR'],
  ['hip', 'kL'],
  ['kL', 'aL'],
  ['aL', 'tL'],
];

function drift(poses: Pose[], a: PoseKey, b: PoseKey) {
  return spread(poses.map((p) => length(p, a, b)));
}

describe('keepSegmentLengths', () => {
  const ref = {
    head: [0, -14],
    neck: [0, 0],
    hip: [0, 40],
    eR: [0, 10],
    hR: [0, 20],
    eL: [0, 10],
    hL: [0, 20],
    kR: [0, 70],
    aR: [0, 100],
    tR: [6, 100],
    kL: [0, 70],
    aL: [0, 100],
    tL: [6, 100],
  } as unknown as Pose;

  it('rotates a bone to the reference length and moves its followers rigidly', () => {
    const interpolated: Pose = {
      ...ref,
      neck: [20, 10],
      head: [22, -4],
      hR: [20, 30],
    };
    const out = keepSegmentLengths(
      interpolated,
      [ref],
      [bone('hip', 'neck', ['head', 'hR'])],
    );
    expect(length(out, 'hip', 'neck')).toBeCloseTo(40, 6);
    // Direction is that of the interpolated pose (hip -> neck).
    const raw = dist([0, 40], [20, 10]);
    expect(out.neck[0]).toBeCloseTo((20 / raw) * 40, 6);
    // Followers keep their offset to the neck.
    expect(out.head[0] - out.neck[0]).toBeCloseTo(2, 6);
    expect(out.hR[1] - out.neck[1]).toBeCloseTo(20, 6);
  });

  it('solves a limb with constant segments and clamps an unreachable end', () => {
    const interpolated: Pose = { ...ref, hR: [8, 12], eR: [4, 5] };
    const out = keepSegmentLengths(
      interpolated,
      [ref],
      [arm('R', { bend: 1 })],
    );
    expect(length(out, 'neck', 'eR')).toBeCloseTo(10, 6);
    expect(length(out, 'eR', 'hR')).toBeCloseTo(10, 6);
    const far = keepSegmentLengths({ ...ref, hR: [50, 0] }, [ref], [arm('R')]);
    expect(length(far, 'neck', 'hR')).toBeCloseTo(20, 6);
  });

  it('swings a straight limb at full reach and infers the bend from the references', () => {
    const swung = keepSegmentLengths(
      { ...ref, hR: [3, 6] },
      [ref],
      [arm('R', { straight: true })],
    );
    expect(length(swung, 'neck', 'hR')).toBeCloseTo(20, 6);
    expect(length(swung, 'neck', 'eR')).toBeCloseTo(10, 6);
    const bent: Pose = { ...ref, kL: [10, 70], aL: [10, 100] };
    const knee = keepSegmentLengths(
      { ...bent, aL: [30, 80] },
      [bent],
      [leg('L')],
    );
    // The knee stays on the side of the hip-ankle line it started on.
    const cross = (p: Pose) =>
      (p.aL[0] - p.hip[0]) * (p.kL[1] - p.hip[1]) -
      (p.aL[1] - p.hip[1]) * (p.kL[0] - p.hip[0]);
    expect(Math.sign(cross(knee))).toBe(Math.sign(cross(bent)));
  });
});

/** Segments that must keep one length through the whole loop, per exercise. */
const CONSTANT: Partial<
  Record<ExerciseId, readonly (readonly [PoseKey, PoseKey])[]>
> = {
  // Legs are solved by constrainLegInterpolation (constrainedLegs.test.ts).
  'single-leg-rdl': [
    ['head', 'neck'],
    ['neck', 'hip'],
    ['neck', 'eR'],
    ['eR', 'hR'],
    ['neck', 'eL'],
    ['eL', 'hL'],
  ],
  'dead-bug': SEGMENTS,
  'bird-dog': SEGMENTS,
  'side-plank': SEGMENTS,
};

describe.each(Object.keys(CONSTANT) as ExerciseId[])(
  'constant segment lengths: %s',
  (id) => {
    const spec = figures[id];
    it('keeps every listed segment at one length through the loop', () => {
      const poses = PHASES.map((t) => movementPose(id, t));
      for (const [a, b] of CONSTANT[id] ?? [])
        expect(drift(poses, a, b), `${a}-${b}`).toBeLessThan(TOL);
    });
    it('authored keyframes agree on the segment lengths', () => {
      for (const [a, b] of CONSTANT[id] ?? [])
        expect(
          Math.abs(length(spec.start, a, b) - length(spec.end, a, b)),
          `${a}-${b}`,
        ).toBeLessThan(TOL);
    });
    it('reproduces the authored start and end poses', () => {
      for (const [phase, authored] of [
        [0, spec.start],
        [1, spec.end],
      ] as const) {
        const drawn = movementPose(id, phase);
        for (const key of Object.keys(authored) as PoseKey[])
          if (id !== 'single-leg-rdl' || !/^[kat][RL]$/.test(key))
            expect(
              dist(drawn[key], authored[key]),
              `${key}@${phase}`,
            ).toBeLessThan(0.2);
      }
    });
  },
);

describe('E03 single-leg RDL', () => {
  it.each([undefined, 'dumbbell', 'kettlebell'] as const)(
    'keeps the trunk at one length in %s',
    (equipment) => {
      const trunk = PHASES.map(
        (t) =>
          applyEquipmentPose(
            'single-leg-rdl',
            movementPose('single-leg-rdl', t),
            equipment,
          ).p,
      );
      expect(drift(trunk, 'neck', 'hip')).toBeLessThan(TOL);
      expect(drift(trunk, 'head', 'neck')).toBeLessThan(TOL);
    },
  );
});

describe('E04 dead bug', () => {
  it('reaches with one straight arm and the opposite straight leg', () => {
    const end = movementPose('dead-bug', 1);
    expect(length(end, 'neck', 'hR')).toBeCloseTo(40, 0);
    expect(length(end, 'hip', 'aL')).toBeCloseTo(58, 0);
    // The far arm and the near leg keep their start pose.
    const start = movementPose('dead-bug', 0);
    expect(end.hL).toEqual(start.hL);
    expect(end.aR).toEqual(start.aR);
  });
  it('keeps the back on the mat and the extended leg off it', () => {
    for (const t of PHASES) {
      const p = movementPose('dead-bug', t);
      for (const key of ['hip', 'neck', 'head', 'aL', 'kL', 'tL'] as const)
        expect(p[key][1] + 3).toBeLessThanOrEqual(175.5 + 1e-6);
    }
  });
});

describe('E05 side plank', () => {
  it.each(['start', 'end'] as const)(
    'gives the supporting and the free arm the same segment lengths (%s)',
    (which) => {
      const p = figures['side-plank'][which];
      expect(
        Math.abs(length(p, 'neck', 'eR') - length(p, 'neck', 'eL')),
      ).toBeLessThan(TOL);
      expect(
        Math.abs(length(p, 'eR', 'hR') - length(p, 'eL', 'hL')),
      ).toBeLessThan(TOL);
      expect(
        Math.abs(length(p, 'hip', 'kR') - length(p, 'hip', 'kL')),
      ).toBeLessThan(TOL);
    },
  );
  it('keeps the forearm flat on the mat and the free arm pointing to the ceiling', () => {
    for (const which of ['start', 'end'] as const) {
      const p = figures['side-plank'][which];
      // Stroke edge (half of 6) sits on the mat top edge (175.5).
      expect(p.eR[1] + 3).toBeCloseTo(175.5, 6);
      expect(p.hR[1] + 3).toBeCloseTo(175.5, 6);
      expect(p.neck[1]).toBeCloseTo(p.eR[1] - length(p, 'neck', 'eR'), 1);
    }
    const end = figures['side-plank'].end;
    expect(end.eL[0]).toBe(end.neck[0]);
    expect(end.hL[0]).toBe(end.neck[0]);
    expect(end.hL[1]).toBeLessThan(end.eL[1]);
    expect(end.eL[1]).toBeLessThan(end.neck[1]);
  });
});

describe('E07 single-leg hip thrust with weight', () => {
  it.each(['dumbbell', 'kettlebell'] as const)(
    'keeps the arm segments of the unloaded arms with a %s',
    (equipment) => {
      const unloaded = movementPose('single-leg-hip-thrust', 0);
      const upper = length(unloaded, 'neck', 'eR');
      const fore = length(unloaded, 'eR', 'hR');
      const upperL = length(unloaded, 'neck', 'eL');
      const foreL = length(unloaded, 'eL', 'hL');
      for (const t of PHASES) {
        const { p, anchors } = applyEquipmentPose(
          'single-leg-hip-thrust',
          movementPose('single-leg-hip-thrust', t),
          equipment,
        );
        expect(length(p, 'neck', 'eR')).toBeCloseTo(upper, 4);
        expect(length(p, 'eR', 'hR')).toBeCloseTo(fore, 4);
        expect(length(p, 'neck', 'eL')).toBeCloseTo(upperL, 4);
        expect(length(p, 'eL', 'hL')).toBeCloseTo(foreL, 4);
        // The weight is held by the hands and rests on the pelvis.
        const [anchor] = anchors as [Pt];
        expect(
          dist(anchor, [(p.hR[0] + p.hL[0]) / 2, (p.hR[1] + p.hL[1]) / 2]),
        ).toBeLessThan(equipment === 'kettlebell' ? 11.01 : 0.01);
        expect(dist(p.hR, p.hip)).toBeLessThan(18);
        expect(dist(p.hL, p.hip)).toBeLessThan(18);
      }
    },
  );
});

describe('E10 bird dog contact', () => {
  const MAT_TOP = 175.5;
  it('rests the supporting knee and both shins on the mat in every phase', () => {
    for (const t of PHASES) {
      const p = movementPose('bird-dog', t);
      expect(p.kR[1] + 3).toBeCloseTo(MAT_TOP, 6);
      expect(p.aR[1] + 3).toBeCloseTo(MAT_TOP, 6);
      expect(p.hL[1] + 3).toBeGreaterThanOrEqual(MAT_TOP);
    }
  });
  it('shows the contact in the reduced-motion Start and Slut stills', () => {
    for (const still of [figures['bird-dog'].start, figures['bird-dog'].end]) {
      expect(still.kR[1] + 3).toBeCloseTo(MAT_TOP, 6);
      expect(still.hL[1]).toBe(174);
    }
  });
  it('extends the arm and the opposite leg to the same reach as the supporting ones', () => {
    const end = movementPose('bird-dog', 1);
    expect(length(end, 'neck', 'hR')).toBeCloseTo(
      length(end, 'neck', 'eL') + length(end, 'eL', 'hL'),
      0,
    );
    expect(length(end, 'hip', 'aL')).toBeCloseTo(
      length(end, 'hip', 'kR') + length(end, 'kR', 'aR'),
      0,
    );
  });
});

describe('E06 split squat oblique view', () => {
  it.each(['right', 'left'] as const)(
    'keeps constant thigh and shin lengths below the profile and front limits (%s)',
    (working) => {
      const poses = PHASES.map((t) =>
        obliqueMovementPose('split-squat', t, working),
      );
      const profile = movementPose('split-squat', 0.5);
      // The right leg is the front one in the right-hand set, the left leg in
      // the left-hand set; the rear leg is foreshortened.
      const [front, rear] = working === 'right' ? ['R', 'L'] : ['L', 'R'];
      const legs = [
        [`k${front}`, `a${front}`, 'kR', 'aR'],
        [`k${rear}`, `a${rear}`, 'kL', 'aL'],
      ] as [PoseKey, PoseKey, PoseKey, PoseKey][];
      for (const [knee, ankle, profileKnee, profileAnkle] of legs) {
        const hip = 'hip';
        const profileThigh = length(profile, hip, profileKnee);
        const profileShin = length(profile, profileKnee, profileAnkle);
        const thigh = poses.map((p) => length(p, hip, knee));
        const shin = poses.map((p) => length(p, knee, ankle));
        expect(spread(thigh)).toBeLessThan(0.05);
        expect(spread(shin)).toBeLessThan(0.05);
        expect(Math.max(...thigh)).toBeLessThanOrEqual(
          Math.min(36, profileThigh + 0.5),
        );
        expect(Math.max(...shin)).toBeLessThanOrEqual(profileShin + 0.5);
        // Rear shin is foreshortened, not collapsed.
        expect(Math.min(...shin)).toBeGreaterThan(15);
      }
      for (const p of poses) {
        const rear = working === 'left' ? 'tR' : 'tL';
        expect(p[rear][1]).toBe(SPLIT_REAR_LINE_Y);
      }
    },
  );
});

describe('E09 suitcase carry front view', () => {
  it('keeps thigh and shin constant, at most the profile lengths', () => {
    const poses = PHASES.map((t) =>
      frontMovementPose('suitcase-carry', t, 'right'),
    );
    const profile = movementPose('suitcase-carry', 0);
    for (const [hip, knee, ankle] of [
      ['hip', 'kR', 'aR'],
      ['hip', 'kL', 'aL'],
    ] as const) {
      expect(spread(poses.map((p) => length(p, hip, knee)))).toBeLessThan(0.05);
      expect(spread(poses.map((p) => length(p, knee, ankle)))).toBeLessThan(
        0.05,
      );
      expect(
        Math.max(...poses.map((p) => length(p, hip, knee))),
      ).toBeLessThanOrEqual(length(profile, hip, knee) + 0.05);
    }
  });
  it.each([0.25, 0.75])(
    'lifts the same foot as the profile view at phase %s',
    (phase) => {
      const front = frontMovementPose('suitcase-carry', phase, 'right');
      const side = movementPose('suitcase-carry', phase);
      const lifted = (p: Pose) => (p.aR[1] < p.aL[1] ? 'R' : 'L');
      expect(lifted(front)).toBe(lifted(side));
      // The lifted foot clears the floor while the other one stays planted.
      expect(Math.max(front.aR[1], front.aL[1])).toBe(174);
      expect(Math.min(front.aR[1], front.aL[1])).toBeLessThan(170);
    },
  );
  it('shows different feet in the reduced-motion Start and Slut stills', () => {
    const start = frontMovementPose(
      'suitcase-carry',
      stillFramePhase('suitcase-carry', 'front', 'Start'),
      'right',
    );
    const end = frontMovementPose(
      'suitcase-carry',
      stillFramePhase('suitcase-carry', 'front', 'Slut'),
      'right',
    );
    expect(start.aL).not.toEqual(end.aL);
    expect(start.aR).not.toEqual(end.aR);
    expect(start.aL[1] < 174).not.toBe(end.aL[1] < 174);
  });
});
