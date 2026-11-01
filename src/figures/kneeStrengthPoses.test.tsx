import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { kneeStrengthExercises } from '../content/kneeStrengthExercises';
import { Figure, FigureFrame, movementPose } from './Figure';
import { checkPoseGeometry } from './keyframes';
import type { Pt } from './lerp';
import { figures, POSE_KEYS } from './poses';

const phases = Array.from({ length: 41 }, (_, i) => i / 40);
const distance = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

describe('contact aware knee figures', () => {
  it('keeps both step-down legs reachable with fixed thigh, shin and foot lengths', () => {
    for (const phase of phases) {
      const pose = movementPose('step-down', phase);
      for (const [knee, ankle, toe, thigh, shin, foot] of [
        ['kR', 'aR', 'tR', 34, 33, 13],
        ['kL', 'aL', 'tL', 34, 33, 13],
      ] as const) {
        expect(distance(pose.hip, pose[ankle])).toBeLessThanOrEqual(
          thigh + shin,
        );
        expect(distance(pose.hip, pose[knee])).toBeCloseTo(thigh, 8);
        expect(distance(pose[knee], pose[ankle])).toBeCloseTo(shin, 8);
        expect(distance(pose[ankle], pose[toe])).toBeCloseTo(foot, 8);
      }
    }
  });
  it('frames the step-down head and floor throughout the movement', () => {
    for (const phase of [0, 0.5, 1]) {
      const pose = movementPose('step-down', phase);
      const markup = renderToStaticMarkup(
        <FigureFrame exerciseId="step-down" pose={pose} />,
      );
      const box = markup
        .match(/viewBox="([^"]+)"/)?.[1]
        ?.split(' ')
        .map(Number);
      if (!box) throw new Error('missing frame');
      expect(box[1]).toBeLessThanOrEqual(pose.head[1] - 12);
      expect((box[1] ?? 0) + (box[3] ?? 0)).toBeGreaterThanOrEqual(181);
    }
  });
  it('keeps every joint finite and legs fixed in length', () => {
    for (const exercise of kneeStrengthExercises)
      for (const phase of phases) {
        const p = movementPose(exercise.id, phase),
          start = movementPose(exercise.id, 0);
        for (const point of Object.values(p))
          for (const coordinate of point)
            expect(Number.isFinite(coordinate), exercise.id).toBe(true);
        for (const [a, b] of [
          ['hip', 'kR'],
          ['kR', 'aR'],
          ['aR', 'tR'],
          ['neck', 'hip'],
        ] as const)
          expect(
            distance(p[a], p[b]),
            `${exercise.id}:${phase}:${a}`,
          ).toBeCloseTo(distance(start[a], start[b]), 5);
      }
  });
  it('fixes BOSU feet, Copenhagen upper knee, Nordic knees/ankles and tibialis heels', () => {
    for (const phase of phases) {
      for (const [id, keys] of [
        ['bosu-squat', ['aR', 'tR', 'aL', 'tL']],
        ['copenhagen-hold', ['kR']],
        ['nordic-hamstring-curl', ['kR', 'kL', 'aR', 'aL']],
        ['wall-tibialis-raise', ['aR', 'aL']],
        ['bent-knee-calf-hold', ['tR']],
        ['step-down', ['aR', 'tR']],
      ] as const)
        for (const key of keys)
          expect(movementPose(id, phase)[key]).toEqual(
            movementPose(id, 0)[key],
          );
      const calf = movementPose('bent-knee-calf-hold', phase);
      const cross =
        (calf.hip[0] - calf.kR[0]) * (calf.aR[1] - calf.kR[1]) -
        (calf.hip[1] - calf.kR[1]) * (calf.aR[0] - calf.kR[0]);
      expect(Math.abs(cross)).toBeGreaterThan(100);
    }
    const hold = movementPose('copenhagen-hold', 1);
    expect(hold.kR[1]).toBe(127);
    expect(hold.kL[1]).toBeGreaterThan(hold.kR[1]);
    expect(movementPose('wall-tibialis-raise', 1).tR[1]).toBeLessThan(170);
    expect(movementPose('bent-knee-calf-hold', 1).aR[1]).toBeLessThan(170);
  });
  it('shows hands on floor and hip flexion during Nordic reset, with matching cycle ends', () => {
    const catchPose = movementPose('nordic-hamstring-curl', 0.5);
    for (const phase of [0.55, 0.6, 0.7, 0.8, 0.83]) {
      const pose = movementPose('nordic-hamstring-curl', phase);
      expect(pose.hR).toEqual(catchPose.hR);
      expect(pose.hL).toEqual(catchPose.hL);
    }
    for (const phase of phases) {
      const pose = movementPose('nordic-hamstring-curl', phase);
      for (const [elbow, hand] of [
        ['eR', 'hR'],
        ['eL', 'hL'],
      ] as const) {
        expect(distance(pose.neck, pose[elbow])).toBeCloseTo(30, 5);
        expect(distance(pose[elbow], pose[hand])).toBeCloseTo(30, 5);
      }
    }
    const reset = movementPose('nordic-hamstring-curl', 0.7);
    expect(reset.hR[1]).toBe(174);
    const slopeLeg = Math.atan2(
      reset.hip[1] - reset.kR[1],
      reset.hip[0] - reset.kR[0],
    );
    const slopeTorso = Math.atan2(
      reset.neck[1] - reset.hip[1],
      reset.neck[0] - reset.hip[0],
    );
    expect(Math.abs(slopeLeg - slopeTorso)).toBeGreaterThan(0.3);
    expect(movementPose('nordic-hamstring-curl', 1)).toEqual(
      movementPose('nordic-hamstring-curl', 0),
    );
  });
  it('caps BOSU squat knee flexion at the bottom', () => {
    const bottom = movementPose('bosu-squat', 1);
    expect(distance(bottom.hip, bottom.aR)).toBeGreaterThanOrEqual(47);
    expect(distance(bottom.hip, bottom.aL)).toBeGreaterThanOrEqual(47);
  });
  it('lowers the free heel 5-8 cm below a stair-height step without touching the floor', () => {
    const start = movementPose('step-down', 0),
      end = movementPose('step-down', 1);
    const step = figures['step-down'].props.find((p) => p.type === 'step');
    expect(start.aR).toEqual(end.aR);
    // Stair height: 14 units (about 19 cm), replacing the old 32-unit step.
    expect(step).toEqual({ type: 'step', x: 84, y: 164, w: 34 });
    expect(end.aL[0]).toBeGreaterThan(118);
    expect(end.aL[1]).toBeGreaterThan(167);
    expect(end.aL[1]).toBeLessThan(170);
    expect(end.aL[1]).toBeGreaterThan(start.aL[1]);
    expect(178 - Math.max(end.aL[1], end.tL[1])).toBeGreaterThanOrEqual(6);
  });
  it('supports the step-down with a banister beside the body, not a wall', () => {
    const props = figures['step-down'].props;
    expect(props.some((p) => p.type === 'rail')).toBe(true);
    expect(props.some((p) => p.type === 'wall')).toBe(false);
  });
  it('renders specialty supports and holds in session stills', () => {
    for (const id of ['copenhagen-hold', 'bent-knee-calf-hold'] as const) {
      const still = renderToStaticMarkup(<Figure exerciseId={id} stillOnly />);
      const expected = renderToStaticMarkup(
        <FigureFrame exerciseId={id} pose={figures[id].end} phase={1} />,
      );
      expect(still).toBe(expected);
    }
    expect(renderToStaticMarkup(<Figure exerciseId="bosu-squat" />)).toContain(
      'data-equipment="bosu"',
    );
  });
  it('wall tibialis raise: passes the geometry gate and keeps every joint in front of the wall', () => {
    const wall = figures['wall-tibialis-raise'].props.find(
      (p) => p.type === 'wall',
    );
    if (wall?.type !== 'wall') throw new Error('missing wall');
    const frames = Array.from({ length: 101 }, (_, i) =>
      movementPose('wall-tibialis-raise', i / 100),
    );
    expect(
      checkPoseGeometry(frames, {
        floorY: 178,
        viewBox: [14, 20, 164, 168],
        props: figures['wall-tibialis-raise'].props,
        minHeadClearance: 9,
        // Back against the wall: neck and hip stay within 5 units of it.
        supports: [
          { joint: 'neck', prop: 'wall', maxGap: 5 },
          { joint: 'hip', prop: 'wall', maxGap: 5 },
        ],
        // A controlled rep ends where it peaks, so the loop is not closed.
        allowlist: {
          'loop-mismatch:tR': 'controlled motion',
          'loop-mismatch:tL': 'controlled motion',
        },
      }),
    ).toEqual([]);
    for (const f of frames)
      for (const key of POSE_KEYS)
        expect(f[key][0]).toBeGreaterThanOrEqual(wall.x + 3);
  });
  it('copenhagen hold: knee rests on the bench, torso is straight, passes the gate', () => {
    const bench = figures['copenhagen-hold'].props.find(
      (p) => p.type === 'bench',
    );
    if (bench?.type !== 'bench') throw new Error('missing bench');
    const frames = Array.from({ length: 101 }, (_, i) =>
      movementPose('copenhagen-hold', i / 100),
    );
    for (const f of frames) {
      expect(f.kR[1]).toBeGreaterThanOrEqual(bench.y - 4);
      expect(f.kR[1]).toBeLessThanOrEqual(bench.y);
    }
    // The figure is a hold: it is drawn at its end pose (t = 1).
    const hold = movementPose('copenhagen-hold', 1);
    expect(hold.aL[1]).toBeLessThanOrEqual(170);
    expect(hold.tL[1]).toBeLessThanOrEqual(170);
    const angle = (a: Pt, b: Pt) => Math.atan2(b[1] - a[1], b[0] - a[0]);
    const d = angle(hold.kR, hold.hip) - angle(hold.hip, hold.neck);
    const gap = Math.abs(Math.atan2(Math.sin(d), Math.cos(d)));
    expect(gap).toBeLessThan(0.05);
    expect(
      checkPoseGeometry([hold, hold], {
        floorY: 178,
        viewBox: [14, 20, 164, 168],
        props: figures['copenhagen-hold'].props,
        minHeadClearance: 9,
        allowlist: {
          'limb-asymmetry:kR-aR': 'bent shin points away from the camera',
          'limb-asymmetry:aR-tR': 'bent shin points away from the camera',
        },
      }),
    ).toEqual([]);
  });
});
