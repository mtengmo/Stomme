import { createHash } from 'node:crypto';
import { exerciseMetadata } from '../content/exerciseMetadata';
import type { ExerciseId } from '../domain/types';
import { applyEquipmentPose } from './equipmentPose';
import { FRAMING, movementPose } from './Figure';
import {
  FRONT_ONLY,
  frontMovementPose,
  obliqueMovementPose,
  supportedFrontViews,
  supportedObliqueViews,
} from './frontViews';
import { figures, type Pose } from './poses';
import { heelSlidePose } from './rehabPoses';

/**
 * Stable hash of what an exercise's figure draws, used by the exercise audit
 * log to tell when an approved figure has changed. Mirrors the enumeration in
 * figureGeometry.test.ts (side, front and oblique views, the same exclusions)
 * and adds both sides and every equipment variant the metadata exposes.
 */
const T_SAMPLES = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
const NO_SIDE_VIEW: readonly string[] = FRONT_ONLY;
type Equipment = 'dumbbell' | 'kettlebell' | 'band' | null | undefined;
const EQUIPMENT_KINDS = ['dumbbell', 'kettlebell', 'band'] as const;

const round1 = (n: number) => Math.round(n * 10) / 10 + 0; // + 0 folds -0 into 0

function roundPose(p: Pose): number[] {
  return Object.values(p).flatMap(([x, y]) => [round1(x), round1(y)]);
}

/** Equipment settings to render: catalogue default, none, and each variant. */
function equipmentVariants(id: ExerciseId): Equipment[] {
  const out: Equipment[] = [undefined, null];
  for (const v of exerciseMetadata[id].variants)
    for (const req of v.equipment)
      if (
        (EQUIPMENT_KINDS as readonly string[]).includes(req.type) &&
        !out.includes(req.type as Equipment)
      )
        out.push(req.type as Equipment);
  return out;
}

export function exerciseGeometry(id: ExerciseId): unknown {
  const spec = figures[id];
  const parts: Record<string, unknown> = {
    framing: FRAMING[id] ?? null,
    props: JSON.parse(JSON.stringify(spec.props), (_k, v) =>
      typeof v === 'number' ? round1(v) : v,
    ),
    held: spec.held ?? null,
    motion: spec.motion ?? null,
  };
  const draw = (pose: Pose, eq: Equipment) =>
    roundPose(applyEquipmentPose(id, pose, eq).p);
  if (!NO_SIDE_VIEW.includes(id)) {
    const side: Record<string, number[][]> = {};
    for (const eq of equipmentVariants(id)) {
      side[String(eq)] = (spec.motion === 'hold' ? [1] : T_SAMPLES).map((t) =>
        draw(
          spec.motion === 'hold'
            ? spec.end
            : id === 'heel-slide'
              ? heelSlidePose(t, 'R')
              : movementPose(id, t),
          eq,
        ),
      );
    }
    parts.side = side;
    if (id === 'heel-slide')
      parts.sideLeft = T_SAMPLES.map((t) =>
        draw(heelSlidePose(t, 'L'), undefined),
      );
  }
  for (const side of ['right', 'left'] as const) {
    if ((supportedFrontViews as readonly string[]).includes(id))
      parts[`front-${side}`] = T_SAMPLES.map((t) =>
        roundPose(frontMovementPose(id as never, t, side)),
      );
    if ((supportedObliqueViews as readonly string[]).includes(id))
      parts[`oblique-${side}`] = T_SAMPLES.map((t) =>
        roundPose(obliqueMovementPose(id as never, t, side)),
      );
  }
  return parts;
}

export function exerciseFingerprint(id: ExerciseId): string {
  return createHash('sha256')
    .update(JSON.stringify(exerciseGeometry(id)))
    .digest('hex')
    .slice(0, 12);
}
