import { easeInOut, lerp, type Pt } from './lerp';
import type { Pose, Prop } from './poses';

/**
 * Keyframe animation helpers for the figure pilot: named poses at times in
 * 0..1, eased between, plus a two-bone IK solver that keeps segment lengths
 * constant, plus a geometry gate that checks sampled frames.
 * Pure: no module state, no DOM.
 */

export interface Keyframe<V extends Record<string, number>> {
  /** Position in the cycle, 0..1. */
  t: number;
  /** Optional name, for authoring and debugging. */
  name?: string;
  values: V;
}

/**
 * Sample numeric keyframe values at `t`. Frames must be sorted by time. With
 * `loop`, `t` wraps (so 1 equals 0); otherwise it is clamped to 0..1. Between
 * two frames the local progress is eased.
 */
export function sampleKeyframes<V extends Record<string, number>>(
  frames: readonly Keyframe<V>[],
  t: number,
  loop = true,
  ease: (x: number) => number = easeInOut,
): V {
  const first = frames[0];
  const last = frames[frames.length - 1];
  if (!first || !last) throw new Error('sampleKeyframes needs keyframes');
  let x = t;
  if (loop) {
    // 1 stays 1 so the last frame is reachable; any other value wraps.
    x = t >= 1 && t - Math.floor(t) === 0 ? 1 : t - Math.floor(t);
  }
  x = Math.min(1, Math.max(0, x));
  if (x <= first.t) return { ...first.values };
  if (x >= last.t) return { ...last.values };
  const nextIndex = frames.findIndex((f) => f.t > x);
  const a = frames[nextIndex - 1] as Keyframe<V>;
  const b = frames[nextIndex] as Keyframe<V>;
  const local = ease((x - a.t) / (b.t - a.t));
  const out: Record<string, number> = {};
  for (const key of Object.keys(a.values))
    out[key] = lerp(a.values[key] as number, b.values[key] as number, local);
  return out as V;
}

export interface TwoBoneResult {
  /** The middle joint (knee or elbow). */
  mid: Pt;
  /** The end joint: the target, or the nearest reachable point toward it. */
  end: Pt;
  /** False when the target had to be clamped. */
  reached: boolean;
}

/**
 * Two-bone IK: root -> mid -> end with fixed lengths `l1` and `l2`.
 * `bend` picks the side of the root-to-end line the middle joint sits on:
 * +1 is the rotate-by-+90-degrees side in screen coordinates (x right, y down),
 * so for a leg pointing down it puts the knee toward -x; -1 toward +x.
 * Unreachable targets are clamped along the same direction to full extension
 * (too far) or to the closest folded position (too near), so both lengths are
 * always exact.
 */
export function solveTwoBone(
  root: Pt,
  target: Pt,
  l1: number,
  l2: number,
  bend: 1 | -1,
): TwoBoneResult {
  const dx = target[0] - root[0];
  const dy = target[1] - root[1];
  const raw = Math.hypot(dx, dy);
  // A zero-length reach has no direction: fall back to straight down.
  const ux = raw === 0 ? 0 : dx / raw;
  const uy = raw === 0 ? 1 : dy / raw;
  const lo = Math.abs(l1 - l2);
  const hi = l1 + l2;
  const d = Math.min(hi, Math.max(lo, raw));
  const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d || 1);
  const height = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  return {
    mid: [
      root[0] + along * ux - bend * height * uy,
      root[1] + along * uy + bend * height * ux,
    ],
    end: [root[0] + d * ux, root[1] + d * uy],
    reached: raw >= lo && raw <= hi,
  };
}

/** Point at `length` from `origin`, `angle` radians clockwise from straight up. */
export function fromAngle(origin: Pt, length: number, angle: number): Pt {
  return [
    origin[0] + length * Math.sin(angle),
    origin[1] - length * Math.cos(angle),
  ];
}

export type ViewBox = readonly [x: number, y: number, w: number, h: number];

export type ViolationType =
  | 'below-floor'
  | 'outside-viewbox'
  | 'foot-in-prop'
  | 'head-clearance'
  | 'segment-drift'
  | 'limb-asymmetry'
  | 'loop-mismatch'
  | 'support-gap';

export interface Violation {
  type: ViolationType;
  /** Frame index; -1 for violations about the whole sequence. */
  frame: number;
  detail: string;
  /** Stable id for allowlisting, for example `limb-asymmetry:kR-aR`. */
  key?: string;
}

/** A joint that must stay within `maxGap` of a prop surface (a hand on a wall). */
export interface Support {
  joint: keyof Pose;
  prop: Prop['type'];
  maxGap: number;
}

export interface GateOptions {
  floorY: number;
  viewBox: ViewBox;
  props: readonly Prop[];
  /** Minimum distance from the head centre to the floor and to props. */
  minHeadClearance: number;
  /** Allowed change in a segment length over the sequence. Default 0.5. */
  lengthTolerance?: number;
  /** Allowed overlap of a foot point into a prop before it counts. Default 1. */
  contactTolerance?: number;
  /** Known contacts that must hold in every frame. */
  supports?: readonly Support[];
  /** Violation keys that are accepted, each with the reason. */
  allowlist?: Readonly<Record<string, string>>;
  /** Segments (`a-b`) exempt from the drift check (front views foreshorten). */
  skipDrift?: readonly string[];
}

const JOINTS = [
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
] as const satisfies readonly (keyof Pose)[];

/** Bones as named joint pairs, joint order matches how the renderer draws. */
const SEGMENTS: readonly (readonly [keyof Pose, keyof Pose])[] = [
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

/** Pairs that should be equally long on the near and far side. */
const MIRRORED: readonly (readonly [number, number])[] = [
  [2, 4],
  [3, 5],
  [6, 9],
  [7, 10],
  [8, 11],
];

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Axis-aligned obstacles from props. Only props that block feet matter. */
function obstacles(props: readonly Prop[], floorY: number) {
  const rects: {
    name: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }[] = [];
  for (const p of props) {
    if (p.type === 'step')
      rects.push({
        name: 'steget',
        x1: p.x,
        y1: p.y,
        x2: p.x + p.w,
        y2: floorY,
      });
    else if (p.type === 'wall')
      rects.push({ name: 'väggen', x1: p.x, y1: 0, x2: p.x, y2: floorY });
    else if (p.type === 'bench')
      rects.push({
        name: 'bänken',
        x1: p.x,
        y1: p.y,
        x2: p.x + p.w,
        y2: p.y + 7,
      });
  }
  return rects;
}

function gapToProp(pt: Pt, p: Prop): number | undefined {
  const rect = (x1: number, y1: number, x2: number, y2: number) =>
    Math.hypot(
      Math.max(x1 - pt[0], 0, pt[0] - x2),
      Math.max(y1 - pt[1], 0, pt[1] - y2),
    );
  switch (p.type) {
    case 'wall':
      return Math.abs(pt[0] - p.x);
    case 'step':
      return rect(p.x, p.y, p.x + p.w, 178);
    case 'bench':
      return rect(p.x, p.y, p.x + p.w, p.y + 7);
    case 'rail':
      return rect(p.x1, p.y, p.x2, p.y);
    case 'chair':
      return rect(p.x, p.y, p.x + p.w, p.y + 4);
    default:
      return undefined;
  }
}

/**
 * Check sampled frames of a loop. Returns every violation found (empty = pass):
 * joints below the floor or outside the viewBox, feet inside props, head too
 * close to the floor or a prop, a segment changing length over time, near and
 * far limbs of unequal length, and a last frame that differs from the first.
 */
export function checkPoseGeometry(
  frames: readonly Pose[],
  opts: GateOptions,
): Violation[] {
  const out: Violation[] = [];
  const [vx, vy, vw, vh] = opts.viewBox;
  const tol = opts.lengthTolerance ?? 0.5;
  const contact = opts.contactTolerance ?? 1;
  const rects = obstacles(opts.props, opts.floorY);
  frames.forEach((pose, frame) => {
    for (const sup of opts.supports ?? []) {
      const gaps = opts.props
        .filter((pr) => pr.type === sup.prop)
        .map((pr) => gapToProp(pose[sup.joint], pr))
        .filter((g): g is number => g !== undefined);
      if (gaps.length > 0 && Math.min(...gaps) > sup.maxGap)
        out.push({
          type: 'support-gap',
          frame,
          key: `support-gap:${sup.joint}`,
          detail: `${sup.joint} är ${Math.min(...gaps).toFixed(1)} från ${sup.prop}`,
        });
    }
    for (const key of JOINTS) {
      const [x, y] = pose[key];
      if (y > opts.floorY)
        out.push({
          type: 'below-floor',
          frame,
          detail: `${key} ligger ${(y - opts.floorY).toFixed(1)} under golvet`,
        });
      if (x < vx || x > vx + vw || y < vy || y > vy + vh)
        out.push({
          type: 'outside-viewbox',
          frame,
          detail: `${key} ligger utanför bilden`,
        });
    }
    for (const key of ['aR', 'tR', 'aL', 'tL'] as const) {
      const [x, y] = pose[key];
      for (const r of rects) {
        if (
          x > r.x1 + contact &&
          x < r.x2 - contact &&
          y > r.y1 + contact &&
          y < r.y2
        )
          out.push({
            type: 'foot-in-prop',
            frame,
            key: `foot-in-prop:${key}`,
            detail: `${key} ligger inne i ${r.name}`,
          });
      }
    }
    const [hx, hy] = pose.head;
    if (opts.floorY - hy < opts.minHeadClearance)
      out.push({
        type: 'head-clearance',
        frame,
        detail: 'huvudet är för nära golvet',
      });
    for (const r of rects) {
      const cx = Math.min(r.x2, Math.max(r.x1, hx));
      const cy = Math.min(r.y2, Math.max(r.y1, hy));
      if (Math.hypot(hx - cx, hy - cy) < opts.minHeadClearance)
        out.push({
          type: 'head-clearance',
          frame,
          detail: `huvudet är för nära ${r.name}`,
        });
    }
  });
  const first = frames[0];
  const last = frames[frames.length - 1];
  if (!first || !last) return filterAllowed(out, opts.allowlist);
  SEGMENTS.forEach(([a, b], i) => {
    const lengths = frames.map((f) => dist(f[a], f[b]));
    const spread = Math.max(...lengths) - Math.min(...lengths);
    if (spread > tol && !opts.skipDrift?.includes(`${a}-${b}`))
      out.push({
        type: 'segment-drift',
        frame: -1,
        key: `segment-drift:${a}-${b}`,
        detail: `${a}-${b} ändrar längd med ${spread.toFixed(1)}`,
      });
    const mirror = MIRRORED.find(([p]) => p === i);
    if (mirror) {
      const [, q] = mirror;
      const [c, d] = SEGMENTS[q] as readonly [keyof Pose, keyof Pose];
      const gap = Math.max(
        ...frames.map((f) => Math.abs(dist(f[a], f[b]) - dist(f[c], f[d]))),
      );
      if (gap > tol)
        out.push({
          type: 'limb-asymmetry',
          frame: -1,
          key: `limb-asymmetry:${a}-${b}`,
          detail: `${a}-${b} och ${c}-${d} skiljer sig med ${gap.toFixed(1)}`,
        });
    }
  });
  for (const key of JOINTS) {
    const gap = dist(first[key], last[key]);
    if (gap > 0.01)
      out.push({
        type: 'loop-mismatch',
        frame: -1,
        key: `loop-mismatch:${key}`,
        detail: `${key} skiljer sig mellan första och sista rutan`,
      });
  }
  return filterAllowed(out, opts.allowlist);
}

function filterAllowed(
  found: Violation[],
  allowlist: GateOptions['allowlist'],
): Violation[] {
  return found.filter((v) => !(v.key && allowlist && v.key in allowlist));
}
