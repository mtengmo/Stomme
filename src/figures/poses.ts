import type { ExerciseId } from '../domain/types';
import { additionalFigures } from './additionalPoses';
import type { Pt } from './lerp';
import { rehabFigures } from './rehabPoses';

/**
 * Side-view skeleton in a 200x200 viewBox, facing right (floor poses: head
 * left). R = near side (the working side, drawn in blue), L = far side.
 * Floor line is y = 178.
 */
export interface Pose {
  head: Pt;
  neck: Pt;
  hip: Pt;
  eR: Pt;
  hR: Pt;
  eL: Pt;
  hL: Pt;
  kR: Pt;
  aR: Pt;
  tR: Pt;
  kL: Pt;
  aL: Pt;
  tL: Pt;
}

export type PoseKey = keyof Pose;
export const POSE_KEYS: readonly PoseKey[] = [
  'head',
  'neck',
  'hip',
  'eR',
  'hR',
  'eL',
  'hL',
  'kR',
  'aR',
  'tR',
  'kL',
  'aL',
  'tL',
];

export type Prop =
  | { type: 'chair'; x: number; y: number; w: number }
  | { type: 'step'; x: number; y: number; w: number }
  | { type: 'wall'; x: number }
  | { type: 'mat'; x1: number; x2: number };

export interface FigureSpec {
  start: Pose;
  end: Pose;
  middle?: Pose;
  motion?: 'controlled' | 'ballistic' | 'hold';
  props: Prop[];
  held?: { kind: 'dumbbell' | 'kettlebell'; hands: ('hR' | 'hL')[] };
}

/** Swap near and far side so the left side is the working one. */
export function swapSides(p: Pose): Pose {
  return {
    head: p.head,
    neck: p.neck,
    hip: p.hip,
    eR: p.eL,
    hR: p.hL,
    eL: p.eR,
    hL: p.hR,
    kR: p.kL,
    aR: p.aL,
    tR: p.tL,
    kL: p.kR,
    aL: p.aR,
    tL: p.tR,
  };
}

type P = Pt;
/** Positional pose builder: keeps the table below readable. */
function pose(
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

type PhysioPlaceholderId =
  | 'quad-set'
  | 'seated-knee-flexion'
  | 'band-knee-extension'
  | 'band-hip-extension'
  | 'balance-clock';

const baseFigures: Record<
  Exclude<ExerciseId, PhysioPlaceholderId>,
  FigureSpec
> = {
  ...additionalFigures,
  ...rehabFigures,
  'goblet-chair-squat': {
    start: pose(
      [97, 92],
      [92, 106],
      [82, 144],
      [
        [102, 124],
        [108, 108],
        [100, 124],
        [106, 108],
      ],
      [
        [114, 144],
        [114, 174],
        [124, 177],
        [111, 144],
        [111, 174],
        [121, 177],
      ],
    ),
    end: pose(
      [101, 66],
      [98, 80],
      [96, 118],
      [
        [106, 96],
        [110, 86],
        [104, 96],
        [108, 86],
      ],
      [
        [100, 148],
        [96, 174],
        [106, 177],
        [97, 148],
        [93, 174],
        [103, 177],
      ],
    ),
    props: [{ type: 'chair', x: 58, y: 146, w: 36 }],
    held: { kind: 'dumbbell', hands: ['hR'] },
  },
  'step-up': {
    start: pose(
      [104, 52],
      [102, 66],
      [100, 104],
      [
        [102, 84],
        [102, 102],
        [100, 84],
        [100, 102],
      ],
      [
        [131, 114],
        [130, 142],
        [140, 145],
        [95, 136],
        [88, 172],
        [98, 177],
      ],
    ),
    end: pose(
      [132, 32],
      [130, 46],
      [130, 84],
      [
        [130, 64],
        [130, 82],
        [128, 64],
        [128, 82],
      ],
      [
        [131, 114],
        [130, 142],
        [140, 145],
        [150, 112],
        [150, 138],
        [158, 140],
      ],
    ),
    props: [{ type: 'step', x: 110, y: 146, w: 48 }],
    held: { kind: 'dumbbell', hands: ['hR', 'hL'] },
  },
  'single-leg-rdl': {
    start: pose(
      [98, 66],
      [96, 80],
      [96, 118],
      [
        [96, 98],
        [96, 116],
        [94, 98],
        [94, 116],
      ],
      [
        [98, 148],
        [96, 174],
        [106, 177],
        [92, 148],
        [86, 174],
        [94, 177],
      ],
    ),
    end: pose(
      [146, 106],
      [134, 108],
      [96, 114],
      [
        [136, 126],
        [136, 144],
        [134, 126],
        [134, 144],
      ],
      [
        [98, 146],
        [96, 174],
        [106, 177],
        [68, 112],
        [40, 110],
        [37, 116],
      ],
    ),
    props: [],
    held: { kind: 'dumbbell', hands: ['hR'] },
  },
  'dead-bug': {
    start: pose(
      [50, 168],
      [64, 171],
      [104, 171],
      [
        [64, 151],
        [64, 131],
        [66, 151],
        [66, 131],
      ],
      [
        [104, 141],
        [132, 141],
        [138, 137],
        [106, 141],
        [134, 141],
        [140, 137],
      ],
    ),
    end: pose(
      [50, 168],
      [64, 171],
      [104, 171],
      [
        [40, 148],
        [22, 146],
        [66, 151],
        [66, 131],
      ],
      [
        [104, 141],
        [132, 141],
        [138, 137],
        [130, 168],
        [158, 170],
        [164, 166],
      ],
    ),
    props: [{ type: 'mat', x1: 14, x2: 186 }],
  },
  'side-plank': {
    start: pose(
      [47, 144],
      [60, 148],
      [104, 164],
      [
        [60, 172],
        [74, 174],
        [76, 150],
        [92, 160],
      ],
      [
        [128, 168],
        [152, 172],
        [158, 176],
        [130, 168],
        [154, 172],
        [160, 176],
      ],
    ),
    end: pose(
      [47, 132],
      [60, 136],
      [104, 150],
      [
        [60, 172],
        [74, 174],
        [60, 118],
        [60, 100],
      ],
      [
        [128, 161],
        [152, 172],
        [158, 176],
        [130, 161],
        [154, 172],
        [160, 176],
      ],
    ),
    props: [{ type: 'mat', x1: 14, x2: 186 }],
  },
  'split-squat': {
    start: pose(
      [113, 64],
      [110, 78],
      [108, 116],
      [
        [130, 90],
        [156, 98],
        [130, 92],
        [156, 100],
      ],
      [
        [122, 146],
        [120, 174],
        [130, 177],
        [96, 148],
        [78, 166],
        [84, 176],
      ],
    ),
    end: pose(
      [109, 86],
      [106, 100],
      [106, 138],
      [
        [132, 106],
        [156, 118],
        [132, 108],
        [156, 120],
      ],
      [
        [134, 142],
        [126, 174],
        [136, 177],
        [92, 168],
        [72, 166],
        [78, 176],
      ],
    ),
    props: [{ type: 'wall', x: 160 }],
  },
  'single-leg-hip-thrust': {
    start: pose(
      [38, 140],
      [50, 144],
      [96, 166],
      [
        [56, 164],
        [72, 174],
        [58, 164],
        [74, 174],
      ],
      [
        [118, 146],
        [136, 174],
        [146, 177],
        [120, 146],
        [138, 174],
        [148, 177],
      ],
    ),
    end: pose(
      [38, 140],
      [50, 144],
      [96, 142],
      [
        [56, 164],
        [72, 174],
        [58, 164],
        [74, 174],
      ],
      [
        [124, 144],
        [136, 174],
        [146, 177],
        [122, 126],
        [148, 110],
        [154, 114],
      ],
    ),
    props: [{ type: 'step', x: 24, y: 150, w: 44 }],
  },
  'single-leg-calf-raise': {
    start: pose(
      [102, 60],
      [100, 74],
      [100, 118],
      [
        [126, 86],
        [158, 94],
        [126, 88],
        [158, 96],
      ],
      [
        [101, 148],
        [100, 174],
        [110, 177],
        [98, 150],
        [84, 164],
        [80, 170],
      ],
    ),
    end: pose(
      [102, 52],
      [100, 66],
      [100, 110],
      [
        [126, 80],
        [158, 88],
        [126, 82],
        [158, 90],
      ],
      [
        [102, 141],
        [104, 166],
        [112, 177],
        [98, 142],
        [84, 156],
        [80, 162],
      ],
    ),
    props: [{ type: 'wall', x: 160 }],
  },
  'suitcase-carry': {
    start: pose(
      [102, 64],
      [100, 78],
      [100, 118],
      [
        [100, 98],
        [100, 118],
        [104, 98],
        [112, 112],
      ],
      [
        [110, 146],
        [116, 174],
        [126, 177],
        [92, 146],
        [84, 174],
        [94, 177],
      ],
    ),
    end: pose(
      [102, 64],
      [100, 78],
      [100, 118],
      [
        [100, 98],
        [100, 118],
        [96, 98],
        [88, 112],
      ],
      [
        [92, 146],
        [84, 174],
        [94, 177],
        [110, 146],
        [116, 174],
        [126, 177],
      ],
    ),
    props: [],
    held: { kind: 'kettlebell', hands: ['hR'] },
  },
  'bird-dog': {
    start: pose(
      [54, 126],
      [62, 138],
      [108, 138],
      [
        [62, 156],
        [62, 174],
        [64, 156],
        [64, 174],
      ],
      [
        [108, 170],
        [134, 172],
        [140, 176],
        [110, 170],
        [136, 172],
        [142, 176],
      ],
    ),
    end: pose(
      [54, 126],
      [62, 138],
      [108, 138],
      [
        [42, 138],
        [22, 138],
        [64, 156],
        [64, 174],
      ],
      [
        [108, 170],
        [134, 172],
        [140, 176],
        [134, 139],
        [160, 139],
        [166, 142],
      ],
    ),
    props: [{ type: 'mat', x1: 10, x2: 190 }],
  },
  'wall-sit': {
    start: pose(
      [78, 66],
      [76, 80],
      [76, 118],
      [
        [80, 98],
        [82, 116],
        [78, 98],
        [80, 116],
      ],
      [
        [78, 148],
        [78, 174],
        [88, 177],
        [76, 148],
        [76, 174],
        [86, 177],
      ],
    ),
    end: pose(
      [76, 92],
      [74, 106],
      [74, 144],
      [
        [82, 126],
        [98, 138],
        [80, 126],
        [96, 138],
      ],
      [
        [108, 144],
        [108, 174],
        [118, 177],
        [105, 144],
        [105, 174],
        [115, 177],
      ],
    ),
    props: [{ type: 'wall', x: 64 }],
  },
};

/** Static copy of another exercise's start pose: no motion, no band, no clock diagram. */
function staticPlaceholder(spec: FigureSpec): FigureSpec {
  return {
    start: spec.start,
    end: spec.start,
    motion: 'hold',
    props: spec.props,
  };
}

/**
 * TODO-figure-stage: placeholders only. Each shows a static start pose of a
 * related exercise until the real drawings (and the band and clock diagram)
 * are built. They must not be treated as correct technique.
 */
export const figures: Record<ExerciseId, FigureSpec> = {
  ...baseFigures,
  'quad-set': staticPlaceholder(baseFigures['straight-leg-raise']),
  'seated-knee-flexion': staticPlaceholder(
    baseFigures['seated-knee-extension'],
  ),
  'band-knee-extension': staticPlaceholder(
    baseFigures['seated-knee-extension'],
  ),
  'band-hip-extension': staticPlaceholder(baseFigures['hamstring-curl']),
  'balance-clock': staticPlaceholder(baseFigures['balance-pendulum']),
};
