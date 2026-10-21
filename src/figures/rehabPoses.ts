import type { ExerciseId } from '../domain/types';
import type { Pt } from './lerp';
import type { FigureSpec, Pose } from './poses';

/** Solve a two-segment limb with a fixed endpoint; bend chooses the visible side. */
function joint(a: Pt, b: Pt, upper: number, lower: number, bend = 1): Pt {
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  const d = Math.max(0.001, Math.hypot(dx, dy));
  const along = (upper * upper - lower * lower + d * d) / (2 * d);
  const height = Math.sqrt(Math.max(0, upper * upper - along * along));
  return [
    a[0] + (dx / d) * along - (dy / d) * height * bend,
    a[1] + (dy / d) * along + (dx / d) * height * bend,
  ];
}
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
function skeleton(
  head: Pt,
  neck: Pt,
  hip: Pt,
  arms: [Pt, Pt, Pt, Pt],
  legs: [Pt, Pt, Pt, Pt, Pt, Pt],
): Pose {
  return {
    head,
    neck,
    hip,
    eR: arms[0],
    hR: arms[1],
    eL: arms[2],
    hL: arms[3],
    kR: legs[0],
    aR: legs[1],
    tR: legs[2],
    kL: legs[3],
    aL: legs[4],
    tL: legs[5],
  };
}
const toe = (a: Pt): Pt => [a[0] + 10, a[1] + 3];
type RehabExerciseId =
  | 'rear-foot-split-squat'
  | 'bench-side-plank-leg-lift'
  | 'kneeling-hip-flexor-stretch'
  | 'prone-on-forearms'
  | 'heel-slide'
  | 'balance-pendulum'
  | 'single-leg-chair-squat'
  | 'single-leg-floor-bridge';
const handlers: Record<RehabExerciseId, (t: number) => Pose> = {
  'rear-foot-split-squat': (t) => {
    const hip: Pt = [100, mix(112, 140, t)],
      ankle: Pt = [134, 174],
      rear: Pt = [53, 139];
    const neck: Pt = [100, hip[1] - 44];
    return skeleton(
      [100, neck[1] - 14],
      neck,
      hip,
      [
        [117, neck[1] + 19],
        [109, neck[1] + 9],
        [115, neck[1] + 20],
        [107, neck[1] + 9],
      ],
      [
        joint(hip, ankle, 37, 37, -1),
        ankle,
        toe(ankle),
        joint(hip, rear, 37, 37, -1),
        rear,
        [43, 140],
      ],
    );
  },
  'bench-side-plank-leg-lift': (t) => {
    const hip: Pt = [102, 132],
      ankle: Pt = [163, 139];
    // Keep the lower foot just below the supported foot so the legs remain
    // distinct in the profile drawing at the top of the lift.
    const angle = mix(0.74, 0.24, t),
      moving: Pt = [
        hip[0] + 62 * Math.cos(angle),
        hip[1] + 62 * Math.sin(angle),
      ];
    return skeleton(
      [35, 124],
      [49, 132],
      hip,
      [
        [52, 173],
        [78, 173],
        [67, 111],
        [94, 127],
      ],
      [
        [(hip[0] + moving[0]) / 2, (hip[1] + moving[1]) / 2],
        moving,
        toe(moving),
        [132, 135],
        ankle,
        toe(ankle),
      ],
    );
  },
  'kneeling-hip-flexor-stretch': (t) => {
    const angle = mix(-1.02, -0.78, t),
      hip: Pt = [76 + 36 * Math.cos(angle), 173 + 36 * Math.sin(angle)];
    const front: Pt = [141, 174],
      neck: Pt = [hip[0], hip[1] - 43];
    return skeleton(
      [hip[0], neck[1] - 14],
      neck,
      hip,
      [
        [hip[0] + 19, hip[1] - 15],
        [hip[0] + 3, hip[1] - 4],
        [hip[0] - 17, hip[1] - 14],
        [hip[0] - 3, hip[1] - 4],
      ],
      [
        [76, 173],
        [42, 173],
        [32, 173],
        joint(hip, front, 36, 36, -1),
        front,
        toe(front),
      ],
    );
  },
  'prone-on-forearms': () =>
    skeleton(
      [49, 124],
      [62, 136],
      [108, 169],
      [
        [62, 174],
        [84, 174],
        [66, 172],
        [87, 172],
      ],
      [
        [140, 171],
        [172, 173],
        [183, 175],
        [138, 168],
        [170, 170],
        [181, 172],
      ],
    ),
  'heel-slide': (t) => heelSlidePose(t),
  'balance-pendulum': (t) => {
    const hip: Pt = [100, 112],
      angle = mix(-Math.PI / 2, -0.1, t);
    const neck: Pt = [
      hip[0] + 44 * Math.cos(angle),
      hip[1] + 44 * Math.sin(angle),
    ];
    const head: Pt = [
      neck[0] + 14 * Math.cos(angle),
      neck[1] + 14 * Math.sin(angle),
    ];
    const thighAngle = mix(-1.05, Math.PI - 0.14, t),
      shinAngle = mix(0.8, Math.PI + 0.04, t);
    const freeKnee: Pt = [
      hip[0] + 32 * Math.cos(thighAngle),
      hip[1] + 32 * Math.sin(thighAngle),
    ];
    const freeAnkle: Pt = [
      freeKnee[0] + 29 * Math.cos(shinAngle),
      freeKnee[1] + 29 * Math.sin(shinAngle),
    ];
    // Reach below the head in both phases, with constant upper-arm and
    // forearm lengths so the arms stay forward without crossing the face.
    const elbowR: Pt = [
      neck[0] + 18 * Math.cos(1.0),
      neck[1] + 18 * Math.sin(1.0),
    ];
    const handR: Pt = [
      elbowR[0] + 21 * Math.cos(-0.05),
      elbowR[1] + 21 * Math.sin(-0.05),
    ];
    const elbowL: Pt = [
      neck[0] + 18 * Math.cos(1.1),
      neck[1] + 18 * Math.sin(1.1),
    ];
    const handL: Pt = [
      elbowL[0] + 21 * Math.cos(0.05),
      elbowL[1] + 21 * Math.sin(0.05),
    ];
    return skeleton(
      head,
      neck,
      hip,
      [elbowR, handR, elbowL, handL],
      [[104, 143], [101, 174], [112, 177], freeKnee, freeAnkle, toe(freeAnkle)],
    );
  },
  'single-leg-chair-squat': (t) => {
    const hip: Pt = [mix(101, 80, t), mix(109, 140, t)],
      ankle: Pt = [116, 174];
    const neck: Pt = [hip[0] + 10 * t, hip[1] - 43];
    const k: Pt = [hip[0] + 31, hip[1] + 9],
      a: Pt = [k[0] + 28, k[1] + 10];
    return skeleton(
      [neck[0] + 3, neck[1] - 14],
      neck,
      hip,
      [
        [neck[0] + 22, neck[1] + 8],
        [neck[0] + 43, neck[1] + 10],
        [neck[0] + 20, neck[1] + 11],
        [neck[0] + 41, neck[1] + 13],
      ],
      [joint(hip, ankle, 36, 36, -1), ankle, toe(ankle), k, a, toe(a)],
    );
  },
  'single-leg-floor-bridge': (t) => {
    const shoulder: Pt = [44, 169],
      torsoLength = Math.hypot(99 - shoulder[0], 167 - shoulder[1]),
      hipY = mix(167, 140, t),
      hip: Pt = [
        shoulder[0] + Math.sqrt(torsoLength ** 2 - (hipY - shoulder[1]) ** 2),
        hipY,
      ],
      ankle: Pt = [146, 174];
    const freeKnee: Pt = [hip[0] + 14, hip[1] - 31],
      freeAnkle: Pt = [freeKnee[0] + 14, freeKnee[1] - 31];
    return skeleton(
      [30, 162],
      [44, 169],
      hip,
      [
        [63, 174],
        [87, 174],
        [63, 166],
        [87, 166],
      ],
      [
        joint(hip, ankle, 35, 35, -1),
        ankle,
        toe(ankle),
        freeKnee,
        freeAnkle,
        [freeAnkle[0] + 7, freeAnkle[1] - 7],
      ],
    );
  },
};

export function heelSlidePose(t: number, side: 'R' | 'L' = 'R'): Pose {
  const hip: Pt = [91, 167];
  const rightAnkle: Pt = [side === 'R' ? mix(128, 170, t) : 128, 174];
  const leftAnkle: Pt = [side === 'L' ? mix(112, 154, t) : 112, 174];
  return skeleton(
    [29, 159],
    [43, 167],
    hip,
    [
      [60, 173],
      [83, 173],
      [60, 164],
      [83, 164],
    ],
    [
      joint(hip, rightAnkle, 42, 42, -1),
      rightAnkle,
      toe(rightAnkle),
      joint(hip, leftAnkle, 42, 42, -1),
      leftAnkle,
      toe(leftAnkle),
    ],
  );
}

export function rehabMovementPose(id: ExerciseId, t: number): Pose | undefined {
  return handlers[id as RehabExerciseId]?.(Math.max(0, Math.min(1, t)));
}

export const rehabFigures = Object.fromEntries(
  Object.entries(handlers).map(([id, pose]) => [
    id,
    {
      start: pose(0),
      end: pose(1),
      motion:
        id === 'bench-side-plank-leg-lift'
          ? 'controlled'
          : id === 'kneeling-hip-flexor-stretch' || id === 'prone-on-forearms'
            ? 'hold'
            : 'controlled',
      props:
        id === 'rear-foot-split-squat'
          ? [{ type: 'step', x: 30, y: 142, w: 39 }]
          : id === 'bench-side-plank-leg-lift'
            ? [{ type: 'step', x: 154, y: 143, w: 30 }]
            : id === 'single-leg-chair-squat'
              ? [{ type: 'chair', x: 46, y: 144, w: 38 }]
              : [{ type: 'mat', x1: 18, x2: 187 }],
    },
  ]),
) as Record<RehabExerciseId, FigureSpec>;
