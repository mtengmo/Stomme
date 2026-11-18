import type { ExerciseId } from '../domain/types';
import { solveTwoBone } from './keyframes';
import type { Pt } from './lerp';
import { movementPose } from './movementPose';
import { POSE_KEYS, type Pose, type PoseKey, type Prop } from './poses';

/**
 * One reusable yaw-only orthographic body model for lying and standing
 * exercises that need a second ("Sned vinkel") view.
 *
 * The body is authored in 3D (x right, y down as in the 200x200 viewBox, z
 * depth with + = the body side facing the camera). The camera only yaws about
 * the vertical axis, so y never changes. Raw projected joints shrink and
 * wander with the yaw; `fitLengths` regrows every segment from the projected
 * hip with constant, calibrated lengths so the drawn skeleton keeps its bone
 * lengths through the whole loop. Pure: no React, no module state besides a
 * length cache.
 */

export type P3 = readonly [x: number, y: number, z: number];

/** One 3D point per joint, plus the half widths of the pelvis and shoulder bars. */
export type Body3 = Record<PoseKey, P3> & {
  pelvisHalf: number;
  shoulderHalf: number;
  /** Direction of the pelvis bar (default across the body, along z). */
  pelvisAxis?: P3;
  /** Direction of the shoulder bar (default across the body, along z). */
  shoulderAxis?: P3;
};

/**
 * How a limb is regrown after projection: `free` keeps both segments along
 * their raw projected direction, `straight` is one straight limb of length
 * L1+L2, `pinned` keeps the end on its projected contact point and solves the
 * middle joint.
 */
export type LimbMode = 'free' | 'straight' | 'pinned';

export interface ObliqueSurface3 {
  kind: 'mat' | 'floor' | 'wall';
  corners: [P3, P3, P3, P3];
}

export interface ObliqueSurface {
  kind: ObliqueSurface3['kind'];
  pts: Pt[];
}

export interface ObliqueSpec {
  /** The exercise whose side-view figure supplies x and y. */
  profile: ExerciseId;
  yawDeg: number;
  /** Depth shear: y shifts by z * sin(elevDeg). Default 0 (pure yaw). */
  elevDeg?: number;
  /** Flat surfaces (mat, floor, wall) as 3D quads, projected like the body. */
  surfaces?: (t: number) => ObliqueSurface3[];
  /** A weight held in the working hand (drawn upright, press grip optional). */
  held?: { kind: 'dumbbell' | 'kettlebell'; pressGrip?: boolean };
  /** Own framing for this view (the side view keeps its FRAMING entry). */
  viewBox?: string;
  /** Which body side faces the camera: the working side or the support side. */
  near: 'working' | 'support';
  /** The 3D body at progress t, authored for the working side = right. */
  body: (t: number) => Body3;
  limbs: { armR: LimbMode; armL: LimbMode; legR: LimbMode; legL: LimbMode };
  /**
   * Take the projected limb lengths from one side only (the side whose limb
   * is pinned and straight-ish), instead of the shorter of both: a bent limb
   * foreshortens and would otherwise shrink the other side's reach.
   */
  lengthsFrom?: { arm?: 'R' | 'L'; leg?: 'R' | 'L' };
  /** Progress at which the projected segment lengths are measured (default 0). */
  calibrateAt?: number;
  /** Props in view space (already in the right-working orientation). */
  props: (t: number) => Prop[];
}

export interface SegmentLengths {
  headNeck: number;
  trunk: number;
  upperArm: number;
  forearm: number;
  thigh: number;
  shin: number;
  foot: number;
}

export interface ObliqueFrame {
  pose: Pose;
  /** Pelvis bar end points: [camera-near end, far end]. */
  pelvis: [Pt, Pt];
  /** Shoulder bar end points: [camera-near end, far end]. */
  shoulders: [Pt, Pt];
  /** The body side drawn last (closest to the camera). */
  near: 'R' | 'L';
  props: Prop[];
  surfaces: ObliqueSurface[];
}

type Working = 'right' | 'left';

const rad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Orthographic yaw about the vertical axis through x = cx, plus a depth shear:
 * a point at depth z is drawn z * sin(elevDeg) lower (near side) or higher
 * (far side). Points on the centre plane (z = 0) keep their y exactly, and y
 * never depends on x.
 */
export function project(p: P3, yawDeg: number, elevDeg = 0, cx = 96): Pt {
  const c = Math.cos(rad(yawDeg));
  const s = Math.sin(rad(yawDeg));
  return [
    cx + (p[0] - cx) * c - p[2] * s,
    p[1] + p[2] * Math.sin(rad(elevDeg)),
  ];
}

/**
 * Lift a side-view pose into 3D: x and y stay those of the profile pose, only
 * a constant depth is added. `depth` = +1 puts the right side towards the
 * camera, -1 the left side. Legs sit at +-7, arms and hands at +-10, head,
 * neck and hip on the body's centre plane. `override` replaces whole joints.
 */
export function fromProfile(
  profile: Pose,
  depth: 1 | -1 = 1,
  override: Partial<Record<PoseKey, P3>> = {},
  pelvisHalf = 8,
  shoulderHalf = 11,
): Body3 {
  const z: Record<PoseKey, number> = {
    head: 0,
    neck: 0,
    hip: 0,
    eR: 10 * depth,
    hR: 10 * depth,
    eL: -10 * depth,
    hL: -10 * depth,
    kR: 7 * depth,
    aR: 7 * depth,
    tR: 7 * depth,
    kL: -7 * depth,
    aL: -7 * depth,
    tL: -7 * depth,
  };
  const out = {} as Record<PoseKey, P3>;
  for (const k of POSE_KEYS)
    out[k] = override[k] ?? [profile[k][0], profile[k][1], z[k]];
  return { ...out, pelvisHalf, shoulderHalf };
}

const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);

function lengthsOf(pose: Pose, side: 'R' | 'L'): SegmentLengths {
  const e = side === 'R' ? pose.eR : pose.eL;
  const h = side === 'R' ? pose.hR : pose.hL;
  const k = side === 'R' ? pose.kR : pose.kL;
  const a = side === 'R' ? pose.aR : pose.aL;
  const t = side === 'R' ? pose.tR : pose.tL;
  return {
    headNeck: dist(pose.head, pose.neck),
    trunk: dist(pose.neck, pose.hip),
    upperArm: dist(pose.neck, e),
    forearm: dist(e, h),
    thigh: dist(pose.hip, k),
    shin: dist(k, a),
    foot: dist(a, t),
  };
}

const LENGTH_KEYS: readonly (keyof SegmentLengths)[] = [
  'headNeck',
  'trunk',
  'upperArm',
  'forearm',
  'thigh',
  'shin',
  'foot',
];
const PROFILE_SAMPLES = 21;

/** The raw projection of every joint (lengths not yet fitted). */
export function projectBody(body: Body3, yawDeg: number, elevDeg = 0): Pose {
  const out = {} as Record<PoseKey, Pt>;
  for (const k of POSE_KEYS) out[k] = project(body[k], yawDeg, elevDeg);
  return out as Pose;
}

const lengthCache = new WeakMap<ObliqueSpec, SegmentLengths>();

/**
 * One length per segment, shared by the right and left limb: the minimum of
 * the profile's right and left lengths (over the whole loop) and the raw
 * projected lengths at `calibrateAt`. The view therefore never draws a
 * segment longer than the profile does. Computed once per spec.
 */
export function viewLengths(
  spec: ObliqueSpec,
  profile: ExerciseId = spec.profile,
): SegmentLengths {
  const cached = lengthCache.get(spec);
  if (cached) return cached;
  const raw = projectBody(
    spec.body(spec.calibrateAt ?? 0),
    spec.yawDeg,
    spec.elevDeg ?? 0,
  );
  const from = spec.lengthsFrom ?? {};
  const legSide = from.leg;
  const armSide = from.arm;
  const sources: SegmentLengths[] = [
    lengthsOf(raw, 'R'),
    lengthsOf(raw, 'L'),
  ].map((l, i) => {
    const side = i === 0 ? 'R' : 'L';
    const out = { ...l };
    // Sides that are not the chosen one do not constrain that limb type.
    if (legSide && side !== legSide) {
      out.thigh = Infinity;
      out.shin = Infinity;
      out.foot = Infinity;
    }
    if (armSide && side !== armSide) {
      out.upperArm = Infinity;
      out.forearm = Infinity;
    }
    return out;
  });
  for (let i = 0; i < PROFILE_SAMPLES; i++) {
    const pose = movementPose(profile, i / (PROFILE_SAMPLES - 1));
    sources.push(lengthsOf(pose, 'R'), lengthsOf(pose, 'L'));
  }
  const out = {} as SegmentLengths;
  for (const key of LENGTH_KEYS)
    out[key] = Math.min(...sources.map((s) => s[key]));
  lengthCache.set(spec, out);
  return out;
}

const along = (from: Pt, to: Pt, length: number): Pt => {
  const d = dist(from, to);
  const [ux, uy] =
    d < 1e-9 ? [0, 1] : [(to[0] - from[0]) / d, (to[1] - from[1]) / d];
  return [from[0] + ux * length, from[1] + uy * length];
};

/** Two-bone solution that picks the bend side nearest the raw middle joint. */
function pinned(
  root: Pt,
  target: Pt,
  rawMid: Pt,
  l1: number,
  l2: number,
): { mid: Pt; end: Pt } {
  const a = solveTwoBone(root, target, l1, l2, 1);
  const b = solveTwoBone(root, target, l1, l2, -1);
  return dist(a.mid, rawMid) <= dist(b.mid, rawMid) ? a : b;
}

interface Chain {
  mid: PoseKey;
  end: PoseKey;
  tip?: PoseKey;
  upper: number;
  lower: number;
  tipLength: number;
}

/**
 * Regrow the skeleton from the projected hip with the calibrated lengths:
 * neck and head first, then each limb from its fitted root, using the raw
 * projected directions (and, when pinned, the raw projected contact point).
 * Every returned segment has exactly the calibrated length.
 */
export function fitLengths(
  raw: Pose,
  lengths: SegmentLengths,
  limbs: ObliqueSpec['limbs'],
): Pose {
  const neck = along(raw.hip, raw.neck, lengths.trunk);
  const head = along(neck, raw.head, lengths.headNeck);
  const out: Record<PoseKey, Pt> = { head, neck, hip: raw.hip } as Record<
    PoseKey,
    Pt
  >;
  const chains: [LimbMode, Pt, Chain][] = [
    [
      limbs.armR,
      neck,
      {
        mid: 'eR',
        end: 'hR',
        upper: lengths.upperArm,
        lower: lengths.forearm,
        tipLength: 0,
      },
    ],
    [
      limbs.armL,
      neck,
      {
        mid: 'eL',
        end: 'hL',
        upper: lengths.upperArm,
        lower: lengths.forearm,
        tipLength: 0,
      },
    ],
    [
      limbs.legR,
      raw.hip,
      {
        mid: 'kR',
        end: 'aR',
        tip: 'tR',
        upper: lengths.thigh,
        lower: lengths.shin,
        tipLength: lengths.foot,
      },
    ],
    [
      limbs.legL,
      raw.hip,
      {
        mid: 'kL',
        end: 'aL',
        tip: 'tL',
        upper: lengths.thigh,
        lower: lengths.shin,
        tipLength: lengths.foot,
      },
    ],
  ];
  for (const [mode, root, c] of chains) {
    const rawMid = raw[c.mid];
    const rawEnd = raw[c.end];
    let mid: Pt;
    let end: Pt;
    if (mode === 'straight') {
      mid = along(root, rawEnd, c.upper);
      end = along(root, rawEnd, c.upper + c.lower);
    } else if (mode === 'pinned') {
      ({ mid, end } = pinned(root, rawEnd, rawMid, c.upper, c.lower));
    } else {
      mid = along(root, rawMid, c.upper);
      end = along(mid, rawEnd, c.lower);
    }
    out[c.mid] = mid;
    out[c.end] = end;
    if (c.tip) out[c.tip] = along(end, raw[c.tip], c.tipLength);
  }
  return out as Pose;
}

const swapPair = <T>(a: T, b: T): [T, T] => [b, a];

/**
 * Mirror a pose about the vertical line x = axis2x / 2 and swap right and
 * left, so a figure authored for the right side becomes the left-working one.
 * The side view draws a left-working figure with translate(192) scale(-1),
 * which is mirrorAbout(pose, 192).
 */
export function mirrorAbout(pose: Pose, axis2x: number): Pose {
  const flip = (pt: Pt): Pt => [axis2x - pt[0], pt[1]];
  const [eR, eL] = swapPair(flip(pose.eR), flip(pose.eL));
  const [hR, hL] = swapPair(flip(pose.hR), flip(pose.hL));
  const [kR, kL] = swapPair(flip(pose.kR), flip(pose.kL));
  const [aR, aL] = swapPair(flip(pose.aR), flip(pose.aL));
  const [tR, tL] = swapPair(flip(pose.tR), flip(pose.tL));
  return {
    head: flip(pose.head),
    neck: flip(pose.neck),
    hip: flip(pose.hip),
    eR,
    hR,
    eL,
    hL,
    kR,
    aR,
    tR,
    kL,
    aL,
    tL,
  };
}

/** Mirror a prop about x = axis2x / 2, exactly as the side view's scale(-1). */
export function mirrorProp(prop: Prop, axis2x: number): Prop {
  switch (prop.type) {
    case 'mat':
    case 'plate':
    case 'pull-up-bar':
    case 'rail':
      return { ...prop, x1: axis2x - prop.x2, x2: axis2x - prop.x1 };
    case 'wall':
    case 'nordic-anchor':
    case 'bosu':
      return { ...prop, x: axis2x - prop.x };
    case 'bench':
    case 'chair':
    case 'step':
      return { ...prop, x: axis2x - prop.x - prop.w };
    case 'dip-bars':
      throw new Error('mirrorProp: dip-bars have no mirrored form');
  }
}

const flipPt = (pt: Pt, axis2x: number): Pt => [axis2x - pt[0], pt[1]];

/** The projected end point of a bar centred on `center`: centre + half * axis. */
function barEnds(
  center: Pt,
  centre3: P3,
  axis: P3,
  half: number,
  yawDeg: number,
  elevDeg: number,
): [Pt, Pt] {
  const at = (sign: number) => {
    const p = project(
      [
        centre3[0] + axis[0] * half * sign,
        centre3[1] + axis[1] * half * sign,
        centre3[2] + axis[2] * half * sign,
      ],
      yawDeg,
      elevDeg,
    );
    const c = project(centre3, yawDeg, elevDeg);
    return [center[0] + p[0] - c[0], center[1] + p[1] - c[1]] as Pt;
  };
  return [at(1), at(-1)];
}

const ACROSS: P3 = [0, 0, 1];

/**
 * The oblique frame at progress `t`. The body is built for the right working
 * side; the left side is the same frame mirrored about 192 (like the side
 * view), props included.
 */
export function obliqueFrame(
  spec: ObliqueSpec,
  t: number,
  working: Working | null = 'right',
): ObliqueFrame {
  const body = spec.body(t);
  const elev = spec.elevDeg ?? 0;
  const raw = projectBody(body, spec.yawDeg, elev);
  const pose = fitLengths(raw, viewLengths(spec), spec.limbs);
  const pelvis = barEnds(
    pose.hip,
    body.hip,
    body.pelvisAxis ?? ACROSS,
    body.pelvisHalf,
    spec.yawDeg,
    elev,
  );
  const shoulders = barEnds(
    pose.neck,
    body.neck,
    body.shoulderAxis ?? ACROSS,
    body.shoulderHalf,
    spec.yawDeg,
    elev,
  );
  const near: 'R' | 'L' = spec.near === 'working' ? 'R' : 'L';
  const props = spec.props(t);
  const surfaces = (spec.surfaces?.(t) ?? []).map((surface) => ({
    kind: surface.kind,
    pts: surface.corners.map((c) => project(c, spec.yawDeg, elev)),
  }));
  if (working !== 'left')
    return { pose, pelvis, shoulders, near, props, surfaces };
  return {
    pose: mirrorAbout(pose, 192),
    pelvis: [flipPt(pelvis[0], 192), flipPt(pelvis[1], 192)],
    shoulders: [flipPt(shoulders[0], 192), flipPt(shoulders[1], 192)],
    near: near === 'R' ? 'L' : 'R',
    props: props.map((p) => mirrorProp(p, 192)),
    surfaces: surfaces.map((x) => ({
      kind: x.kind,
      pts: x.pts.map((pt) => flipPt(pt, 192)),
    })),
  };
}
