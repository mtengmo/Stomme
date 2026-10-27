import type { BodyweightId } from '../content/bodyweightExercises';
import { isBodyweightAddition } from '../content/bodyweightExercises';
import type { ExerciseId } from '../domain/types';
import type { Pt } from './lerp';
import type { FigureSpec, Pose } from './poses';
import { joint } from './rehabPoses';

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const polar = (origin: Pt, length: number, angle: number): Pt => [
  origin[0] + length * Math.cos(angle),
  origin[1] + length * Math.sin(angle),
];
function pose(
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
const foot = (a: Pt): Pt => [a[0] + 9, a[1] + 3];
function pushUp(t: number): Pose {
  const ankle: Pt = [165, 174];
  const angle = mix(-2.72, -3.02, t);
  const neck = polar(ankle, 110, angle),
    hip = polar(ankle, 64, angle);
  const startNeck = polar(ankle, 110, -2.72);
  const armLength = (174 - startNeck[1]) / 2;
  const hand: Pt = [startNeck[0], 174],
    farHand: Pt = [startNeck[0] + 4, 171];
  return pose(
    polar(neck, 14, angle),
    neck,
    hip,
    [
      joint(neck, hand, armLength, armLength, -1),
      hand,
      joint(neck, farHand, armLength, armLength, -1),
      farHand,
    ],
    [
      polar(ankle, 32, angle),
      ankle,
      foot(ankle),
      polar([162, 171], 32, angle),
      [162, 171],
      [171, 174],
    ],
  );
}
function plank(): Pose {
  const p = pushUp(0.2);
  return {
    ...p,
    eR: [p.neck[0], 174],
    hR: [p.neck[0] - 21, 174],
    eL: [p.neck[0] + 4, 171],
    hL: [p.neck[0] - 17, 171],
  };
}
function pull(t: number, chin: boolean): Pose {
  const neck: Pt = [100, mix(80, 36, t)],
    hip: Pt = [100, neck[1] + 43];
  const hands: [Pt, Pt] = chin
    ? [
        [80, 31],
        [120, 31],
      ]
    : [
        [66, 31],
        [134, 31],
      ];
  const rightAnkle: Pt = [90, hip[1] + 48],
    leftAnkle: Pt = [112, hip[1] + 48];
  return pose(
    [100, neck[1] - 14],
    neck,
    hip,
    [
      joint(neck, hands[0], 30, 30, -1),
      hands[0],
      joint(neck, hands[1], 30, 30, 1),
      hands[1],
    ],
    [
      [82, hip[1] + 25],
      rightAnkle,
      foot(rightAnkle),
      [118, hip[1] + 25],
      leftAnkle,
      foot(leftAnkle),
    ],
  );
}
function dip(t: number): Pose {
  const neck: Pt = [96, mix(64, 88, t)],
    hip: Pt = [92, neck[1] + 41];
  const hand: Pt = [111, 117],
    far: Pt = [101, 114];
  return pose(
    [100, neck[1] - 14],
    neck,
    hip,
    [joint(neck, hand, 28, 29, 1), hand, joint(neck, far, 28, 29, 1), far],
    [
      [85, hip[1] + 27],
      [65, hip[1] + 38],
      [56, hip[1] + 38],
      [91, hip[1] + 25],
      [72, hip[1] + 35],
      [63, hip[1] + 35],
    ],
  );
}
function back(t: number): Pose {
  const hip: Pt = [108, 169],
    angle = Math.PI + 0.28 * t;
  const neck = polar(hip, 48, angle),
    head = polar(neck, 14, angle);
  return pose(
    head,
    neck,
    hip,
    [
      [75, neck[1] + 3],
      [99, neck[1] + 5],
      [79, neck[1] + 1],
      [103, neck[1] + 3],
    ],
    [
      [138, 171],
      [168, 173],
      [177, 176],
      [135, 168],
      [165, 170],
      [174, 173],
    ],
  );
}
function legRaise(t: number): Pose {
  const hip: Pt = [97, 169],
    angle = mix(0, -1.3, t);
  return pose(
    [32, 162],
    [46, 169],
    hip,
    [
      [66, 173],
      [89, 173],
      [66, 165],
      [89, 165],
    ],
    [
      polar(hip, 32, angle),
      polar(hip, 64, angle),
      polar(polar(hip, 64, angle), 9, angle - 0.8),
      polar([94, 166], 32, angle),
      polar([94, 166], 64, angle),
      polar(polar([94, 166], 64, angle), 9, angle - 0.8),
    ],
  );
}
function squat(t: number, airborne = 0): Pose {
  const hip: Pt = [mix(100, 83, t), mix(111, 140, t) - airborne],
    neck: Pt = [hip[0] + 10 * t, hip[1] - 43];
  const ar: Pt = [116, 174 - airborne],
    al: Pt = [91, 174 - airborne];
  return pose(
    [neck[0] + 2, neck[1] - 14],
    neck,
    hip,
    [
      [neck[0] + 19, neck[1] + 15],
      [neck[0] + 37, neck[1] + 7],
      [neck[0] + 16, neck[1] + 18],
      [neck[0] + 34, neck[1] + 10],
    ],
    [
      joint(hip, ar, 36, 36, -1),
      ar,
      foot(ar),
      joint(hip, al, 36, 36, -1),
      al,
      foot(al),
    ],
  );
}
function lunge(t: number): Pose {
  // Start and finish are opposite lunges; the midpoint is airborne with legs passing.
  const lift = 19 * Math.sin(Math.PI * t);
  const hip: Pt = [100, 138 - lift - 16 * Math.sin(Math.PI * t)],
    neck: Pt = [100, hip[1] - 43];
  const kr = polar(hip, 36, mix(0.08, 2.38, t));
  const kl = polar(hip, 36, mix(2.38, 0.08, t));
  const ar = polar(kr, 34, mix(1.32, 3.1, t));
  const al = polar(kl, 34, mix(3.1, 1.32, t));
  return pose(
    [100, neck[1] - 14],
    neck,
    hip,
    [
      [116, neck[1] + 21],
      [121, neck[1] + 42],
      [84, neck[1] + 21],
      [79, neck[1] + 42],
    ],
    [kr, ar, foot(ar), kl, al, foot(al)],
  );
}
function climber(t: number): Pose {
  const p = pushUp(0);
  p.hip = [p.hip[0], p.hip[1] - 7];
  const phase = Math.sin(2 * Math.PI * t);
  const right = Math.max(0, phase),
    left = Math.max(0, -phase);
  const ar: Pt = [
      mix(165, 100, right),
      mix(174, 168, right) - 25 * Math.sin(Math.PI * right),
    ],
    al: Pt = [
      mix(162, 96, left),
      mix(171, 166, left) - 25 * Math.sin(Math.PI * left),
    ];
  return {
    ...p,
    kR: joint(p.hip, ar, 33, 33, 1),
    aR: ar,
    tR: foot(ar),
    kL: joint(p.hip, al, 33, 33, 1),
    aL: al,
    tL: foot(al),
  };
}
function blend(a: Pose, b: Pose, t: number): Pose {
  const result = { ...a };
  for (const key of Object.keys(a) as (keyof Pose)[])
    result[key] = [mix(a[key][0], b[key][0], t), mix(a[key][1], b[key][1], t)];
  return result;
}
function burpee(t: number): Pose {
  const facingRight = (p: Pose): Pose =>
    Object.fromEntries(
      Object.entries(p).map(([key, point]) => [
        key,
        [200 - point[0], point[1]],
      ]),
    ) as unknown as Pose;
  const crouch = squat(1);
  const handsDown: Pose = {
    ...crouch,
    eR: [111, 158],
    hR: [137, 174],
    eL: [106, 156],
    hL: [132, 171],
  };
  const jump = squat(0, 20);
  jump.eR = [jump.neck[0] + 10, jump.neck[1] - 20];
  jump.hR = [jump.neck[0] + 12, jump.neck[1] - 43];
  jump.eL = [jump.neck[0] + 6, jump.neck[1] - 18];
  jump.hL = [jump.neck[0] + 8, jump.neck[1] - 41];
  const frames = [
    squat(0),
    handsDown,
    facingRight(pushUp(0)),
    facingRight(pushUp(1)),
    facingRight(pushUp(0)),
    handsDown,
    squat(0),
    jump,
    squat(0),
  ];
  const n = Math.min(frames.length - 2, Math.floor(t * (frames.length - 1))),
    local = t * (frames.length - 1) - n;
  return blend(frames[n] as Pose, frames[n + 1] as Pose, local);
}

/** Stand, squat, push off, fly (apex at 0.575), land into a squat, stand. */
function squatJump(t: number): Pose {
  if (t < 0.3) return squat(t / 0.3);
  if (t < 0.45) return squat(1 - (t - 0.3) / 0.15);
  if (t < 0.7) return squat(0, 30 * Math.sin((Math.PI * (t - 0.45)) / 0.25));
  if (t < 0.85) return squat((t - 0.7) / 0.15);
  return squat(1 - (t - 0.85) / 0.15);
}

const handlers: Record<BodyweightId, (t: number) => Pose> = {
  'push-up': pushUp,
  'pull-up': (t) => pull(t, false),
  'chin-up': (t) => pull(t, true),
  'back-extension': back,
  'parallel-dip': dip,
  'lying-leg-raise': legRaise,
  burpee,
  plank,
  'squat-jump': squatJump,
  'jumping-lunge': lunge,
  'mountain-climber': climber,
};
export function bodyweightMovementPose(
  id: ExerciseId,
  t: number,
): Pose | undefined {
  return isBodyweightAddition(id)
    ? handlers[id](Math.max(0, Math.min(1, t)))
    : undefined;
}
export const bodyweightFigures = Object.fromEntries(
  Object.entries(handlers).map(([id, handler]) => [
    id,
    {
      start: handler(0),
      end: handler(1),
      motion:
        id === 'plank'
          ? 'hold'
          : id === 'burpee' || id === 'squat-jump'
            ? 'sequence'
            : 'controlled',
      props:
        id === 'pull-up' || id === 'chin-up'
          ? [{ type: 'pull-up-bar', x1: 55, x2: 145, y: 31 }]
          : id === 'parallel-dip'
            ? [{ type: 'dip-bars', x: 101, y: 117, w: 32 }]
            : [{ type: 'mat', x1: 18, x2: 187 }],
    },
  ]),
) as Record<BodyweightId, FigureSpec>;
