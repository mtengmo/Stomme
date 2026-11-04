import type { BodyweightId } from '../content/bodyweightExercises';
import { isBodyweightAddition } from '../content/bodyweightExercises';
import type { ExerciseId } from '../domain/types';
import { burpeePose } from './burpeeKeyframes';
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
/**
 * The far foot of a straight-bodied support: 3 units off the near foot,
 * perpendicular to the leg, so the far leg is as long as the near one and
 * stays straight (an offset along the leg would force a visible knee kink).
 */
const farFoot = (ankle: Pt, angle: number): Pt => [
  ankle[0] - 3 * Math.sin(angle),
  ankle[1] + 3 * Math.cos(angle),
];
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
      joint(hip, farFoot(ankle, angle), 32, 32, -1),
      farFoot(ankle, angle),
      foot(farFoot(ankle, angle)),
    ],
  );
}
/** Forearm plank angle: shoulders over the elbows, trunk straight to the toes. */
const PLANK_ANGLE = -2.912;
/**
 * Forearm plank. Each upper arm drops 25 from the shoulder to an elbow on the
 * mat and the forearm lies forward 23. `lift` raises that arm forward off the
 * mat (plank arm lift); the far arm sits a little forward of the near one.
 */
function forearmPlank(liftR = 0, liftL = 0): Pose {
  const ankle: Pt = [165, 174],
    farAnkle = farFoot(ankle, PLANK_ANGLE);
  const neck = polar(ankle, 110, PLANK_ANGLE),
    hip = polar(ankle, 64, PLANK_ANGLE);
  const arm = (lift: number, spread: number): [Pt, Pt] => {
    const elbow = polar(
      neck,
      25,
      mix(Math.PI / 2 + spread, Math.PI - 0.08, lift),
    );
    return [elbow, polar(elbow, 23, Math.PI + mix(0, -0.08, lift))];
  };
  const [eR, hR] = arm(liftR, 0);
  const [eL, hL] = arm(liftL, 0.15);
  return pose(
    polar(neck, 14, PLANK_ANGLE),
    neck,
    hip,
    [eR, hR, eL, hL],
    [
      polar(ankle, 32, PLANK_ANGLE),
      ankle,
      foot(ankle),
      joint(hip, farAnkle, 32, 32, -1),
      farAnkle,
      foot(farAnkle),
    ],
  );
}
function plank(): Pose {
  return forearmPlank();
}

/** Elevated toe contacts; the whole trunk pivots about the feet. */
function declinePushUp(t: number): Pose {
  const ankle: Pt = [165, 134];
  const angle = mix(-3.0, -3.3, t);
  const neck = polar(ankle, 110, angle);
  const hip = polar(ankle, 64, angle);
  const startNeck = polar(ankle, 110, -3.0);
  const hand: Pt = [startNeck[0], 174];
  const farHand: Pt = [startNeck[0] + 4, 171];
  const length = (174 - startNeck[1]) / 2;
  return pose(
    polar(neck, 14, angle),
    neck,
    hip,
    [
      joint(neck, hand, length, length, -1),
      hand,
      joint(neck, farHand, length, length, -1),
      farHand,
    ],
    [
      polar(ankle, 32, angle),
      ankle,
      [174, 137],
      joint(hip, farFoot(ankle, angle), 32, 32, -1),
      farFoot(ankle, angle),
      foot(farFoot(ankle, angle)),
    ],
  );
}

function diamondPushUp(t: number): Pose {
  const p = pushUp(t);
  // Both hands meet under the chest; elbows fold back alongside the trunk.
  const hand: Pt = [68, 174],
    farHand: Pt = [70, 172];
  return {
    ...p,
    hR: hand,
    hL: farHand,
    eR: joint(p.neck, hand, 25, 25, -1),
    eL: joint(p.neck, farHand, 25, 25, -1),
  };
}

/**
 * Planted hands and toes. t=0: hips high and back, knees bent just above the mat,
 * shoulders behind the hands. t=1: legs straight, low plank with the chest at
 * the hands. The body glides forward and down; nothing leaves the floor.
 */
function blastOffPushUp(t: number): Pose {
  const ankle: Pt = [165, 174],
    farAnkle: Pt = [162, 171];
  const hand: Pt = [64.6, 174],
    farHand: Pt = [68.6, 171];
  const hipAngle = mix(-2.075, -3.02, t);
  // The legs are straight well before the chest reaches the hands.
  const hip = polar(ankle, mix(48.2, 64, Math.min(1, t / 0.75)), hipAngle);
  const trunk = mix(2.75, 3.263, t);
  const neck = polar(hip, 46, trunk);
  // The far leg runs parallel to the near one, as in the push-up.
  const farHip: Pt = [hip[0] - 3, hip[1] - 3];
  const armLength = 22.5;
  return pose(
    polar(neck, 14, trunk),
    neck,
    hip,
    [
      joint(neck, hand, armLength, armLength, -1),
      hand,
      joint(neck, farHand, armLength, armLength, -1),
      farHand,
    ],
    [
      joint(hip, ankle, 32, 32, 1),
      ankle,
      foot(ankle),
      joint(farHip, farAnkle, 32, 32, 1),
      farAnkle,
      [171, 174],
    ],
  );
}

function plankArmLift(t: number): Pose {
  // One cycle includes both arms and returns to both forearms on the mat.
  const right = Math.max(0, Math.sin(2 * Math.PI * t));
  const left = Math.max(0, -Math.sin(2 * Math.PI * t));
  return forearmPlank(right, left);
}
function pull(t: number, chin: boolean): Pose {
  // Hang with straight arms: the neck sits one arm length (60) below the bar, so the
  // narrower chin-up grip starts lower than the wide pull-up grip.
  const neck: Pt = [100, mix(chin ? 87 : 80, 36, t)],
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
  // The chin-up hang starts lower, so the knees are bent and the feet stay clear of the floor.
  const legDrop = chin ? 38 : 48;
  const rightAnkle: Pt = [chin ? 78 : 90, hip[1] + legDrop],
    leftAnkle: Pt = [chin ? 100 : 112, hip[1] + legDrop];
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
      chin ? joint(hip, rightAnkle, 36, 34, 1) : [82, hip[1] + 25],
      rightAnkle,
      foot(rightAnkle),
      chin ? joint(hip, leftAnkle, 36, 34, 1) : [118, hip[1] + 25],
      leftAnkle,
      foot(leftAnkle),
    ],
  );
}
function dip(t: number): Pose {
  // Top position: both support arms straight (neck one arm length above the bars).
  const neck: Pt = [96, mix(62, 88, t)],
    hip: Pt = [92, neck[1] + 41];
  const hand: Pt = [111, 117],
    far: Pt = [109, 117];
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
  // The back shin ends shallow enough that the back forefoot reaches the floor
  // (heel lifted); the front shin is near vertical with a flat foot.
  const ar = polar(kr, 34, mix(1.32, 2.967, t));
  const al = polar(kl, 34, mix(2.967, 1.32, t));
  // Foot length stays 9.49 (as foot()); a steep foot angle puts only the toe on the floor.
  const flat = Math.atan2(3, 9),
    ball = 1.05;
  const toe = (a: Pt, angle: number): Pt => polar(a, Math.hypot(9, 3), angle);
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
    [kr, ar, toe(ar, mix(flat, ball, t)), kl, al, toe(al, mix(ball, flat, t))],
  );
}
function climber(t: number): Pose {
  const p = pushUp(0);
  p.hip = [p.hip[0], p.hip[1] - 7];
  // Both support arms straight: the far hand keeps its 4 unit offset but sits
  // on the floor exactly one full arm length below the shoulder.
  const reach = Math.hypot(p.neck[0] - p.hR[0], p.neck[1] - p.hR[1]);
  const farHand: Pt = [
    p.hR[0] + 4,
    p.neck[1] + Math.sqrt(reach * reach - (p.hR[0] + 4 - p.neck[0]) ** 2),
  ];
  p.hL = farHand;
  p.eL = joint(p.neck, farHand, reach / 2, reach / 2, -1);
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
    kR: joint(p.hip, ar, 34, 34, 1),
    aR: ar,
    tR: foot(ar),
    kL: joint(p.hip, al, 34, 34, 1),
    aL: al,
    tL: foot(al),
  };
}
/** Stand, squat, push off, fly (apex at 0.575), land into a squat, stand. */
function squatJump(t: number): Pose {
  if (t < 0.3) return squat(t / 0.3);
  if (t < 0.45) return squat(1 - (t - 0.3) / 0.15);
  if (t < 0.7) return squat(0, 30 * Math.sin((Math.PI * (t - 0.45)) / 0.25));
  if (t < 0.85) return squat((t - 0.7) / 0.15);
  return squat(1 - (t - 0.85) / 0.15);
}

/** Side view of the hop: one-legged stance with a small bounce (the front view carries the lateral travel). */
function lateralHop(t: number): Pose {
  const lift = 6 * Math.sin(Math.PI * t);
  const ar: Pt = [100, 174 - lift];
  const hip: Pt = [100, ar[1] - 66 - 3 * Math.sin(Math.PI * t)],
    neck: Pt = [100, hip[1] - 43];
  const al: Pt = [88, ar[1] - 26];
  return pose(
    [102, neck[1] - 14],
    neck,
    hip,
    [
      [neck[0] + 8, neck[1] + 22],
      [neck[0] + 8, neck[1] + 42],
      [neck[0] + 5, neck[1] + 22],
      [neck[0] + 5, neck[1] + 42],
    ],
    [
      joint(hip, ar, 36, 34, -1),
      ar,
      foot(ar),
      joint(hip, al, 36, 34, 1),
      al,
      foot(al),
    ],
  );
}

/** The step is about 30 cm high (44 px wide); ankles rest 3 px above its top so the toes touch it. */
export const BOX_PROP = { x: 125, y: 156, w: 44 } as const;
const BOX_ANKLE_Y = BOX_PROP.y - 3;
const BOX_START_X = 75;
const BOX_LAND_X = 140;
const smooth = (x: number) => x * x * (3 - 2 * x);

/** Both legs reach their feet from the hip; thigh and shin keep their length. */
function boxPose(hip: Pt, lean: number, ar: Pt, al: Pt): Pose {
  // The trunk keeps its length when it leans.
  const neck: Pt = [hip[0] + lean, hip[1] - Math.sqrt(43 * 43 - lean * lean)];
  return pose(
    [neck[0] + 2, neck[1] - 14],
    neck,
    hip,
    [
      [neck[0] + 16, neck[1] + 17],
      [neck[0] + 30, neck[1] + 8],
      [neck[0] + 13, neck[1] + 20],
      [neck[0] + 27, neck[1] + 11],
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
/** Upright stance whose feet are `floor` high; `crouch` 0..1 sinks the hips. */
function boxStance(hipX: number, floor: number, crouch: number): Pose {
  return boxPose(
    [hipX + 6 * crouch, floor - 63 + 22 * crouch],
    8 * crouch,
    [hipX + 14, floor],
    [hipX + 1, floor],
  );
}
/** A foot moving back along the step's top and then straight down beside it. */
function footDown(from: Pt, toX: number, f: number): Pt {
  if (f < 0.5) {
    const u = smooth(f * 2);
    return [mix(from[0], toX, u), BOX_ANKLE_Y - 8 * Math.sin(Math.PI * u)];
  }
  return [toX, mix(BOX_ANKLE_Y, 174, smooth(f * 2 - 1))];
}

/**
 * Stand, dip, jump forward and up (0.3-0.5), land on the step (0.5-0.6),
 * stand tall, step down backwards one foot at a time (0.7-0.9) and stand on
 * the start place again.
 */
function boxJump(t: number): Pose {
  if (t < 0.2) return boxStance(BOX_START_X, 174, smooth(t / 0.2) * 0.5);
  if (t < 0.3)
    return boxStance(BOX_START_X, 174, 0.5 - smooth((t - 0.2) / 0.1) * 0.5);
  if (t < 0.5) {
    const u = (t - 0.3) / 0.2;
    return boxStance(
      mix(BOX_START_X, BOX_LAND_X, u),
      mix(174, BOX_ANKLE_Y, u) - 26 * Math.sin(Math.PI * u),
      0.2 * (1 - Math.abs(2 * u - 1)),
    );
  }
  if (t < 0.6)
    return boxStance(
      BOX_LAND_X,
      BOX_ANKLE_Y,
      0.4 * Math.sin((Math.PI * (t - 0.5)) / 0.1),
    );
  if (t < 0.7) return boxStance(BOX_LAND_X, BOX_ANKLE_Y, 0);
  if (t < 0.9) {
    const u = (t - 0.7) / 0.2;
    const topFar: Pt = [BOX_LAND_X + 1, BOX_ANKLE_Y];
    const topNear: Pt = [BOX_LAND_X + 14, BOX_ANKLE_Y];
    const startNear: Pt = [BOX_START_X + 14, 174];
    const startFar: Pt = [BOX_START_X + 1, 174];
    const mid: Pt = [112, 110];
    const hip: Pt =
      u < 0.5
        ? [
            mix(BOX_LAND_X, mid[0], smooth(u * 2)),
            mix(BOX_ANKLE_Y - 63, mid[1], smooth(u * 2)),
          ]
        : [
            mix(mid[0], BOX_START_X, smooth(u * 2 - 1)),
            mix(mid[1], 174 - 63, smooth(u * 2 - 1)),
          ];
    // The near foot reaches the floor first (u = 0.5); the far foot follows.
    const near = u < 0.5 ? footDown(topNear, startNear[0], u * 2) : startNear;
    const far = u < 0.5 ? topFar : footDown(topFar, startFar[0], u * 2 - 1);
    return boxPose(hip, 0, near, far);
  }
  return boxStance(BOX_START_X, 174, 0);
}

/** Knees on the floor: the body pivots at the knees as one rigid lever. */
function kneePushUp(t: number): Pose {
  const knee: Pt = [138, 173];
  const angle = mix(-2.59, -2.96, t);
  const neck = polar(knee, 82, angle),
    hip = polar(knee, 36, angle);
  const startNeck = polar(knee, 82, -2.59);
  const armLength = (174 - startNeck[1]) / 2;
  const hand: Pt = [startNeck[0], 174],
    farHand: Pt = [startNeck[0] + 4, 171];
  const farKnee: Pt = [knee[0] - 3, knee[1] - 2];
  const ankle = polar(knee, 34, -0.45),
    farAnkle = polar(farKnee, 34, -0.55);
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
    [knee, ankle, foot(ankle), farKnee, farAnkle, foot(farAnkle)],
  );
}
/** Standing lean against a wall: hands fixed on the wall, feet planted. */
function wallPushUp(t: number): Pose {
  const ankle: Pt = [72, 174];
  const angle = -mix(1.222, 0.942, t);
  const neck = polar(ankle, 108, angle),
    hip = polar(ankle, 63, angle);
  const hand: Pt = [155, 76],
    farHand: Pt = [155, 79];
  const farAnkle: Pt = [68, 174];
  return pose(
    polar(neck, 14, angle),
    neck,
    hip,
    [
      joint(neck, hand, 24, 24, 1),
      hand,
      joint(neck, farHand, 24, 24, 1),
      farHand,
    ],
    [
      polar(ankle, 32, angle),
      ankle,
      foot(ankle),
      polar(farAnkle, 32, angle),
      farAnkle,
      foot(farAnkle),
    ],
  );
}
/** The heels rise about 16 px: each foot (fixed length) rotates about its toe on the floor. */
const FOOT = 20;
function calfRaise(t: number): Pose {
  const lift = mix(Math.asin(0.15), Math.asin(0.95), t);
  const toeR: Pt = [121, 177],
    toeL: Pt = [112, 177];
  const heel = (toe: Pt): Pt => [
    toe[0] - FOOT * Math.cos(lift),
    toe[1] - FOOT * Math.sin(lift),
  ];
  const ar = heel(toeR),
    al = heel(toeL);
  const hip: Pt = [(ar[0] + al[0]) / 2, ar[1] - 68],
    neck: Pt = [hip[0], hip[1] - 43];
  return pose(
    [neck[0] + 2, neck[1] - 14],
    neck,
    hip,
    [
      [neck[0] + 8, neck[1] + 22],
      [neck[0] + 8, neck[1] + 42],
      [neck[0] + 5, neck[1] + 22],
      [neck[0] + 5, neck[1] + 42],
    ],
    [
      joint(hip, ar, 36, 34, -1),
      ar,
      toeR,
      joint(hip, al, 36, 34, -1),
      al,
      toeL,
    ],
  );
}
/** Lying on the back, knees bent: head and shoulders turn about 40 degrees around the mid-back. */
function crunch(t: number): Pose {
  const hip: Pt = [97, 169],
    pivot: Pt = [72, 169],
    phi = 0.7 * t;
  const neck: Pt = [
    pivot[0] - 26 * Math.cos(phi),
    pivot[1] - 26 * Math.sin(phi),
  ];
  const head: Pt = [neck[0] - 14 * Math.cos(phi), neck[1] - 14 * Math.sin(phi)];
  const ar: Pt = [140, 174],
    al: Pt = [136, 174];
  return pose(
    head,
    neck,
    hip,
    [
      [neck[0] + 4, neck[1] - 14],
      [head[0] + 7, head[1] + 4],
      [neck[0] + 8, neck[1] - 12],
      [head[0] + 9, head[1] + 7],
    ],
    [
      joint(hip, ar, 36, 34, -1),
      ar,
      foot(ar),
      joint(hip, al, 36, 34, -1),
      al,
      foot(al),
    ],
  );
}

/**
 * Running-style stance in side view. The legs are solved from the hip to each
 * ankle, so thigh and shin keep their length. `swing` (-1..1) pendulates the
 * arms: the right arm goes back while the right leg is lifted. The pose at t=1 is the
 * pose at t=0 with the roles of the legs and arms swapped (heights and arms
 * match exactly; the feet keep their own x).
 */
function runStance(hip: Pt, ar: Pt, al: Pt, swing: number): Pose {
  const neck: Pt = [hip[0], hip[1] - 43];
  const arm = (side: number): [Pt, Pt] => {
    const upper = Math.PI / 2 + 0.45 * swing * side;
    const elbow = polar(neck, 22, upper);
    return [elbow, polar(elbow, 20, upper - 0.8)];
  };
  const [eR, hR] = arm(1);
  const [eL, hL] = arm(-1);
  return pose(
    [neck[0] + 2, neck[1] - 14],
    neck,
    hip,
    [eR, hR, eL, hL],
    [
      joint(hip, ar, 36, 34, -1),
      ar,
      foot(ar),
      joint(hip, al, 36, 34, -1),
      al,
      foot(al),
    ],
  );
}
/** 1 at t=0, falling to 0 at the middle of the loop. */
const firstHalf = (t: number) => Math.max(0, 1 - 2 * t);
/** 0 until the middle of the loop, rising to 1 at t=1. */
const secondHalf = (t: number) => Math.max(0, 2 * t - 1);

/** Quick steps on the spot: each foot lifts a few centimetres in turn (t=0 right, t=1 left). */
function fastFeet(t: number): Pose {
  const r = firstHalf(t),
    l = secondHalf(t);
  return runStance(
    [100, 108 - 2 * Math.max(r, l)],
    [103 + 3 * r, 174 - 8 * r],
    [97 + 3 * l, 174 - 8 * l],
    r - l,
  );
}

/** Foot position of a driven knee: forward and tucked under a near-horizontal thigh. */
const KNEE_DRIVE_REACH = 15;
const KNEE_DRIVE_FOOT_Y = 140;
/** Alternating knee lifts on the spot (t=0 right knee up, t=1 left knee up); the other foot stays down. */
function kneeDrive(t: number): Pose {
  const r = smooth(firstHalf(t)),
    l = smooth(secondHalf(t));
  // The feet stand 6 px apart so the two legs read as two legs from the side.
  const ankle = (k: number, x: number): Pt => [
    mix(x, x + KNEE_DRIVE_REACH, k),
    mix(174, KNEE_DRIVE_FOOT_Y, k),
  ];
  return runStance(
    [100, 108 - 3 * Math.max(r, l)],
    ankle(r, 103),
    ankle(l, 97),
    r - l,
  );
}

/** Side-view fallback of the in-and-out jump (the front view carries the width): a small bounce, deeper at the end. */
function inAndOutJump(t: number): Pose {
  const lift = 10 * Math.sin(Math.PI * t);
  return runStance(
    [100, 114 - lift + 6 * t],
    [104, 174 - lift],
    [96, 174 - lift],
    0,
  );
}

/** Side-view fallback of the lateral shuffle: a low stance where each foot lifts a little in turn. */
function lateralShuffle(t: number): Pose {
  return runStance(
    [100, 116],
    [104, 174 - 5 * firstHalf(t)],
    [94, 174 - 5 * secondHalf(t)],
    0,
  );
}

const handlers: Record<BodyweightId, (t: number) => Pose> = {
  'decline-push-up': declinePushUp,
  'diamond-push-up': diamondPushUp,
  'blast-off-push-up': blastOffPushUp,
  'plank-arm-lift': plankArmLift,
  'push-up': pushUp,
  'pull-up': (t) => pull(t, false),
  'chin-up': (t) => pull(t, true),
  'back-extension': back,
  'parallel-dip': dip,
  'lying-leg-raise': legRaise,
  burpee: burpeePose,
  plank,
  'squat-jump': squatJump,
  'single-leg-lateral-hop': lateralHop,
  'box-jump': boxJump,
  'fast-feet': fastFeet,
  'in-and-out-jump': inAndOutJump,
  'lateral-shuffle': lateralShuffle,
  'knee-drive': kneeDrive,
  'jumping-lunge': lunge,
  'mountain-climber': climber,
  'knee-push-up': kneePushUp,
  'wall-push-up': wallPushUp,
  'calf-raise': calfRaise,
  crunch,
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
      end: handler(id === 'plank-arm-lift' ? 0.25 : 1),
      motion:
        id === 'plank'
          ? 'hold'
          : id === 'burpee' || id === 'squat-jump' || id === 'box-jump'
            ? 'sequence'
            : id === 'single-leg-lateral-hop' ||
                id === 'fast-feet' ||
                id === 'in-and-out-jump' ||
                id === 'lateral-shuffle' ||
                id === 'knee-drive'
              ? 'ballistic'
              : 'controlled',
      props:
        id === 'decline-push-up'
          ? [{ type: 'chair', x: 154, y: 137, w: 32 }]
          : id === 'pull-up' || id === 'chin-up'
            ? [{ type: 'pull-up-bar', x1: 55, x2: 145, y: 31 }]
            : id === 'parallel-dip'
              ? [{ type: 'dip-bars', x: 101, y: 117, w: 32 }]
              : id === 'wall-push-up'
                ? [{ type: 'wall', x: 157 }]
                : id === 'box-jump'
                  ? [{ type: 'step', ...BOX_PROP }]
                  : [{ type: 'mat', x1: 18, x2: 187 }],
    },
  ]),
) as Record<BodyweightId, FigureSpec>;
