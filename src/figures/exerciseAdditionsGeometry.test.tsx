import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FigureFrame, movementPose } from './Figure';
import { figures } from './poses';

const distance = (a: readonly [number, number], b: readonly [number, number]) =>
  Math.hypot(a[0] - b[0], a[1] - b[1]);

describe('bent-over row figure geometry', () => {
  it('keeps the hinge and feet fixed while both dumbbells row toward the hips', () => {
    const start = movementPose('bent-over-row', 0);
    const end = movementPose('bent-over-row', 1);

    for (let frame = 0; frame <= 20; frame++) {
      const pose = movementPose('bent-over-row', frame / 20);
      expect(pose.head).toEqual(start.head);
      expect(pose.neck).toEqual(start.neck);
      expect(pose.hip).toEqual(start.hip);
      expect(pose.aR).toEqual(start.aR);
      expect(pose.tR).toEqual(start.tR);
      expect(pose.aL).toEqual(start.aL);
      expect(pose.tL).toEqual(start.tL);

      // Both arms remain connected through the whole row path.
      for (const [elbow, hand] of [
        [pose.eR, pose.hR],
        [pose.eL, pose.hL],
      ] as const) {
        expect(distance(pose.neck, elbow)).toBeGreaterThan(15);
        expect(distance(pose.neck, elbow)).toBeLessThan(35);
        expect(distance(elbow, hand)).toBeGreaterThan(15);
        expect(distance(elbow, hand)).toBeLessThan(35);
      }
    }

    expect(end.hR[0]).toBeLessThan(start.hR[0]);
    expect(end.hL[0]).toBeLessThan(start.hL[0]);
    expect(distance(end.hR, start.hip)).toBeLessThan(
      distance(start.hR, start.hip),
    );
    expect(distance(end.hL, start.hip)).toBeLessThan(
      distance(start.hL, start.hip),
    );

    const markup = renderToStaticMarkup(
      <FigureFrame
        exerciseId="bent-over-row"
        pose={end}
        working="right"
        equipment="dumbbell"
      />,
    );
    expect(markup).toContain('data-equipment="dumbbell"');
  });
});

describe('sumo squat figure geometry', () => {
  it('keeps a wide toes-out stance and one shared two-hand dumbbell anchor', () => {
    const start = movementPose('sumo-squat', 0);
    const bottom = movementPose('sumo-squat', 1);

    expect(figures['sumo-squat'].held).toEqual({
      kind: 'dumbbell',
      hands: ['hR'],
    });
    expect(start.hR).toEqual(start.hL);
    expect(bottom.hR).toEqual(bottom.hL);
    for (const [knee, ankle] of [
      [start.kR, start.aR],
      [start.kL, start.aL],
    ] as const) {
      expect(distance(start.hip, knee) + distance(knee, ankle)).toBeCloseTo(
        distance(start.hip, ankle),
        4,
      );
    }

    for (let frame = 0; frame <= 20; frame++) {
      const pose = movementPose('sumo-squat', frame / 20);
      expect(pose.aR).toEqual(start.aR);
      expect(pose.tR).toEqual(start.tR);
      expect(pose.aL).toEqual(start.aL);
      expect(pose.tL).toEqual(start.tL);
      expect(pose.tR[0]).toBeGreaterThan(pose.aR[0]);
      expect(pose.tL[0]).toBeLessThan(pose.aL[0]);
      expect(pose.hR).toEqual(pose.hL);
    }

    expect(Math.abs(start.aR[0] - start.aL[0])).toBeGreaterThan(40);
    expect(bottom.hip[1]).toBeGreaterThan(start.hip[1]);
    expect(bottom.hR[1]).toBeGreaterThan(start.hR[1]);

    const markup = renderToStaticMarkup(
      <FigureFrame
        exerciseId="sumo-squat"
        pose={bottom}
        working="right"
        equipment="dumbbell"
      />,
    );
    expect(markup).toContain('data-equipment="dumbbell"');
  });
});
