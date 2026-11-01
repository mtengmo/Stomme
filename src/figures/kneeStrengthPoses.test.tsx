import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { kneeStrengthExercises } from '../content/kneeStrengthExercises';
import { Figure, FigureFrame, movementPose } from './Figure';
import type { Pt } from './lerp';
import { figures } from './poses';

const phases = Array.from({ length: 41 }, (_, i) => i / 40);
const distance = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

describe('contact aware knee figures', () => {
  it('keeps both step-down legs reachable with fixed thigh, shin and foot lengths', () => {
    for (const phase of phases) {
      const pose = movementPose('step-down', phase);
      for (const [knee, ankle, toe, thigh, shin] of [
        ['kR', 'aR', 'tR', 32, 31],
        ['kL', 'aL', 'tL', 39, 39],
      ] as const) {
        expect(distance(pose.hip, pose[ankle])).toBeLessThanOrEqual(
          thigh + shin,
        );
        expect(distance(pose.hip, pose[knee])).toBeCloseTo(thigh, 8);
        expect(distance(pose[knee], pose[ankle])).toBeCloseTo(shin, 8);
        expect(distance(pose[ankle], pose[toe])).toBeCloseTo(
          Math.hypot(13, 3),
          8,
        );
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
  it('lowers the free heel past the step while the supporting foot stays planted', () => {
    const start = movementPose('step-down', 0),
      end = movementPose('step-down', 1);
    expect(start.aR).toEqual(end.aR);
    expect(end.aL[0]).toBeGreaterThan(127);
    expect(end.aL[1]).toBeGreaterThan(146);
    expect(end.aL[1]).toBeGreaterThan(start.aL[1]);
    expect(figures['step-down'].props).toContainEqual({
      type: 'step',
      x: 91,
      y: 146,
      w: 36,
    });
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
});
