import { solveTwoBone } from './keyframes';
import type { Pt } from './lerp';
import type { Pose, PoseKey } from './poses';

/**
 * Segment-length-preserving pose interpolation.
 *
 * The side catalogue interpolates every joint coordinate independently, so a
 * limb or the trunk shortens whenever its end points swing along different
 * paths (a hinge, a swung arm, a lifted leg). A rule keeps the segment lengths
 * of an authored reference pose while the end points follow the interpolation:
 *
 * - `bone`: one segment. `from` stays where it is, `to` is rotated to the
 *   reference length; `follow` joints (a head, the arms of a hinged trunk)
 *   move rigidly with `to`.
 * - `limb`: two segments (root, mid, end). The mid joint is solved by two-bone
 *   IK from the interpolated root and end. `straight` swings the limb at full
 *   reach in the interpolated direction (a straight arm or leg).
 *
 * Rules are opt-in per exercise (see `SEGMENT_RULES` in `constrainedLegs.ts`)
 * so no other baseline changes.
 */
export type BoneRule = {
  kind: 'bone';
  from: PoseKey;
  to: PoseKey;
  follow?: readonly PoseKey[];
};
export type LimbRule = {
  kind: 'limb';
  root: PoseKey;
  mid: PoseKey;
  end: PoseKey;
  /** Swing at full reach; the mid joint stays on the root-end line. */
  straight?: boolean;
  /** Bend side for `solveTwoBone`; inferred from the references when left out. */
  bend?: 1 | -1;
};
export type SegmentRule = BoneRule | LimbRule;

export const bone = (
  from: PoseKey,
  to: PoseKey,
  follow: readonly PoseKey[] = [],
): BoneRule => ({ kind: 'bone', from, to, follow });

export const limb = (
  root: PoseKey,
  mid: PoseKey,
  end: PoseKey,
  options: { straight?: boolean; bend?: 1 | -1 } = {},
): LimbRule => ({ kind: 'limb', root, mid, end, ...options });

const ARM: Record<'R' | 'L', readonly [PoseKey, PoseKey, PoseKey]> = {
  R: ['neck', 'eR', 'hR'],
  L: ['neck', 'eL', 'hL'],
};
const LEG: Record<'R' | 'L', readonly [PoseKey, PoseKey, PoseKey]> = {
  R: ['hip', 'kR', 'aR'],
  L: ['hip', 'kL', 'aL'],
};

export const arm = (
  side: 'R' | 'L',
  options?: { straight?: boolean; bend?: 1 | -1 },
) => limb(...ARM[side], options);
export const leg = (
  side: 'R' | 'L',
  options?: { straight?: boolean; bend?: 1 | -1 },
) => limb(...LEG[side], options);
export const foot = (side: 'R' | 'L') =>
  bone(side === 'R' ? 'aR' : 'aL', side === 'R' ? 'tR' : 'tL');
export const trunk = (): BoneRule =>
  bone('hip', 'neck', ['head', 'eR', 'hR', 'eL', 'hL']);
export const headNeck = (): BoneRule => bone('neck', 'head');

const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** Which side of the root-end line the mid joint sits on (1 or -1). */
function inferBend(rule: LimbRule, references: readonly Pose[]): 1 | -1 {
  for (const ref of references) {
    const r = ref[rule.root];
    const ux = ref[rule.end][0] - r[0];
    const uy = ref[rule.end][1] - r[1];
    const cross =
      ux * (ref[rule.mid][1] - r[1]) - uy * (ref[rule.mid][0] - r[0]);
    if (Math.abs(cross) > 1) return cross > 0 ? 1 : -1;
  }
  return 1;
}

function applyBone(out: Pose, rule: BoneRule, ref: Pose) {
  const length = dist(ref[rule.from], ref[rule.to]);
  const from = out[rule.from];
  const raw = dist(from, out[rule.to]);
  if (raw < 0.001) return;
  const to: Pt = [
    from[0] + ((out[rule.to][0] - from[0]) / raw) * length,
    from[1] + ((out[rule.to][1] - from[1]) / raw) * length,
  ];
  const dx = to[0] - out[rule.to][0];
  const dy = to[1] - out[rule.to][1];
  out[rule.to] = to;
  for (const key of rule.follow ?? [])
    out[key] = [out[key][0] + dx, out[key][1] + dy];
}

function applyLimb(
  out: Pose,
  rule: LimbRule,
  ref: Pose,
  references: readonly Pose[],
) {
  const upper = dist(ref[rule.root], ref[rule.mid]);
  const lower = dist(ref[rule.mid], ref[rule.end]);
  const root = out[rule.root];
  let target = out[rule.end];
  if (rule.straight) {
    const raw = dist(root, target);
    if (raw < 0.001) return;
    const reach = upper + lower;
    target = [
      root[0] + ((target[0] - root[0]) / raw) * reach,
      root[1] + ((target[1] - root[1]) / raw) * reach,
    ];
  }
  const solved = solveTwoBone(
    root,
    target,
    upper,
    lower,
    rule.bend ?? inferBend(rule, references),
  );
  out[rule.mid] = solved.mid;
  out[rule.end] = solved.end;
}

/**
 * Apply the rules in order to an interpolated pose. Segment lengths come from
 * the first reference (the authored start); every reference should share them,
 * which the geometry tests assert.
 */
export function keepSegmentLengths(
  pose: Pose,
  references: readonly Pose[],
  rules: readonly SegmentRule[],
): Pose {
  const ref = references[0];
  if (!ref) return pose;
  const out = { ...pose };
  for (const rule of rules)
    if (rule.kind === 'bone') applyBone(out, rule, ref);
    else applyLimb(out, rule, ref, references);
  return out;
}
