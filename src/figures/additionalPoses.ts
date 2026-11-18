import type { ExerciseId } from '../domain/types';
import { pushUp } from './bodyweightPoses';
import { farmerCarryPose, rackCarryPose } from './carryPoses';
import { hingeFamilyPose } from './hingeFamilyKeyframes';
import { solveTwoBone } from './keyframes';
import type { Pt } from './lerp';
import type { FigureSpec, Pose } from './poses';
import { joint } from './rehabPoses';
import {
  arm,
  bone,
  foot,
  headNeck,
  keepSegmentLengths,
  leg,
  type SegmentRule,
  trunk,
} from './segmentLengths';
import {
  SQUAT_CURL_TOP,
  squatFamilyPose,
  THRUSTER_TOP,
} from './squatFamilyKeyframes';

type P = Pt;
function p(
  head: P,
  neck: P,
  hip: P,
  arms: [P, P, P, P],
  legs: [P, P, P, P, P, P],
): Pose {
  const [eR, hR, eL, hL] = arms;
  const [kR, aR, tR, kL, aL, tL] = legs;
  return { head, neck, hip, eR, hR, eL, hL, kR, aR, tR, kL, aL, tL };
}
const stand = p(
  [99, 60],
  [98, 74],
  [98, 118],
  [
    [109, 96],
    [114, 118],
    [87, 96],
    [82, 118],
  ],
  [
    [104, 148],
    [108, 174],
    [119, 177],
    [90, 148],
    [86, 174],
    [97, 177],
  ],
);

/**
 * Segment-length rules for the figures below that are authored as raw joint
 * positions (see `segmentLengths.ts`). `constrainedLegs.ts` applies them to the
 * interpolation; `withLengths` applies the same rules to an authored keyframe so the
 * keyframes already have the constant lengths (those of `stand` unless a
 * reference is given).
 */
const BOTH_ARMS = [arm('R', { bend: 1 }), arm('L', { bend: 1 })] as const;
export const ADDITIONAL_SEGMENT_RULES: Partial<
  Record<ExerciseId, readonly SegmentRule[]>
> = {
  'bent-over-row': BOTH_ARMS,
  'kettlebell-halo': BOTH_ARMS,
  woodchop: [trunk(), ...BOTH_ARMS],
  'side-lunge': [
    trunk(),
    headNeck(),
    ...BOTH_ARMS,
    leg('R'),
    leg('L'),
    foot('R'),
    foot('L'),
  ],
  // The swung arm and the free arm hang at full reach, the trunk keeps its length.
  'one-arm-kettlebell-swing': [
    trunk(),
    headNeck(),
    arm('R', { straight: true }),
    arm('L', { straight: true }),
    leg('R'),
    leg('L'),
    foot('R'),
    foot('L'),
  ],
  // Shoulders stay on the mat: the hip follows the trunk arc, hands ride on the
  // hip with the dumbbell, arms and legs keep their lengths.
  'weighted-glute-bridge': [
    bone('neck', 'hip', ['hR', 'hL']),
    arm('R', { bend: -1 }),
    arm('L', { bend: -1 }),
    leg('R'),
    leg('L'),
    foot('R'),
    foot('L'),
  ],
};
const withLengths = (
  pose: Pose,
  id: keyof typeof ADDITIONAL_SEGMENT_RULES,
  reference: Pose = stand,
): Pose =>
  keepSegmentLengths(pose, [reference], ADDITIONAL_SEGMENT_RULES[id] ?? []);
const mat: FigureSpec['props'] = [{ type: 'mat', x1: 16, x2: 184 }];
const wall: FigureSpec['props'] = [{ type: 'wall', x: 157 }];
const twoDumbbells: FigureSpec['held'] = {
  kind: 'dumbbell',
  hands: ['hR', 'hL'],
};
const oneDumbbell: FigureSpec['held'] = { kind: 'dumbbell', hands: ['hR'] };
const oneBell: FigureSpec['held'] = { kind: 'kettlebell', hands: ['hR'] };
const hinge = p(
  [145, 108],
  [132, 111],
  [91, 124],
  [
    [126, 134],
    [122, 155],
    [112, 136],
    [98, 155],
  ],
  [
    [104, 148],
    [108, 174],
    [119, 177],
    [87, 149],
    [86, 174],
    [97, 177],
  ],
);
const rowStart = p(
  [141, 94],
  [127, 99],
  [86, 119],
  [
    [124, 123],
    [121, 147],
    [143, 111],
    [151, 122],
  ],
  [
    [108, 148],
    [111, 174],
    [122, 177],
    [75, 147],
    [63, 174],
    [74, 177],
  ],
);
const floorBaseRaw = p(
  [39, 167],
  [54, 170],
  [99, 171],
  [
    [70, 174],
    [70, 151],
    [50, 174],
    [50, 151],
  ],
  [
    [125, 145],
    [146, 174],
    [157, 177],
    [117, 143],
    [136, 174],
    [147, 177],
  ],
);

/** Same pose with the far knee solved so both legs are equally long. */
const floorBase: Pose = {
  ...floorBaseRaw,
  kL: joint(
    floorBaseRaw.hip,
    floorBaseRaw.aL,
    Math.hypot(26, 26),
    Math.hypot(21, 29),
    -1,
  ),
};

/** One-arm floor press: upper arm rotates while the forearm stays upright. */
export function kettlebellFloorPressPose(progress: number): Pose {
  const t = Math.min(1, Math.max(0, progress));
  const angle = Math.asin(4 / 26) * (1 - t) - (Math.PI / 2) * t;
  const elbow: P = [
    floorBase.neck[0] + 26 * Math.cos(angle),
    floorBase.neck[1] + 26 * Math.sin(angle),
  ];
  return {
    ...floorBase,
    eR: elbow,
    hR: [elbow[0], elbow[1] - 26],
    // The resting arm has the pressing arm's lengths (26 + 26) and lies on the mat.
    eL: [79.7, 174],
    hL: [105.7, 174],
  };
}

/** Two-arm floor press: both upper arms rotate with the forearms upright. */
export function floorPressPose(progress: number): Pose {
  const t = Math.min(1, Math.max(0, progress));
  const angle = Math.asin(4 / 26) * (1 - t) - (Math.PI / 2) * t;
  const arm = (a: number): [P, P] => {
    const elbow: P = [
      floorBase.neck[0] + 26 * Math.cos(a),
      floorBase.neck[1] + 26 * Math.sin(a),
    ];
    return [elbow, [elbow[0], elbow[1] - 26]];
  };
  const [eR, hR] = arm(angle);
  const [eL, hL] = arm(angle - 0.16);
  return { ...floorBase, eR, hR, eL, hL };
}

/** Fixed-length, softly bent arm arc for a floor-limited pullover. */
export function dumbbellPulloverPose(progress: number): Pose {
  const t = Math.max(0, Math.min(1, progress));
  const upperArm = 24;
  const forearm = 23;
  const softBend = (15 * Math.PI) / 180;
  const shoulderAngle = ((-90 - 94 * t) * Math.PI) / 180;
  const elbow: P = [
    floorBase.neck[0] + upperArm * Math.cos(shoulderAngle),
    floorBase.neck[1] + upperArm * Math.sin(shoulderAngle),
  ];
  const handAngle = shoulderAngle + softBend;
  const hand: P = [
    elbow[0] + forearm * Math.cos(handAngle),
    elbow[1] + forearm * Math.sin(handAngle),
  ];
  return {
    ...floorBase,
    eR: elbow,
    hR: hand,
    eL: elbow,
    hL: hand,
  };
}

/** Handle height of the dumbbells on the floor (resting hand centre). */
const RENEGADE_HAND_Y = 172;
const RENEGADE_ROW_TOP: P = [98, 147];

/**
 * Renegade row, side view: the straight-arm plank of pushUp(0) with both hands
 * on dumbbell handles. The far arm (L) supports on its dumbbell; the near arm
 * (R) rows the hand to hip height with the elbow above the back. Neck, hips and
 * ankles are fixed; both arms keep constant limb lengths through joint().
 */
export function renegadeRowPose(progress: number): Pose {
  const t = Math.min(1, Math.max(0, progress));
  const base = pushUp(0);
  const neck = base.neck;
  const reach = RENEGADE_HAND_Y - neck[1];
  // Long enough that the offset far arm is exactly straight on its handle.
  const upper = Math.hypot(4, reach) / 2;
  const rest: P = [neck[0], RENEGADE_HAND_Y];
  const hand: P = [
    rest[0] + (RENEGADE_ROW_TOP[0] - rest[0]) * t,
    rest[1] + (RENEGADE_ROW_TOP[1] - rest[1]) * t,
  ];
  const farHand: P = [neck[0] + 4, RENEGADE_HAND_Y];
  return {
    ...base,
    eR: joint(neck, hand, upper, upper, -1),
    hR: hand,
    eL: joint(neck, farHand, upper, upper, -1),
    hL: farHand,
  };
}

/** Hip pivot, trunk length (hip to neck) and head length for the weighted sit-up. */
// y 172.5 + stroke 3 = mat top 175.5: back and pelvis lie on the mat at the start.
const SITUP_HIP: P = [97, 172.5];
const SITUP_TRUNK = 48;
const SITUP_HEAD = 14;
const SITUP_MAX_ANGLE = (65 * Math.PI) / 180;

/**
 * Weighted sit-up, side view: the whole trunk rotates rigidly about the hip
 * (0 to 65 degrees) with constant neck-hip length. Both hands hold the
 * dumbbell at one chest point; feet and knees stay fixed on the floor.
 */
export function weightedSitUpPose(progress: number): Pose {
  const t = Math.min(1, Math.max(0, progress));
  const phi = SITUP_MAX_ANGLE * t;
  const ux = -Math.cos(phi),
    uy = -Math.sin(phi);
  const hip = SITUP_HIP;
  const neck: P = [hip[0] + SITUP_TRUNK * ux, hip[1] + SITUP_TRUNK * uy];
  // Lying, the head rests on the mat with the chin tucked up (0.55 rad over the
  // trunk line at the start), then follows the trunk line as it rolls up.
  const headAngle = phi + 0.55 * (1 - t);
  const head: P = [
    neck[0] - SITUP_HEAD * Math.cos(headAngle),
    neck[1] - SITUP_HEAD * Math.sin(headAngle),
  ];
  // Chest point: along the trunk, offset 7 towards the front (knee side).
  const chest: P = [
    hip[0] + 0.7 * SITUP_TRUNK * ux + 7 * Math.sin(phi),
    hip[1] + 0.7 * SITUP_TRUNK * uy - 7 * Math.cos(phi),
  ];
  const elbow = joint(neck, chest, 17, 17, -1);
  const ar: P = [140, 174],
    al: P = [136, 174];
  return {
    head,
    neck,
    hip,
    eR: elbow,
    hR: chest,
    eL: elbow,
    hL: chest,
    kR: joint(hip, ar, 36, 34, -1),
    aR: ar,
    tR: [ar[0] + 9, ar[1] + 3],
    kL: joint(hip, al, 36, 34, -1),
    aL: al,
    tL: [al[0] + 9, al[1] + 3],
  };
}

const shoulderStart = p(
  [99, 69],
  [98, 83],
  [98, 123],
  [
    [121, 94],
    [120, 71],
    [76, 94],
    [77, 71],
  ],
  [
    [104, 150],
    [108, 174],
    [119, 177],
    [90, 150],
    [86, 174],
    [97, 177],
  ],
);
const bridgeStart = p(
  [40, 167],
  [55, 171],
  [99, 171],
  [
    [70, 174],
    [88, 174],
    [63, 174],
    [81, 174],
  ],
  [
    [123, 143],
    [145, 174],
    [156, 177],
    [115, 141],
    [136, 174],
    [147, 177],
  ],
);
const lungeEnd = p(
  [104, 85],
  [102, 99],
  [100, 138],
  [
    [105, 121],
    [108, 141],
    [91, 121],
    [88, 141],
  ],
  [
    [131, 141],
    [133, 174],
    [145, 177],
    [77, 164],
    [55, 167],
    [62, 177],
  ],
);

function forwardBendingKnee(hip: P, ankle: P): P {
  const upper = 34;
  const lower = 32;
  const dx = ankle[0] - hip[0];
  const dy = ankle[1] - hip[1];
  const reach = Math.hypot(dx, dy);
  const along = (upper * upper - lower * lower + reach * reach) / (2 * reach);
  const height = Math.sqrt(Math.max(0, upper * upper - along * along));
  const base: P = [
    hip[0] + (dx / reach) * along,
    hip[1] + (dy / reach) * along,
  ];
  const offset: P = [(-dy / reach) * height, (dx / reach) * height];
  const first: P = [base[0] + offset[0], base[1] + offset[1]];
  const second: P = [base[0] - offset[0], base[1] - offset[1]];
  // In this right-facing profile the forward bend is the knee farther right.
  return first[0] >= second[0] ? first : second;
}

/** One camera-following two-step cycle; t=1 returns to the right lead pose. */
export function walkingLungePose(progress: number): Pose {
  const t = Math.max(0, Math.min(1, progress));
  const cycleT = t === 1 ? 0 : t;
  const rightIsLead = cycleT < 0.5;
  const phase = rightIsLead ? cycleT * 2 : (cycleT - 0.5) * 2;
  const stanceX = 132 - 59 * phase;
  const swingX = 73 + 59 * phase;
  const lift = Math.sin(Math.PI * phase);
  const hip: P = [100, 128 - 18 * lift];
  const neck: P = [100, hip[1] - 44];
  const head: P = [100, neck[1] - 14];
  const stanceAnkle: P = [stanceX, 174];
  const swingAnkle: P = [swingX, 174 - 24 * lift];
  const rightAnkle = rightIsLead ? stanceAnkle : swingAnkle;
  const leftAnkle = rightIsLead ? swingAnkle : stanceAnkle;
  const ankleToe = (ankle: P): P => [ankle[0] + 12, ankle[1] + 3];
  const eR: P = [neck[0] + 13, neck[1] + 22];
  const hR: P = [neck[0] + 16, neck[1] + 47];
  const eL: P = [neck[0] - 13, neck[1] + 22];
  const hL: P = [neck[0] - 16, neck[1] + 47];
  return p(
    head,
    neck,
    hip,
    [eR, hR, eL, hL],
    [
      forwardBendingKnee(hip, rightAnkle),
      rightAnkle,
      ankleToe(rightAnkle),
      forwardBendingKnee(hip, leftAnkle),
      leftAnkle,
      ankleToe(leftAnkle),
    ],
  );
}

const supportedStand = p(
  [99, 60],
  [98, 74],
  [98, 118],
  [
    [126, 86],
    [155, 99],
    [122, 90],
    [155, 103],
  ],
  [
    [101, 148],
    [101, 174],
    [112, 177],
    [92, 148],
    [88, 174],
    [99, 177],
  ],
);

/** Flex at a fixed knee; preserve shin/foot lengths throughout the arc. */
export function hamstringCurlPose(progress: number): Pose {
  const angle = Math.min(1, Math.max(0, progress)) * ((2 * Math.PI) / 3);
  const knee = supportedStand.kR;
  const rotate = ([x, y]: P): P => {
    const dx = x - knee[0];
    const dy = y - knee[1];
    return [
      knee[0] + dx * Math.cos(angle) - dy * Math.sin(angle),
      knee[1] + dx * Math.sin(angle) + dy * Math.cos(angle),
    ];
  };
  return {
    ...supportedStand,
    aR: rotate(supportedStand.aR),
    tR: rotate(supportedStand.tR),
  };
}
const seatedKneeExtensionStart = p(
  [85, 76],
  [84, 90],
  [83, 133],
  [
    [88, 111],
    [103, 133],
    [78, 111],
    [95, 133],
  ],
  [
    [115, 135],
    [115, 174],
    [126, 177],
    [107, 133],
    [106, 174],
    [117, 177],
  ],
);
/** Extend at a fixed knee, with the shin and foot rotating as one rigid segment. */
export function seatedKneeExtensionPose(progress: number): Pose {
  const base = seatedKneeExtensionStart;
  const knee = base.kR;
  const thighAngle = Math.atan2(knee[1] - base.hip[1], knee[0] - base.hip[0]);
  const shinAngle = Math.atan2(base.aR[1] - knee[1], base.aR[0] - knee[0]);
  const angle = Math.min(1, Math.max(0, progress)) * (thighAngle - shinAngle);
  const rotate = ([x, y]: P): P => {
    const dx = x - knee[0];
    const dy = y - knee[1];
    return [
      knee[0] + dx * Math.cos(angle) - dy * Math.sin(angle),
      knee[1] + dx * Math.sin(angle) + dy * Math.cos(angle),
    ];
  };
  return { ...base, aR: rotate(base.aR), tR: rotate(base.tR) };
}
const prone = p(
  [37, 165],
  [51, 170],
  [99, 171],
  [
    [45, 175],
    [29, 175],
    [48, 176],
    [31, 176],
  ],
  [
    [130, 173],
    [159, 174],
    [167, 177],
    [128, 169],
    [157, 170],
    [165, 173],
  ],
);
/**
 * Side-lying base (hip abduction / adduction). Both arms are 16.6 + 15, both
 * legs 30 + 30 with 9.5 feet, so near and far limbs match and the lifted leg
 * can keep its length (`SEGMENT_RULES`). The lower arm lies under the head,
 * the upper hand rests on the mat in front of the chest and belly. The
 * pelvis lies on the mat (centre 172.5 + stroke 3 = mat top 175.5) and the
 * trunk is 47.1 as before.
 */
const sideLying = p(
  [38, 161.4],
  [52, 169.4],
  [99, 172.5],
  [
    [36.05, 174],
    [21, 175.5],
    [67.52, 175.3],
    [82.5, 176],
  ],
  [
    [128.9, 172.5],
    [158.7, 172.5],
    [167.7, 175.5],
    [118.2, 149.5],
    [138, 172],
    [146.6, 176],
  ],
);

/**
 * Weighted glute bridge, side view. Shoulders stay on the mat, the pelvis rests
 * on it at the start (centre 172.5 + stroke 3 = mat top 175.5) and rises along
 * the trunk's arc; trunk 44, arms 23 + 23 (hands and dumbbell ride on the
 * hips), legs 36 + 39.5 and the planted feet keep their lengths all the way
 * (`ADDITIONAL_SEGMENT_RULES`).
 */
const wgbHip: Pt = [99, 172.5];
const wgbArm = (hand: Pt) => solveTwoBone(bridgeStart.neck, hand, 23, 23, -1);
const wgbLeg = (hip: Pt, ankle: Pt) => solveTwoBone(hip, ankle, 36, 39.5, -1);
const wgbStart: Pose = (() => {
  // One dumbbell on the pelvis: both hands at the same point, 4 above the hip.
  const hand = wgbArm([wgbHip[0], wgbHip[1] - 4]);
  return {
    ...bridgeStart,
    hip: wgbHip,
    eR: hand.mid,
    hR: hand.end,
    eL: hand.mid,
    hL: hand.end,
    kR: wgbLeg(wgbHip, bridgeStart.aR).mid,
    kL: wgbLeg(wgbHip, bridgeStart.aL).mid,
  };
})();
const wgbEnd: Pose = withLengths(
  {
    ...wgbStart,
    hip: [95.2, 153],
    hR: [95.2, 149],
    hL: [95.2, 149],
  },
  'weighted-glute-bridge',
  wgbStart,
);

/**
 * Overhead triceps extension, side view. The upper arms stay beside the head
 * (elbows above the shoulders); the forearm (29.5) turns about the elbow from
 * the straight overhead start (phase 0), behind the head, to the lowered
 * position (phase 1) and back. Both hands share the one dumbbell.
 */
const TRICEPS_ELBOW: Pt = [104, 44];
const TRICEPS_FOREARM = 29.5;
const TRICEPS_UP = Math.atan2(
  TRICEPS_ELBOW[1] - stand.neck[1],
  TRICEPS_ELBOW[0] - stand.neck[0],
);
const TRICEPS_TURN = 2.46;
export function overheadTricepsPose(progress: number): Pose {
  const t = Math.min(1, Math.max(0, progress));
  const angle = TRICEPS_UP - TRICEPS_TURN * t;
  const hand: Pt = [
    TRICEPS_ELBOW[0] + TRICEPS_FOREARM * Math.cos(angle),
    TRICEPS_ELBOW[1] + TRICEPS_FOREARM * Math.sin(angle),
  ];
  return { ...stand, eR: TRICEPS_ELBOW, hR: hand, eL: TRICEPS_ELBOW, hL: hand };
}

/**
 * Russian twist, profile. Seated and leaning back with both heels down (trunk,
 * head and legs as before); only the weight and the arms follow the turn. The
 * turn is the oblique view's `yaw = -sin(2 pi t)` (0 and 0.5 centre, 0.25 left,
 * 0.75 right); the arms keep their lengths (22 + 18) and the two hands share
 * one point.
 */
const TWIST_BASE = p(
  [80, 113],
  [84, 127],
  [100, 171],
  [
    [97, 141],
    [100, 152],
    [97, 141],
    [100, 152],
  ],
  [
    [80, 146],
    [79, 173],
    [68, 176],
    [120, 146],
    [121, 173],
    [132, 176],
  ],
);
export function russianTwistSidePose(progress: number): Pose {
  const t = Math.min(1, Math.max(0, progress));
  const yaw = -Math.sin(2 * Math.PI * t);
  // Right (yaw > 0) is the near side: the weight passes in front of the near hip.
  const weight: Pt = [100 + 4 * yaw, 152 + 6 * yaw];
  const grip = solveTwoBone(TWIST_BASE.neck, weight, 22, 18, -1);
  return {
    ...TWIST_BASE,
    eR: grip.mid,
    hR: grip.end,
    eL: grip.mid,
    hL: grip.end,
  };
}

/** Individually authored start/mid/end geometry; no fallback motion for new IDs. */
export const additionalFigures = {
  'kettlebell-floor-press': {
    start: kettlebellFloorPressPose(0),
    end: kettlebellFloorPressPose(1),
    props: mat,
    held: oneBell,
  },
  'kettlebell-rack-carry': {
    // One whole two-step cycle per loop: stance foot planted, swing foot lifts.
    start: rackCarryPose(0),
    end: rackCarryPose(0.5),
    motion: 'sequence',
    props: [],
    held: oneBell,
  },
  'goblet-squat': {
    start: squatFamilyPose('goblet-squat', 0),
    end: squatFamilyPose('goblet-squat', 1),
    props: [],
    held: oneDumbbell,
  },
  'kettlebell-goblet-squat': {
    start: squatFamilyPose('kettlebell-goblet-squat', 0),
    end: squatFamilyPose('kettlebell-goblet-squat', 1),
    props: [],
    // In the side projection both hands overlap around the horns; render the
    // single bell at their shared grip point, with its mass below the palms.
    held: oneBell,
  },
  // Hip hinge family: fixed ankles, IK legs and plumb arms (hingeFamilyKeyframes).
  'kettlebell-deadlift': {
    start: hingeFamilyPose('kettlebell-deadlift', 0),
    end: hingeFamilyPose('kettlebell-deadlift', 1),
    props: [],
    held: oneBell,
  },
  'dumbbell-rdl': {
    start: hingeFamilyPose('dumbbell-rdl', 0),
    end: hingeFamilyPose('dumbbell-rdl', 1),
    props: [],
    held: twoDumbbells,
  },
  'supported-row': {
    start: rowStart,
    end: { ...rowStart, eR: [101, 101], hR: [102, 124] },
    props: [{ type: 'step', x: 140, y: 125, w: 31 }],
    held: oneDumbbell,
  },
  'bent-over-row': {
    // Keep the hinge and stance fixed; row both dumbbells from a dead hang
    // toward the hip line without changing the back angle.
    // Both arms keep the standing arm lengths (24.6 + 22.6). They hang almost
    // straight under the shoulder at the start; the far arm sits just behind the
    // near one, so the two read as a pair in profile.
    start: withLengths(
      { ...hinge, hR: [129, 157], hL: [124, 158] },
      'bent-over-row',
    ),
    end: withLengths(
      { ...hinge, hR: [105, 137], hL: [100, 138] },
      'bent-over-row',
    ),
    props: [],
    held: twoDumbbells,
  },
  'sumo-squat': {
    start: p(
      [99, 60],
      [98, 74],
      [98, 118],
      [
        [113, 108],
        [98, 143],
        [83, 108],
        [98, 143],
      ],
      [
        [110.5, 146],
        [123, 174],
        [140, 177],
        [85.5, 146],
        [73, 174],
        [56, 177],
      ],
    ),
    end: p(
      [99, 81],
      [98, 95],
      [98, 137],
      [
        [119, 130],
        [98, 158],
        [77, 130],
        [98, 158],
      ],
      [
        [130, 151],
        [123, 174],
        [140, 177],
        [66, 151],
        [73, 174],
        [56, 177],
      ],
    ),
    props: [],
    // Both hands meet at one logical handle. Hold the dumbbell once at that
    // shared point rather than drawing a second copy for the far hand.
    held: oneDumbbell,
  },
  'floor-press': {
    start: floorPressPose(0),
    end: floorPressPose(1),
    props: mat,
    held: twoDumbbells,
  },
  'shoulder-press': {
    start: shoulderStart,
    end: {
      ...shoulderStart,
      eR: [112, 59],
      hR: [108, 34],
      eL: [84, 59],
      hL: [88, 34],
    },
    props: [],
    held: twoDumbbells,
  },
  'farmer-carry': {
    // One whole two-step cycle per loop: stance foot planted, swing foot lifts.
    start: farmerCarryPose(0),
    end: farmerCarryPose(0.5),
    motion: 'sequence',
    props: [],
    held: twoDumbbells,
  },
  'squat-curl': {
    start: squatFamilyPose('squat-curl', 0),
    end: squatFamilyPose('squat-curl', SQUAT_CURL_TOP),
    // One way through the rep: squat with hanging arms, rise while curling,
    // lower the dumbbells standing, back to the first frame.
    motion: 'sequence',
    props: [],
    held: twoDumbbells,
  },
  thruster: {
    // One pass per rep (a sequence): standing with the weights at the shoulders,
    // down into the squat, drive and press overhead, lower back to the shoulders.
    start: squatFamilyPose('thruster', 0),
    end: squatFamilyPose('thruster', THRUSTER_TOP),
    motion: 'sequence',
    props: [],
    held: twoDumbbells,
  },
  'single-arm-thruster': {
    start: squatFamilyPose('single-arm-thruster', 0),
    end: squatFamilyPose('single-arm-thruster', THRUSTER_TOP),
    motion: 'sequence',
    props: [],
    held: oneDumbbell,
  },
  'biceps-curl': {
    start: {
      ...stand,
      eR: [111, 97],
      hR: [113, 121],
      eL: [85, 97],
      hL: [83, 121],
    },
    end: { ...stand, eR: [111, 97], hR: [125, 79], eL: [85, 97], hL: [99, 79] },
    props: [],
    held: twoDumbbells,
  },
  'hammer-curl': {
    start: {
      ...stand,
      eR: [109, 98],
      hR: [111, 122],
      eL: [84, 98],
      hL: [82, 122],
    },
    end: { ...stand, eR: [109, 98], hR: [123, 80], eL: [84, 98], hL: [98, 80] },
    props: [],
    held: twoDumbbells,
  },
  'lateral-raise': {
    start: {
      ...stand,
      eR: [109, 96],
      hR: [115, 118],
      eL: [86, 96],
      hL: [80, 118],
    },
    end: { ...stand, eR: [126, 78], hR: [151, 81], eL: [70, 78], hL: [45, 81] },
    props: [],
    held: twoDumbbells,
  },
  'triceps-kickback': {
    start: { ...rowStart, eR: [100, 110], hR: [103, 136] },
    end: { ...rowStart, eR: [100, 110], hR: [76, 120] },
    props: [{ type: 'step', x: 140, y: 125, w: 31 }],
    held: oneDumbbell,
  },
  'glute-bridge': {
    start: bridgeStart,
    end: { ...bridgeStart, hip: [99, 146], kR: [124, 144], kL: [116, 142] },
    props: mat,
  },
  'weighted-glute-bridge': {
    start: wgbStart,
    // The pelvis, hands, and single dumbbell rise as one unit. The top is
    // aligned from shoulders through hips toward knees rather than arched.
    end: wgbEnd,
    props: mat,
    // Both hands meet at the same center; render one dumbbell there.
    held: oneDumbbell,
  },
  'overhead-triceps-extension': {
    // Phase 0: the weight straight overhead; the first movement is the lowering.
    start: overheadTricepsPose(0),
    end: overheadTricepsPose(1),
    props: [],
    // Hands meet at one logical point so the shared dumbbell renders once.
    held: oneDumbbell,
  },
  'dumbbell-pullover': {
    start: dumbbellPulloverPose(0),
    middle: dumbbellPulloverPose(0.5),
    end: dumbbellPulloverPose(1),
    props: mat,
    held: oneDumbbell,
  },
  'side-lunge': {
    // The weight is held near the chest (hands 14 in front of and 16 below the
    // neck) in the whole movement; arms, legs and trunk keep the standing lengths.
    start: withLengths(
      { ...stand, hR: [112, 90], hL: [110, 92] },
      'side-lunge',
    ),
    // Side angle shows the controlled lowering and upright braced trunk;
    // the front angle carries the lateral weight shift and wide stance.
    end: withLengths(
      {
        ...stand,
        head: [93, 78.2],
        neck: [92, 92.2],
        hip: [88, 136],
        hR: [106, 108],
        hL: [104, 110],
      },
      'side-lunge',
    ),
    props: [],
    held: oneDumbbell,
  },
  'walking-lunge': {
    start: walkingLungePose(0),
    // Reduced-motion start/end show the alternating lead legs.
    end: walkingLungePose(0.5),
    props: [],
    held: twoDumbbells,
    motion: 'sequence',
  },
  'russian-twist': {
    // The same left - right - centre turn as the oblique view (`yaw`), in
    // profile: turning toward the near side brings the weight down and forward
    // over the near hip, turning away takes it up and back, out of sight.
    start: russianTwistSidePose(0),
    end: russianTwistSidePose(0.75),
    props: [],
    held: { kind: 'dumbbell', hands: ['hR', 'hL'] },
    motion: 'sequence',
  },
  'kettlebell-halo': {
    // Side projection of a circle round the head: front of the face, beside
    // the ear, then behind the head. Both hands share one grip on the horns.
    // Both arms keep the standing arm lengths; only the hands circle the head.
    start: withLengths(
      { ...stand, hR: [116, 70], hL: [116, 70] },
      'kettlebell-halo',
    ),
    middle: withLengths(
      { ...stand, hR: [100, 66], hL: [100, 66] },
      'kettlebell-halo',
    ),
    end: withLengths(
      { ...stand, hR: [84, 68], hL: [84, 68] },
      'kettlebell-halo',
    ),
    props: [],
    held: oneBell,
  },
  'renegade-row': {
    start: renegadeRowPose(0),
    end: renegadeRowPose(1),
    props: [],
    held: twoDumbbells,
  },
  'weighted-sit-up': {
    start: weightedSitUpPose(0),
    end: weightedSitUpPose(1),
    props: mat,
    held: oneDumbbell,
  },
  woodchop: {
    // Low-to-high diagonal: both hands share one grip on the single weight,
    // starting beside the working hip and finishing high over the far shoulder.
    // Trunk and both arms keep the standing lengths (44, 24.6 + 22.6): the
    // hands go where the weight goes, the arms are solved from the shoulder.
    start: withLengths(
      {
        ...stand,
        head: [101, 62],
        neck: [99, 76],
        kR: [105, 148],
        // Start-side foot flat; it then pivots on the ball of the foot (heel
        // turns up, segment lengths kept) and the knee follows the chop.
        kL: [91, 148],
        hR: [104, 124],
        hL: [104, 124],
      },
      'woodchop',
    ),
    middle: withLengths(
      {
        ...stand,
        kR: [110.1, 146.1],
        aR: [108.6, 172.4],
        tR: [119, 177],
        hR: [142, 76],
        hL: [142, 76],
      },
      'woodchop',
    ),
    end: withLengths(
      {
        ...stand,
        head: [97, 60],
        kR: [113.2, 144.6],
        aR: [109.5, 170.6],
        tR: [119, 177],
        hR: [112, 28],
        hL: [112, 28],
      },
      'woodchop',
    ),
    props: [],
    held: oneDumbbell,
  },
  'reverse-lunge': {
    start: p(
      [130, 60],
      [129, 74],
      [129, 118],
      [
        [140, 96],
        [145, 118],
        [118, 96],
        [113, 118],
      ],
      [
        [133, 148],
        [133, 174],
        [145, 177],
        [125, 148],
        [123, 174],
        [135, 177],
      ],
    ),
    middle: {
      ...stand,
      kR: [123, 148],
      aR: [133, 174],
      tR: [145, 177],
      kL: [77, 146],
      aL: [55, 168],
      tL: [62, 177],
    },
    end: lungeEnd,
    props: [],
    held: twoDumbbells,
  },
  'forward-lunge': {
    start: { ...stand, kR: [93, 148], aR: [89, 174], tR: [101, 177] },
    middle: {
      ...stand,
      hip: [101, 118],
      kR: [127, 145],
      aR: [141, 170],
      tR: [153, 173],
      kL: [88, 148],
      aL: [78, 174],
      tL: [90, 177],
    },
    end: {
      ...lungeEnd,
      kR: [135, 142],
      aR: [141, 174],
      tR: [153, 177],
      kL: [84, 165],
      aL: [78, 167],
      tL: [85, 177],
    },
    props: [],
    held: twoDumbbells,
  },
  'kettlebell-swing': {
    start: p(
      [140, 99],
      [127, 105],
      [87, 121],
      [
        [109, 121],
        [87, 141],
        [107, 123],
        [87, 141],
      ],
      [
        [104, 147],
        [108, 174],
        [119, 177],
        [88, 148],
        [86, 174],
        [97, 177],
      ],
    ),
    middle: p(
      [111, 70],
      [107, 84],
      [98, 119],
      [
        [132, 102],
        [151, 114],
        [130, 102],
        [151, 114],
      ],
      [
        [104, 148],
        [108, 174],
        [119, 177],
        [90, 148],
        [86, 174],
        [97, 177],
      ],
    ),
    end: {
      ...stand,
      eR: [126, 79],
      hR: [151, 82],
      eL: [124, 80],
      hL: [151, 82],
    },
    props: [],
    held: oneBell,
    motion: 'ballistic',
  },
  'one-arm-kettlebell-swing': {
    start: withLengths(
      p(
        [140, 99],
        [127, 105],
        [87, 121],
        [
          [109, 121],
          [87, 141],
          [124, 126],
          [121, 146],
        ],
        [
          [104, 147],
          [108, 174],
          [119, 177],
          [88, 148],
          [86, 174],
          [97, 177],
        ],
      ),
      'one-arm-kettlebell-swing',
    ),
    middle: withLengths(
      p(
        [111, 70],
        [107, 84],
        [98, 119],
        [
          [132, 102],
          [151, 114],
          [110, 108],
          [107, 130],
        ],
        [
          [104, 148],
          [108, 174],
          [119, 177],
          [90, 148],
          [86, 174],
          [97, 177],
        ],
      ),
      'one-arm-kettlebell-swing',
    ),
    end: withLengths(
      {
        ...stand,
        eR: [126, 79],
        hR: [151, 82],
        eL: [88, 98],
        hL: [86, 120],
      },
      'one-arm-kettlebell-swing',
    ),
    props: [],
    held: oneBell,
    motion: 'ballistic',
  },
  'kettlebell-press': {
    start: { ...stand, eR: [113, 93], hR: [111, 72] },
    end: { ...stand, eR: [108, 49], hR: [104, 27] },
    props: [],
    held: oneBell,
  },
  'half-squat': {
    start: supportedStand,
    end: p(
      [106, 78],
      [103, 92],
      [86, 128],
      [
        [131, 94],
        [155, 99],
        [130, 98],
        [155, 103],
      ],
      [
        [111, 150],
        [101, 174],
        [112, 177],
        [94, 150],
        [88, 174],
        [99, 177],
      ],
    ),
    props: wall,
  },
  'hamstring-curl': {
    start: hamstringCurlPose(0),
    end: hamstringCurlPose(1),
    props: wall,
  },
  'seated-knee-extension': {
    start: seatedKneeExtensionPose(0),
    end: seatedKneeExtensionPose(1),
    props: [{ type: 'chair', x: 66, y: 139, w: 47 }],
  },
  'straight-leg-raise': {
    start: p(
      [42, 138],
      [54, 146],
      [96, 171],
      [
        [56, 174],
        [76, 175],
        [50, 174],
        [69, 175],
      ],
      [
        [126, 173],
        [155, 174],
        [163, 177],
        [115, 143],
        [137, 174],
        [148, 177],
      ],
    ),
    end: p(
      [42, 138],
      [54, 146],
      [96, 171],
      [
        [56, 174],
        [76, 175],
        [50, 174],
        [69, 175],
      ],
      [
        [125, 158],
        [152, 146],
        [157, 139],
        [115, 143],
        [137, 174],
        [148, 177],
      ],
    ),
    props: mat,
  },
  'prone-leg-raise': {
    start: prone,
    end: { ...prone, kR: [129, 160], aR: [156, 149], tR: [164, 151] },
    props: mat,
  },
  'side-lying-hip-abduction': {
    start: sideLying,
    end: {
      ...sideLying,
      kR: [120.2, 151.3],
      aR: [141.4, 130.1],
      tR: [150.8, 128.5],
    },
    props: mat,
  },
  'side-lying-hip-adduction': {
    start: {
      ...sideLying,
      kL: [115.6, 147.7],
      aL: [130, 174],
      tL: [139, 177],
      kR: [128.9, 172.5],
      aR: [158.7, 172.5],
      tR: [167.7, 175.5],
    },
    end: {
      ...sideLying,
      kL: [115.6, 147.7],
      aL: [130, 174],
      tL: [139, 177],
      kR: [127.3, 162.5],
      aR: [155.5, 152],
      tR: [165, 152.8],
    },
    props: mat,
  },
  'calf-stretch': {
    start: p(
      [110, 66],
      [107, 80],
      [98, 119],
      [
        [130, 90],
        [155, 94],
        [128, 94],
        [155, 98],
      ],
      [
        [84, 146],
        [68, 174],
        [80, 177],
        [118, 145],
        [126, 174],
        [138, 177],
      ],
    ),
    end: p(
      [119, 68],
      [115, 82],
      [107, 122],
      [
        [134, 89],
        [155, 94],
        [132, 94],
        [155, 98],
      ],
      [
        [88, 148],
        [68, 174],
        [80, 177],
        [129, 144],
        [126, 174],
        [138, 177],
      ],
    ),
    props: wall,
    motion: 'hold',
  },
  // Both arms 28.5 + 31.5, both legs 29.5 + 28.5, both feet 9.5: the wall hand
  // and the hand on the ankle stay on their contacts.
  'quadriceps-stretch': {
    start: {
      ...supportedStand,
      eR: [72.8, 87.3],
      hR: [80, 118],
      eL: [124.3, 85],
      hL: [155, 92],
      kR: [100, 147.5],
      aR: [73.7, 136.5],
      tR: [68.3, 128.8],
      kL: [98.5, 147.5],
      aL: [88, 174],
      tL: [97.1, 176.7],
    },
    end: {
      ...supportedStand,
      eR: [77.9, 94.2],
      hR: [82, 125.4],
      eL: [124.3, 85],
      hL: [155, 92],
      kR: [100, 147.5],
      aR: [82, 125.4],
      tR: [73.8, 120.7],
      kL: [98.5, 147.5],
      aL: [88, 174],
      tL: [97.1, 176.7],
    },
    props: wall,
    motion: 'hold',
  },
  'hamstring-stretch': {
    start: p(
      [39, 167],
      [54, 170],
      [99, 171],
      [
        [82, 159.7],
        [107.6, 160.3],
        [81.6, 158.7],
        [107.1, 161.6],
      ],
      [
        [112, 139],
        [137, 148],
        [146, 144],
        [119, 145],
        [139, 174],
        [150, 177],
      ],
    ),
    end: p(
      [39, 167],
      [54, 170],
      [99, 171],
      [
        [80.5, 156.4],
        [105.9, 160.2],
        [80.4, 156.2],
        [105.6, 161.5],
      ],
      [
        [107, 140],
        [114, 108],
        [108, 100],
        [119, 145],
        [139, 174],
        [150, 177],
      ],
    ),
    props: mat,
    motion: 'hold',
  },
  // Arms 16.8 + 26.7, legs 31 + 30, feet 9.4 (constant, `SEGMENT_RULES`); the
  // band hands and the pressed ankle stay where they were.
  'band-leg-press': {
    start: p(
      [39, 164],
      [53, 170],
      [96, 171],
      [
        [69.8, 171.2],
        [86, 150],
        [69.7, 172],
        [79, 147],
      ],
      [
        [98.1, 140.1],
        [128, 143],
        [134.1, 135.8],
        [120.1, 151.5],
        [140, 174],
        [149.1, 176.5],
      ],
    ),
    end: p(
      [39, 164],
      [53, 170],
      [96, 171],
      [
        [69.8, 171.2],
        [86, 150],
        [69.7, 172],
        [79, 147],
      ],
      [
        [123, 155.8],
        [152, 148],
        [157, 140],
        [120.1, 151.5],
        [140, 174],
        [149.1, 176.5],
      ],
    ),
    props: mat,
  },
} satisfies Record<string, FigureSpec>;
