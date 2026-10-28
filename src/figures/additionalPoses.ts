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
