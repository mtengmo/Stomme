import type { Pt } from './lerp';
import type { FigureSpec, Pose } from './poses';

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
const mat: FigureSpec['props'] = [{ type: 'mat', x1: 16, x2: 184 }];
const wall: FigureSpec['props'] = [{ type: 'wall', x: 157 }];
const twoDumbbells: FigureSpec['held'] = {
  kind: 'dumbbell',
  hands: ['hR', 'hL'],
};
const oneDumbbell: FigureSpec['held'] = { kind: 'dumbbell', hands: ['hR'] };
const oneBell: FigureSpec['held'] = { kind: 'kettlebell', hands: ['hR'] };
const gobletArms: [P, P, P, P] = [
  [117, 98],
  [111, 82],
  [108, 100],
  [108, 82],
];
const gobletStart = {
  ...stand,
  eR: gobletArms[0],
  hR: gobletArms[1],
  eL: gobletArms[2],
  hL: gobletArms[3],
};
const squatBottom = p(
  [112, 91],
  [105, 105],
  [81, 140],
  [
    [124, 123],
    [118, 108],
    [116, 125],
    [115, 109],
  ],
  [
    [120, 144],
    [108, 174],
    [119, 177],
    [99, 143],
    [86, 174],
    [97, 177],
  ],
);
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
const floorBase = p(
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
    eL: [78, 174],
    hL: [98, 174],
  };
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
const sideLying = p(
  [38, 157],
  [52, 165],
  [99, 168],
  [
    [46, 173],
    [31, 174],
    [70, 173],
    [79, 176],
  ],
  [
    [130, 170],
    [160, 173],
    [168, 176],
    [113, 151],
    [138, 172],
    [148, 176],
  ],
);

/** Individually authored start/mid/end geometry; no fallback motion for new IDs. */
export const additionalFigures = {
  'kettlebell-floor-press': {
    start: kettlebellFloorPressPose(0),
    end: kettlebellFloorPressPose(1),
    props: mat,
    held: oneBell,
  },
  'kettlebell-rack-carry': {
    start: {
      ...stand,
      eR: [105, 103],
      hR: [108, 78],
      kR: [111, 149],
      aR: [120, 174],
      tR: [132, 177],
      kL: [84, 148],
      aL: [77, 174],
      tL: [89, 177],
    },
    end: {
      ...stand,
      eR: [105, 103],
      hR: [108, 78],
      kR: [88, 148],
      aR: [79, 174],
      tR: [91, 177],
      kL: [110, 149],
      aL: [119, 174],
      tL: [131, 177],
    },
    props: [],
    held: oneBell,
  },
  'goblet-squat': {
    start: gobletStart,
    end: squatBottom,
    props: [],
    held: oneDumbbell,
  },
  'kettlebell-goblet-squat': {
    start: {
      ...stand,
      kR: [103.36, 148],
      kL: [91.57, 148],
      eR: [116, 100],
      hR: [110, 83],
      eL: [116, 100],
      hL: [110, 83],
    },
    end: {
      ...squatBottom,
      eR: [124, 123],
      hR: [116, 107],
      eL: [124, 123],
      hL: [116, 107],
    },
    props: [],
    // In the side projection both hands overlap around the horns; render the
    // single bell at their shared grip point, with its mass below the palms.
    held: oneBell,
  },
  'kettlebell-deadlift': {
    start: p(
      [134, 106],
      [121, 111],
      [88, 132],
      [
        [119, 139],
        [111, 157],
        [111, 141],
        [111, 157],
      ],
      [
        [111, 149],
        [108, 174],
        [119, 177],
        [89, 150],
        [86, 174],
        [97, 177],
      ],
    ),
    end: {
      ...stand,
      hR: [102, 133],
      hL: [102, 133],
      eR: [101, 103],
      eL: [99, 104],
    },
    props: [],
    held: oneBell,
  },
  'dumbbell-rdl': { start: stand, end: hinge, props: [], held: twoDumbbells },
  'supported-row': {
    start: rowStart,
    end: { ...rowStart, eR: [101, 101], hR: [102, 124] },
    props: [{ type: 'step', x: 140, y: 125, w: 31 }],
    held: oneDumbbell,
  },
  'bent-over-row': {
    // Keep the hinge and stance fixed; row both dumbbells from a dead hang
    // toward the hip line without changing the back angle.
    start: {
      ...hinge,
      eR: [126, 134],
      hR: [122, 155],
      eL: [112, 136],
      hL: [98, 155],
    },
    end: {
      ...hinge,
      eR: [114, 117],
      hR: [105, 137],
      eL: [105, 118],
      hL: [85, 137],
    },
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
    start: floorBase,
    end: {
      ...floorBase,
      eR: [70, 147],
      hR: [70, 121],
      eL: [50, 147],
      hL: [50, 121],
    },
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
    start: {
      ...stand,
      eR: [110, 97],
      hR: [113, 122],
      eL: [85, 97],
      hL: [82, 122],
      kR: [111, 149],
      aR: [120, 174],
      tR: [132, 177],
      kL: [84, 148],
      aL: [77, 174],
      tL: [89, 177],
    },
    end: {
      ...stand,
      eR: [110, 97],
      hR: [113, 122],
      eL: [85, 97],
      hL: [82, 122],
      kR: [88, 148],
      aR: [79, 174],
      tR: [91, 177],
      kL: [110, 149],
      aL: [119, 174],
      tL: [131, 177],
    },
    props: [],
    held: twoDumbbells,
  },
  'squat-curl': {
    start: {
      ...squatBottom,
      eR: [111, 128],
      hR: [114, 152],
      eL: [96, 128],
      hL: [100, 152],
    },
    end: { ...stand, eR: [111, 97], hR: [125, 79], eL: [85, 97], hL: [99, 79] },
    props: [],
    held: twoDumbbells,
  },
  thruster: {
    start: {
      ...squatBottom,
      eR: [120, 122],
      hR: [118, 104],
      eL: [104, 122],
      hL: [106, 104],
    },
    // A thruster finishes the squat and returns to the shoulder rack before
    // the overhead press starts. This waypoint also makes the lowering path
    // return overhead -> rack -> squat.
    middle: {
      ...stand,
      eR: [113, 93],
      hR: [111, 72],
      eL: [83, 93],
      hL: [85, 72],
    },
    end: {
      ...stand,
      eR: [112, 59],
      hR: [108, 34],
      eL: [84, 59],
      hL: [88, 34],
    },
    props: [],
    held: twoDumbbells,
  },
  'single-arm-thruster': {
    start: { ...squatBottom, eR: [120, 122], hR: [118, 104] },
    middle: { ...stand, eR: [113, 93], hR: [111, 72] },
    end: { ...stand, eR: [112, 59], hR: [108, 34] },
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
    start: {
      ...bridgeStart,
      hR: [99, 167],
      hL: [99, 167],
      eR: [77, 169],
      eL: [78, 173],
    },
    // The pelvis, hands, and single dumbbell rise as one unit. The top is
    // aligned from shoulders through hips toward knees rather than arched.
    end: {
      ...bridgeStart,
      hip: [99, 153],
      kR: [124, 144],
      kL: [116, 142],
      hR: [99, 149],
      hL: [99, 149],
      eR: [77, 155],
      eL: [78, 161],
    },
    props: mat,
    // Both hands meet at the same center; render one dumbbell there.
    held: oneDumbbell,
  },
  'overhead-triceps-extension': {
    start: {
      ...stand,
      eR: [124, 52],
      hR: [136, 74],
      eL: [125, 51],
      hL: [136, 74],
    },
    middle: {
      ...stand,
      eR: [124, 52],
      hR: [152, 41],
      eL: [125, 51],
      hL: [152, 41],
    },
    end: {
      ...stand,
      eR: [124, 52],
      hR: [150, 30],
      eL: [125, 51],
      hL: [150, 30],
    },
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
    start: {
      ...stand,
      eR: [116, 96],
      hR: [98, 117],
      eL: [80, 96],
      hL: [98, 117],
    },
    // Side angle shows the controlled lowering and upright braced trunk;
    // the front angle carries the lateral weight shift and wide stance.
    end: {
      ...stand,
      head: [91, 79],
      neck: [92, 93],
      hip: [88, 136],
      eR: [109, 111],
      hR: [91, 120],
      eL: [74, 111],
      hL: [91, 120],
      kR: [117, 151],
      aR: [108, 174],
      tR: [119, 177],
      kL: [79, 147],
      aL: [86, 174],
      tL: [97, 177],
    },
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
    start: p(
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
    ),
    end: p(
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
    ),
    props: [],
    held: { kind: 'dumbbell', hands: ['hR', 'hL'] },
    motion: 'sequence',
  },
  'kettlebell-halo': {
    // Side projection of a circle round the head: front of the face, beside
    // the ear, then behind the head. Both hands share one grip on the horns.
    start: {
      ...stand,
      eR: [112, 88],
      hR: [116, 70],
      eL: [112, 88],
      hL: [116, 70],
    },
    middle: {
      ...stand,
      eR: [102, 90],
      hR: [100, 66],
      eL: [102, 90],
      hL: [100, 66],
    },
    end: {
      ...stand,
      eR: [90, 88],
      hR: [84, 68],
      eL: [90, 88],
      hL: [84, 68],
    },
    props: [],
    held: oneBell,
  },
  woodchop: {
    // Low-to-high diagonal: both hands share one grip on the single weight,
    // starting beside the working hip and finishing high over the far shoulder.
    start: {
      ...stand,
      head: [101, 62],
      neck: [99, 76],
      kR: [105, 148],
      kL: [91, 148],
      eR: [100, 100],
      hR: [104, 124],
      eL: [100, 100],
      hL: [104, 124],
    },
    middle: {
      ...stand,
      eR: [120, 76],
      hR: [142, 76],
      eL: [120, 76],
      hL: [142, 76],
    },
    end: {
      ...stand,
      head: [97, 60],
      eR: [106, 50],
      hR: [112, 28],
      eL: [106, 50],
      hL: [112, 28],
    },
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
    start: p(
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
    middle: p(
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
    end: {
      ...stand,
      eR: [126, 79],
      hR: [151, 82],
      eL: [88, 98],
      hL: [86, 120],
    },
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
    end: { ...sideLying, kR: [124, 146], aR: [148, 124], tR: [156, 126] },
    props: mat,
  },
  'side-lying-hip-adduction': {
    start: {
      ...sideLying,
      kL: [120, 145],
      aL: [130, 174],
      tL: [141, 177],
      kR: [128, 173],
      aR: [156, 174],
      tR: [165, 177],
    },
    end: {
      ...sideLying,
      kL: [120, 145],
      aL: [130, 174],
      tL: [141, 177],
      kR: [128, 161],
      aR: [155, 155],
      tR: [164, 158],
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
  'quadriceps-stretch': {
    start: {
      ...supportedStand,
      eR: [87, 97],
      hR: [80, 118],
      kR: [100, 148],
      aR: [75, 137],
      tR: [70, 130],
    },
    end: {
      ...supportedStand,
      eR: [83, 99],
      hR: [80, 123],
      kR: [100, 148],
      aR: [80, 123],
      tR: [73, 119],
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
        [77, 151],
        [102, 145],
        [73, 149],
        [99, 143],
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
        [78, 150],
        [101, 142],
        [73, 148],
        [98, 140],
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
  'band-leg-press': {
    start: p(
      [39, 164],
      [53, 170],
      [96, 171],
      [
        [71, 172],
        [86, 150],
        [65, 170],
        [79, 147],
      ],
      [
        [102, 141],
        [128, 143],
        [134, 136],
        [119, 145],
        [140, 174],
        [151, 177],
      ],
    ),
    end: p(
      [39, 164],
      [53, 170],
      [96, 171],
      [
        [71, 172],
        [86, 150],
        [65, 170],
        [79, 147],
      ],
      [
        [124, 159],
        [152, 148],
        [157, 140],
        [119, 145],
        [140, 174],
        [151, 177],
      ],
    ),
    props: mat,
  },
} satisfies Record<string, FigureSpec>;
