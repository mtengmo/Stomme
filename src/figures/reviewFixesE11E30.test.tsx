import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ExerciseId } from '../domain/types';
import { applyEquipmentPose } from './equipmentPose';
import { FigureFrame, movementPose } from './Figure';
import {
  frontMovementPose,
  obliqueMovementPose,
  supportedViewsFor,
} from './frontViews';
import type { Pt } from './lerp';
import type { Pose, PoseKey } from './poses';

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const len = (p: Pose, a: PoseKey, b: PoseKey) => dist(p[a], p[b]);
const PHASES = Array.from({ length: 41 }, (_, i) => i / 40);
const FLOOR = 178;

describe('E11-E30 review fixes (profile)', () => {
  it('lunges start upright: standing legs, no bent knee at phase 0 and at the loop seam', () => {
    for (const id of ['reverse-lunge', 'forward-lunge'] as const)
      for (const phase of [0, 1]) {
        const p = movementPose(id, id === 'reverse-lunge' ? phase : phase);
        if (phase === 0) {
          for (const [knee, ankle] of [
            ['kR', 'aR'],
            ['kL', 'aL'],
          ] as const) {
            // Hip-to-ankle is nearly the full leg (30.6 + 26.3), so the knee is almost straight.
            expect(dist(p.hip, p[ankle]), `${id} ${ankle}`).toBeGreaterThan(55);
            const bend = Math.abs(
              (p[ankle][0] - p.hip[0]) * (p[knee][1] - p.hip[1]) -
                (p[ankle][1] - p.hip[1]) * (p[knee][0] - p.hip[0]),
            );
            expect(bend / dist(p.hip, p[ankle]), `${id} ${knee}`).toBeLessThan(
              6,
            );
          }
        }
      }
  });

  it('lunge knees always bend forward (+x) and never behind the hip-ankle line', () => {
    for (const id of ['reverse-lunge', 'forward-lunge'] as const)
      for (const t of PHASES) {
        const p = movementPose(id, t);
        for (const [knee, ankle] of [
          ['kR', 'aR'],
          ['kL', 'aL'],
        ] as const) {
          const cross =
            (p[ankle][0] - p.hip[0]) * (p[knee][1] - p.hip[1]) -
            (p[ankle][1] - p.hip[1]) * (p[knee][0] - p.hip[0]);
          expect(cross, `${id} ${knee}@${t}`).toBeLessThanOrEqual(0.01);
        }
      }
  });

  it('half squat keeps both hands on the support and every segment at one length', () => {
    const first = movementPose('half-squat', 0);
    for (const t of PHASES) {
      const p = movementPose('half-squat', t);
      for (const [a, b] of [
        ['neck', 'hip'],
        ['hip', 'kR'],
        ['kR', 'aR'],
        ['neck', 'eR'],
        ['eR', 'hR'],
        ['neck', 'eL'],
        ['eL', 'hL'],
      ] as const)
        expect(
          Math.abs(len(p, a, b) - len(first, a, b)),
          `${a}-${b}@${t}`,
        ).toBeLessThan(0.15);
      expect(p.hR[0]).toBeGreaterThan(152);
      expect(p.hR[0]).toBeLessThanOrEqual(155);
      expect(p.aR).toEqual(first.aR);
    }
  });

  it('hamstring curl lifts the toe clear of the floor with a constant foot', () => {
    const foot = len(movementPose('hamstring-curl', 0), 'aR', 'tR');
    for (const t of PHASES) {
      const p = movementPose('hamstring-curl', t);
      expect(len(p, 'aR', 'tR'), `foot@${t}`).toBeCloseTo(foot, 6);
      // Toe centre at most 177 (line radius 3 reaches the floor at 180 only at rest).
      expect(p.tR[1], `toe@${t}`).toBeLessThanOrEqual(177 + 1e-9);
      if (t >= 0.1)
        expect(p.tR[1], `toe lifted@${t}`).toBeLessThanOrEqual(173.5);
    }
  });

  it('glute bridge keeps the trunk, legs and feet at one length and the pelvis on the mat', () => {
    const start = movementPose('glute-bridge', 0);
    expect(start.hip[1] + 3).toBeCloseTo(175.5, 6);
    for (const equipment of [undefined, 'dumbbell', 'kettlebell'] as const)
      for (const t of PHASES) {
        const { p } = applyEquipmentPose(
          'glute-bridge',
          movementPose('glute-bridge', t),
          equipment,
        );
        for (const [a, b] of [
          ['neck', 'hip'],
          ['hip', 'kR'],
          ['kR', 'aR'],
          ['hip', 'kL'],
          ['kL', 'aL'],
          ['neck', 'eR'],
          ['eR', 'hR'],
          ['neck', 'eL'],
          ['eL', 'hL'],
        ] as const)
          expect(
            Math.abs(len(p, a, b) - len(start, a, b)),
            `${equipment} ${a}-${b}@${t}`,
          ).toBeLessThan(0.15);
        expect(p.aR).toEqual(start.aR);
        expect(p.aL).toEqual(start.aL);
      }
  });

  it('glute bridge with a weight holds it with both hands on the pelvis', () => {
    for (const t of PHASES) {
      const { p, anchors } = applyEquipmentPose(
        'glute-bridge',
        movementPose('glute-bridge', t),
        'dumbbell',
      );
      expect(dist(p.hR, p.hL)).toBeLessThan(0.01);
      expect(dist(p.hR, anchors[0] as Pt)).toBeLessThan(0.5);
      expect(dist(p.hR, p.hip)).toBeLessThan(8);
    }
  });

  it('lying leg raise rests the pelvis and the whole body on the mat', () => {
    for (const t of [0, 0.5, 1]) {
      const p = movementPose('lying-leg-raise', t);
      expect(p.hip[1] + 3).toBeCloseTo(175.5, 6);
      expect(p.neck[1] + 3).toBeCloseTo(175.5, 6);
    }
    const a = movementPose('lying-leg-raise', 0);
    const b = movementPose('lying-leg-raise', 1);
    expect(b.hip).toEqual(a.hip);
    expect(b.neck).toEqual(a.neck);
  });

  it('single-leg chair squat keeps the free toe inside the frame at Start', () => {
    const start = movementPose('single-leg-chair-squat', 0);
    // The profile viewBox ends at x 178 and a line is 3 wide on each side.
    for (const key of ['tL', 'tR', 'aL', 'aR'] as const)
      expect(start[key][0] + 3, key).toBeLessThan(178 - 3);
  });
});

describe('E11-E30 review fixes (arm sweeps)', () => {
  it.each([
    'shoulder-press',
    'biceps-curl',
    'hammer-curl',
    'lateral-raise',
    'kettlebell-press',
    'supported-row',
    'triceps-kickback',
  ] as const)(
    '%s keeps the working arm at one length through the loop',
    (id) => {
      const first = movementPose(id, 0);
      for (const t of PHASES) {
        const p = movementPose(id, t);
        expect(
          Math.abs(len(p, 'neck', 'eR') - len(first, 'neck', 'eR')),
        ).toBeLessThan(0.1);
        expect(
          Math.abs(len(p, 'eR', 'hR') - len(first, 'eR', 'hR')),
        ).toBeLessThan(0.1);
      }
    },
  );

  it('triceps kickback holds the upper arm still and swings only the forearm', () => {
    const a = movementPose('triceps-kickback', 0);
    const b = movementPose('triceps-kickback', 1);
    expect(dist(a.eR, b.eR)).toBeLessThan(0.01);
    expect(dist(a.hR, b.hR)).toBeGreaterThan(20);
    const row = movementPose('supported-row', 0);
    // The support hand never moves in either row or kickback.
    expect(movementPose('supported-row', 1).hL).toEqual(row.hL);
  });

  it('kettlebell swing keeps trunk, arms and legs at one length with both hands on the bell', () => {
    const first = movementPose('kettlebell-swing', 0);
    for (const t of PHASES) {
      const p = movementPose('kettlebell-swing', t);
      for (const [a, b] of [
        ['neck', 'hip'],
        ['neck', 'eR'],
        ['eR', 'hR'],
        ['hip', 'kR'],
        ['kR', 'aR'],
      ] as const)
        expect(
          Math.abs(len(p, a, b) - len(first, a, b)),
          `${a}-${b}@${t}`,
        ).toBeLessThan(0.15);
      expect(dist(p.hR, p.hL)).toBeLessThan(0.5);
    }
  });
});

describe('E11-E30 review fixes (front and oblique views)', () => {
  const profileMax = (id: ExerciseId, a: PoseKey, b: PoseKey) =>
    Math.max(...PHASES.map((t) => len(movementPose(id, t), a, b)));

  it.each([
    'dumbbell-rdl',
    'farmer-carry',
    'kettlebell-rack-carry',
    'half-squat',
    'reverse-lunge',
    'forward-lunge',
  ] as const)('%s: no front segment is longer than in the profile', (id) => {
    for (const working of ['right', 'left'] as const)
      for (const t of PHASES) {
        const f = frontMovementPose(id, t, working);
        for (const [a, b] of [
          ['neck', 'hip'],
          ['neck', 'eR'],
          ['eR', 'hR'],
          ['neck', 'eL'],
          ['eL', 'hL'],
          ['hip', 'kR'],
          ['kR', 'aR'],
          ['hip', 'kL'],
          ['kL', 'aL'],
        ] as const)
          expect(len(f, a, b), `${id} ${a}-${b}@${t}`).toBeLessThanOrEqual(
            profileMax(id, a, b) + 0.1,
          );
      }
  });

  it('kettlebell rack carry puts the rack elbow below the shoulder, by the ribs', () => {
    for (const working of ['right', 'left'] as const)
      for (const t of [0, 0.25, 0.5, 0.75]) {
        const f = frontMovementPose('kettlebell-rack-carry', t, working);
        const elbow = working === 'right' ? f.eR : f.eL;
        expect(elbow[1], `${working}@${t}`).toBeGreaterThan(f.neck[1] + 8);
      }
  });

  it('bench side plank oblique never draws an arm or the trunk longer than the profile', () => {
    for (const t of PHASES)
      for (const working of ['right', 'left'] as const) {
        const o = obliqueMovementPose('bench-side-plank-leg-lift', t, working);
        const p = movementPose('bench-side-plank-leg-lift', t);
        for (const [a, b] of [
          ['neck', 'hip'],
          ['eR', 'hR'],
          ['eL', 'hL'],
        ] as const)
          expect(len(o, a, b), `${a}-${b}`).toBeLessThanOrEqual(
            Math.max(len(p, a, b), len(p, 'eR', 'hR')) + 0.1,
          );
      }
  });

  it('lateral raise has a front view with both arms rising to shoulder height', () => {
    expect(supportedViewsFor('lateral-raise')).toEqual(['side', 'front']);
    const start = frontMovementPose('lateral-raise', 0);
    const end = frontMovementPose('lateral-raise', 1);
    expect(end.hR[1]).toBeLessThan(start.hR[1] - 25);
    expect(Math.abs(end.hR[1] - end.neck[1])).toBeLessThan(12);
    expect(end.hR[1]).toBeCloseTo(end.hL[1], 6);
    // Out to both sides, symmetric about the body.
    expect(end.hR[0] + end.hL[0]).toBeCloseTo(2 * end.neck[0], 6);
    expect(end.neck[0] - end.hR[0]).toBeGreaterThan(40);
    for (const t of PHASES) {
      const f = frontMovementPose('lateral-raise', t);
      expect(len(f, 'neck', 'eR')).toBeCloseTo(24.6, 5);
      expect(len(f, 'eR', 'hR')).toBeCloseTo(22.6, 5);
      expect(f.aR[1]).toBe(174);
    }
    const markup = renderToStaticMarkup(
      <FigureFrame
        exerciseId="lateral-raise"
        pose={movementPose('lateral-raise', 1)}
        view="front"
        phase={1}
      />,
    );
    expect(markup).toContain('data-view="front"');
    // The dumbbells point front to back: end-on discs, not a wide bar.
    expect(markup).toContain('data-grip="end-on"');
    expect(markup.match(/<circle[^>]*r="6"/g)?.length).toBe(2);
  });
});

describe('E11-E30 review fixes (floor contact)', () => {
  it('no side figure of the fixed exercises goes below the floor', () => {
    for (const id of [
      'hamstring-curl',
      'glute-bridge',
      'reverse-lunge',
      'forward-lunge',
      'half-squat',
      'lying-leg-raise',
    ] as const)
      for (const t of PHASES) {
        const p = movementPose(id, t);
        for (const key of ['tR', 'tL', 'aR', 'aL'] as const)
          expect(p[key][1], `${id} ${key}@${t}`).toBeLessThanOrEqual(
            FLOOR - 0.5,
          );
      }
  });
});
