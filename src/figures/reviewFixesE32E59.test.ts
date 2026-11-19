import { describe, expect, it } from 'vitest';
import type { ExerciseId } from '../domain/types';
import { applyEquipmentPose } from './equipmentPose';
import { movementPose, stillFramePhase } from './Figure';
import { frontMovementPose } from './frontViews';
import type { Pt } from './lerp';
import { figures, type Pose, type PoseKey } from './poses';

const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const PHASES = Array.from({ length: 41 }, (_, i) => i / 40);
const length = (pose: Pose, a: PoseKey, b: PoseKey) => dist(pose[a], pose[b]);
const drift = (poses: Pose[], a: PoseKey, b: PoseKey) => {
  const values = poses.map((p) => length(p, a, b));
  return Math.max(...values) - Math.min(...values);
};

describe('E32-E59 review fixes: constant limb lengths', () => {
  const frames = (id: ExerciseId) =>
    PHASES.map((t) => applyEquipmentPose(id, movementPose(id, t), undefined).p);
  const LIMBS: readonly (readonly [PoseKey, PoseKey])[] = [
    ['neck', 'eR'],
    ['eR', 'hR'],
    ['neck', 'eL'],
    ['eL', 'hL'],
    ['hip', 'kR'],
    ['kR', 'aR'],
    ['hip', 'kL'],
    ['kL', 'aL'],
  ];

  it.each([
    'side-lying-hip-abduction',
    'side-lying-hip-adduction',
    'band-leg-press',
    'band-knee-extension',
    'lying-leg-raise',
    'single-leg-chair-squat',
  ] as const)('%s: near and far limbs match and no limb drifts', (id) => {
    const poses = frames(id);
    for (const [a, b] of LIMBS)
      expect(drift(poses, a, b), `${id} ${a}-${b}`).toBeLessThan(0.3);
    const first = poses[0] as Pose;
    // The chair squat arms are authored 0.6 apart; every other pair matches.
    const tolerance = id === 'single-leg-chair-squat' ? 0.7 : 0.3;
    // The seated arms of band-knee-extension are E30's and not part of this fix.
    const pairs = id === 'band-knee-extension' ? [4, 5] : [0, 1, 4, 5];
    for (const i of pairs) {
      const near = LIMBS[i] as readonly [PoseKey, PoseKey];
      const far = LIMBS[i + 2] as readonly [PoseKey, PoseKey];
      expect(
        Math.abs(
          length(first, near[0], near[1]) - length(first, far[0], far[1]),
        ),
        `${id} ${near.join('-')}`,
      ).toBeLessThan(tolerance);
    }
  });

  it('quadriceps stretch: both arms and legs match and both contacts hold', () => {
    const { start, end } = figures['quadriceps-stretch'];
    for (const pose of [start, end]) {
      expect(length(pose, 'neck', 'eR')).toBeCloseTo(
        length(pose, 'neck', 'eL'),
        1,
      );
      expect(length(pose, 'eR', 'hR')).toBeCloseTo(length(pose, 'eL', 'hL'), 1);
      expect(length(pose, 'kR', 'aR')).toBeCloseTo(length(pose, 'kL', 'aL'), 1);
      expect(pose.hL).toEqual([155, 92]);
    }
    expect(dist(end.hR, end.aR)).toBeLessThan(0.5);
  });

  it('band leg press keeps both band hands and the pressed ankle', () => {
    const { start, end } = figures['band-leg-press'];
    expect(start.hR).toEqual([86, 150]);
    expect(start.hL).toEqual([79, 147]);
    expect(start.aR).toEqual([128, 143]);
    expect(end.aR).toEqual([152, 148]);
  });

  it('kettlebell floor press: the resting arm has the pressing arm lengths', () => {
    for (const t of [0, 0.5, 1]) {
      const p = movementPose('kettlebell-floor-press', t);
      expect(length(p, 'neck', 'eL')).toBeCloseTo(26, 0);
      expect(length(p, 'eL', 'hL')).toBeCloseTo(26, 0);
      expect(length(p, 'neck', 'eR')).toBeCloseTo(26, 0);
    }
  });

  it('push-up: both support arms are straight at the top', () => {
    const p = movementPose('push-up', 0);
    for (const [e, h] of [
      ['eR', 'hR'],
      ['eL', 'hL'],
    ] as const) {
      const reach = length(p, 'neck', e) + length(p, e, h);
      expect(length(p, 'neck', h)).toBeGreaterThan(reach * 0.995);
    }
  });

  it('prone on forearms: the pelvis rests on the mat, forearms stay down', () => {
    // Mat top edge is y 175.5; the body stroke is 6 wide.
    const hold = figures['prone-on-forearms'].end;
    for (const pose of [hold, movementPose('prone-on-forearms', 0)])
      expect(Math.abs(pose.hip[1] + 3 - 175.5)).toBeLessThanOrEqual(0.6);
    expect(hold.eR[1]).toBeGreaterThanOrEqual(172);
    expect(hold.hR[1]).toBeGreaterThanOrEqual(172);
  });
});

describe('E40/E41/E47 front projections', () => {
  it.each(['kettlebell-rack-carry', 'farmer-carry'] as const)(
    '%s front: thigh and shin keep the profile gait lengths',
    (id) => {
      for (const working of ['right', 'left'] as const) {
        const poses = PHASES.map((t) => frontMovementPose(id, t, working));
        for (const [a, b, max] of [
          ['hip', 'kR', 30],
          ['hip', 'kL', 30],
          ['kR', 'aR', 29],
          ['kL', 'aL', 29],
        ] as const) {
          for (const p of poses)
            expect(length(p, a, b)).toBeLessThanOrEqual(max + 0.05);
          expect(drift(poses, a, b)).toBeLessThan(0.1);
        }
      }
    },
  );

  it('rack carry front: profile arm lengths, left foot swings first', () => {
    const p = frontMovementPose('kettlebell-rack-carry', 0.25, 'right');
    expect(length(p, 'neck', 'eR')).toBeCloseTo(29.8, 0);
    expect(length(p, 'eR', 'hR')).toBeCloseTo(25.2, 0);
    expect(p.aL[1]).toBeLessThan(p.aR[1]);
    const later = frontMovementPose('kettlebell-rack-carry', 0.75, 'right');
    expect(later.aR[1]).toBeLessThan(later.aL[1]);
  });

  it('rack carry front: Start and Slut stills show different swing feet', () => {
    const start = stillFramePhase('kettlebell-rack-carry', 'front', 'Start');
    const end = stillFramePhase('kettlebell-rack-carry', 'front', 'Slut');
    expect([start, end]).toEqual([0.25, 0.75]);
    expect(
      frontMovementPose('kettlebell-rack-carry', start, 'right').aL,
    ).not.toEqual(frontMovementPose('kettlebell-rack-carry', end, 'right').aL);
  });

  it('rear-foot split squat front: rear shin never collapses, arms stay under the profile', () => {
    for (const working of ['right', 'left'] as const) {
      const rear =
        working === 'right' ? (['kL', 'aL'] as const) : (['kR', 'aR'] as const);
      for (const t of PHASES) {
        const p = frontMovementPose('rear-foot-split-squat', t, working);
        // The rear foot rests on the bench behind the body: the shin is a
        // constant foreshortened 16 while the knee sinks with the hip.
        expect(length(p, rear[0], rear[1])).toBeCloseTo(16, 1);
        expect(length(p, 'neck', 'eR')).toBeLessThanOrEqual(25.6);
        expect(length(p, 'eR', 'hR')).toBeLessThanOrEqual(12.8);
        expect(length(p, 'hip', 'kR')).toBeLessThanOrEqual(36);
        expect(length(p, 'hip', 'kL')).toBeLessThanOrEqual(36);
      }
    }
  });

  it('single-leg chair squat front: thighs never exceed the front limit', () => {
    for (const working of ['right', 'left'] as const)
      for (const t of PHASES) {
        const p = frontMovementPose('single-leg-chair-squat', t, working);
        expect(length(p, 'hip', 'kR')).toBeLessThanOrEqual(36);
        expect(length(p, 'hip', 'kL')).toBeLessThanOrEqual(36);
      }
  });
});
