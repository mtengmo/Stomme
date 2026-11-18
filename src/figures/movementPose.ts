import type { ExerciseId } from '../domain/types';
import {
  ARM_SWEEP_POSES,
  dumbbellPulloverPose,
  floorPressPose,
  halfSquatPose,
  hamstringCurlPose,
  kettlebellFloorPressPose,
  overheadTricepsPose,
  renegadeRowPose,
  russianTwistSidePose,
  seatedKneeExtensionPose,
  walkingLungePose,
  weightedSitUpPose,
} from './additionalPoses';
import { bodyweightMovementPose } from './bodyweightPoses';
import {
  farmerCarryPose,
  rackCarryPose,
  suitcaseCarryPose,
} from './carryPoses';
import { constrainLegInterpolation } from './constrainedLegs';
import { hingeFamilyPose, isHingeFamily } from './hingeFamilyKeyframes';
import { kneeStrengthMovementPose } from './kneeStrengthPoses';
import { lerpPt } from './lerp';
import { withReverseLungeRearFoot } from './lungeFootPath';
import { physioMovementPose } from './physioPoses';
import { figures, POSE_KEYS, type Pose } from './poses';
import { rehabMovementPose } from './rehabPoses';
import { isSquatFamily, squatFamilyPose } from './squatFamilyKeyframes';
import { stepUpPose } from './stepUpKeyframes';

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const out = { ...a };
  for (const k of POSE_KEYS) out[k] = lerpPt(a[k], b[k], t);
  return out;
}

export function movementPose(exerciseId: ExerciseId, t: number): Pose {
  const kneePose = kneeStrengthMovementPose(exerciseId, t);
  if (kneePose) return kneePose;
  const bodyweightPose = bodyweightMovementPose(exerciseId, t);
  if (bodyweightPose) return bodyweightPose;
  const rehabPose = rehabMovementPose(exerciseId, t);
  if (rehabPose) return rehabPose;
  const physioPose = physioMovementPose(exerciseId, t);
  if (physioPose) return physioPose;
  const armSweep = ARM_SWEEP_POSES[exerciseId];
  if (armSweep) return armSweep(t);
  if (exerciseId === 'half-squat') return halfSquatPose(t);
  if (exerciseId === 'hamstring-curl') return hamstringCurlPose(t);
  if (exerciseId === 'seated-knee-extension') return seatedKneeExtensionPose(t);
  if (exerciseId === 'kettlebell-floor-press')
    return kettlebellFloorPressPose(t);
  if (exerciseId === 'floor-press') return floorPressPose(t);
  if (exerciseId === 'dumbbell-pullover') return dumbbellPulloverPose(t);
  if (exerciseId === 'overhead-triceps-extension')
    return overheadTricepsPose(t);
  if (exerciseId === 'renegade-row') return renegadeRowPose(t);
  if (exerciseId === 'russian-twist') return russianTwistSidePose(t);
  if (exerciseId === 'weighted-sit-up') return weightedSitUpPose(t);
  if (exerciseId === 'walking-lunge') return walkingLungePose(t);
  if (exerciseId === 'suitcase-carry') return suitcaseCarryPose(t);
  if (exerciseId === 'farmer-carry') return farmerCarryPose(t);
  if (exerciseId === 'kettlebell-rack-carry') return rackCarryPose(t);
  if (exerciseId === 'step-up') return stepUpPose(t);
  if (isSquatFamily(exerciseId)) return squatFamilyPose(exerciseId, t);
  if (isHingeFamily(exerciseId)) return hingeFamilyPose(exerciseId, t);
  const spec = figures[exerciseId];
  const lerped = !spec.middle
    ? lerpPose(spec.start, spec.end, t)
    : t < 0.5
      ? lerpPose(spec.start, spec.middle, t * 2)
      : lerpPose(spec.middle, spec.end, (t - 0.5) * 2);
  const interpolated =
    exerciseId === 'reverse-lunge' && spec.middle
      ? withReverseLungeRearFoot(lerped, spec.start, spec.middle, t)
      : lerped;
  return constrainLegInterpolation(
    exerciseId,
    interpolated,
    spec.middle ? [spec.start, spec.middle, spec.end] : [spec.start, spec.end],
  );
}
