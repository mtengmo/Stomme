import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Figure, FigureFrame, movementPose } from './Figure';
import { defaultViewFor, frontMovementPose } from './frontViews';
import { figures } from './poses';

const distance = (a: readonly [number, number], b: readonly [number, number]) =>
  Math.hypot(a[0] - b[0], a[1] - b[1]);
const cross = (
  origin: readonly [number, number],
  elbow: readonly [number, number],
  hand: readonly [number, number],
) =>
  (elbow[0] - origin[0]) * (hand[1] - elbow[1]) -
  (elbow[1] - origin[1]) * (hand[0] - elbow[0]);

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

describe('weighted glute bridge figure geometry', () => {
  it('raises the pelvis and single dumbbell while shoulders and feet stay planted', () => {
    const start = movementPose('weighted-glute-bridge', 0);
    const top = movementPose('weighted-glute-bridge', 1);

    expect(figures['weighted-glute-bridge'].held).toEqual({
      kind: 'dumbbell',
      hands: ['hR'],
    });
    for (let frame = 0; frame <= 20; frame++) {
      const pose = movementPose('weighted-glute-bridge', frame / 20);
      expect(pose.head).toEqual(start.head);
      expect(pose.neck).toEqual(start.neck);
      expect(pose.aR).toEqual(start.aR);
      expect(pose.tR).toEqual(start.tR);
      expect(pose.aL).toEqual(start.aL);
      expect(pose.tL).toEqual(start.tL);
      expect(pose.hR).toEqual(pose.hL);
      expect(pose.hR[0]).toBe(pose.hip[0]);
      expect(pose.hip[1] - pose.hR[1]).toBe(4);

      // The one load stays reachable from the shoulder line as its anchor
      // follows the pelvis through the raise.
      for (const elbow of [pose.eR, pose.eL]) {
        expect(distance(pose.neck, elbow)).toBeGreaterThan(12);
        expect(distance(pose.neck, elbow)).toBeLessThan(32);
        expect(distance(elbow, pose.hR)).toBeGreaterThan(12);
        expect(distance(elbow, pose.hR)).toBeLessThan(32);
      }
    }

    expect(top.hip[1]).toBeLessThan(start.hip[1]);
    expect(top.hR[1]).toBeLessThan(start.hR[1]);
    const centerKnee: readonly [number, number] = [
      (top.kR[0] + top.kL[0]) / 2,
      (top.kR[1] + top.kL[1]) / 2,
    ];
    expect(
      distance(top.neck, top.hip) + distance(top.hip, centerKnee),
    ).toBeCloseTo(distance(top.neck, centerKnee), 0);

    const markup = renderToStaticMarkup(
      <FigureFrame
        exerciseId="weighted-glute-bridge"
        pose={top}
        working="right"
        equipment="dumbbell"
      />,
    );
    expect(markup).toContain('data-equipment="dumbbell"');
    expect(markup).toContain('height="5"');
  });
});

describe('overhead triceps extension figure geometry', () => {
  it('keeps upper arms still and arcs one shared dumbbell behind and over the head', () => {
    const start = movementPose('overhead-triceps-extension', 0);
    const middle = movementPose('overhead-triceps-extension', 0.5);
    const end = movementPose('overhead-triceps-extension', 1);

    expect(figures['overhead-triceps-extension'].held).toEqual({
      kind: 'dumbbell',
      hands: ['hR'],
    });
    expect(start.eR).toEqual(middle.eR);
    expect(start.eR).toEqual(end.eR);
    expect(start.eL).toEqual(middle.eL);
    expect(start.eL).toEqual(end.eL);
    expect(start.hR).toEqual(start.hL);
    expect(middle.hR).toEqual(middle.hL);
    expect(end.hR).toEqual(end.hL);
    expect(start.hR[1]).toBeGreaterThan(start.head[1]);
    expect(middle.hR[0]).toBeGreaterThan(start.hR[0]);
    expect(end.hR[1]).toBeLessThan(end.head[1]);

    for (let frame = 0; frame <= 20; frame++) {
      const pose = movementPose('overhead-triceps-extension', frame / 20);
      expect(pose.head).toEqual(start.head);
      expect(pose.neck).toEqual(start.neck);
      expect(pose.hip).toEqual(start.hip);
      expect(pose.kR).toEqual(start.kR);
      expect(pose.aR).toEqual(start.aR);
      expect(pose.kL).toEqual(start.kL);
      expect(pose.aL).toEqual(start.aL);
      expect(pose.eR).toEqual(start.eR);
      expect(pose.eL).toEqual(start.eL);
      expect(pose.hR).toEqual(pose.hL);
      expect(distance(pose.hR, pose.head)).toBeGreaterThan(30);
      for (const elbow of [pose.eR, pose.eL]) {
        const upperLength = distance(pose.neck, elbow);
        const forearmLength = distance(elbow, pose.hR);
        expect(forearmLength).toBeGreaterThan(18);
        expect(forearmLength).toBeLessThan(36);
        expect(cross(pose.neck, elbow, pose.hR)).toBeGreaterThanOrEqual(-1);
        if (frame === 20)
          expect(
            Math.abs(cross(pose.neck, elbow, pose.hR)) /
              (upperLength * forearmLength),
          ).toBeLessThan(0.02);
      }
    }

    const markup = renderToStaticMarkup(
      <FigureFrame
        exerciseId="overhead-triceps-extension"
        pose={end}
        working="right"
        equipment="dumbbell"
      />,
    );
    expect(markup.match(/data-equipment="dumbbell"/g)).toHaveLength(1);
  });
});

describe('dumbbell pullover figure geometry', () => {
  it('keeps the floor setup fixed through a constant-length, softly bent shoulder arc', () => {
    const start = movementPose('dumbbell-pullover', 0);
    const middle = movementPose('dumbbell-pullover', 0.5);
    const end = movementPose('dumbbell-pullover', 1);

    expect(figures['dumbbell-pullover'].held).toEqual({
      kind: 'dumbbell',
      hands: ['hR'],
    });
    expect(start.hR[0]).toBeGreaterThan(start.head[0]);
    expect(middle.hR[0]).toBeLessThan(start.hR[0]);
    expect(end.hR[0]).toBeLessThan(end.head[0]);
    expect(end.hR[1] + 5).toBeGreaterThan(168);
    expect(end.hR[1] + 5).toBeLessThan(178);

    for (let frame = 0; frame <= 20; frame++) {
      const pose = movementPose('dumbbell-pullover', frame / 20);
      expect(pose.head).toEqual(start.head);
      expect(pose.neck).toEqual(start.neck);
      expect(pose.hip).toEqual(start.hip);
      expect(pose.kR).toEqual(start.kR);
      expect(pose.aR).toEqual(start.aR);
      expect(pose.tR).toEqual(start.tR);
      expect(pose.kL).toEqual(start.kL);
      expect(pose.aL).toEqual(start.aL);
      expect(pose.tL).toEqual(start.tL);
      expect(pose.hR).toEqual(pose.hL);
      expect(distance(pose.hR, pose.head)).toBeGreaterThan(30);
      expect(pose.hR[1] + 5).toBeLessThan(178);
      expect(distance(pose.neck, pose.eR)).toBeCloseTo(24, 5);
      expect(distance(pose.eR, pose.hR)).toBeCloseTo(23, 5);
      const shoulderToElbow: readonly [number, number] = [
        pose.neck[0] - pose.eR[0],
        pose.neck[1] - pose.eR[1],
      ];
      const elbowToHand: readonly [number, number] = [
        pose.hR[0] - pose.eR[0],
        pose.hR[1] - pose.eR[1],
      ];
      const cosine =
        (shoulderToElbow[0] * elbowToHand[0] +
          shoulderToElbow[1] * elbowToHand[1]) /
        (distance(pose.neck, pose.eR) * distance(pose.eR, pose.hR));
      const elbowAngle = (Math.acos(cosine) * 180) / Math.PI;
      expect(elbowAngle).toBeCloseTo(165, 5);
    }

    const markup = renderToStaticMarkup(
      <FigureFrame
        exerciseId="dumbbell-pullover"
        pose={end}
        working="right"
        equipment="dumbbell"
      />,
    );
    expect(markup.match(/data-equipment="dumbbell"/g)).toHaveLength(1);
    expect(markup).toContain('height="5"');
    expect(markup.indexOf('data-figure-head-mask="pullover"')).toBeGreaterThan(
      markup.indexOf('data-body-side="near"'),
    );

    const otherExerciseMarkup = renderToStaticMarkup(
      <FigureFrame
        exerciseId="floor-press"
        pose={movementPose('floor-press', 1)}
        working="right"
        equipment="dumbbell"
      />,
    );
    expect(otherExerciseMarkup).not.toContain('data-figure-head-mask');
  });
});

describe('side lunge front geometry', () => {
  it.each(['right', 'left'] as const)(
    'steps the selected %s foot outward, bends that leg, and keeps the other long',
    (working) => {
      const start = frontMovementPose('side-lunge', 0, working);
      const planted = frontMovementPose('side-lunge', 0.5, working);
      const bottom = frontMovementPose('side-lunge', 1, working);
      const selected = working === 'right' ? 'R' : 'L';
      const other = working === 'right' ? 'L' : 'R';
      const ankleKey = selected === 'R' ? 'aR' : 'aL';
      const toeKey = selected === 'R' ? 'tR' : 'tL';
      const kneeKey = selected === 'R' ? 'kR' : 'kL';
      const otherAnkleKey = other === 'R' ? 'aR' : 'aL';
      const otherKneeKey = other === 'R' ? 'kR' : 'kL';

      expect(defaultViewFor('side-lunge')).toBe('front');
      expect(defaultViewFor('reverse-lunge')).toBe('side');
      expect(start[ankleKey][0]).not.toBe(planted[ankleKey][0]);
      expect(planted[ankleKey]).toEqual(bottom[ankleKey]);
      expect(planted[otherAnkleKey]).toEqual(bottom[otherAnkleKey]);
      expect(start[otherAnkleKey]).toEqual(bottom[otherAnkleKey]);
      if (working === 'left') expect(bottom.hip[0]).toBeGreaterThan(100);
      else expect(bottom.hip[0]).toBeLessThan(100);
      if (working === 'right')
        expect(bottom[toeKey][0]).toBeLessThan(bottom[ankleKey][0]);
      else expect(bottom[toeKey][0]).toBeGreaterThan(bottom[ankleKey][0]);

      const otherLegLengthViaKnee =
        distance(bottom.hip, bottom[otherKneeKey]) +
        distance(bottom[otherKneeKey], bottom[otherAnkleKey]);
      expect(otherLegLengthViaKnee).toBeCloseTo(
        distance(bottom.hip, bottom[otherAnkleKey]),
        4,
      );
      expect(
        distance(bottom.hip, bottom[kneeKey]) +
          distance(bottom[kneeKey], bottom[ankleKey]),
      ).toBeGreaterThan(distance(bottom.hip, bottom[ankleKey]) + 2);

      expect(start.hR).toEqual(start.hL);
      expect(bottom.hR).toEqual(bottom.hL);
      expect(figures['side-lunge'].held?.hands).toEqual(['hR']);
      for (const side of ['right', 'left'] as const) {
        const loaded = renderToStaticMarkup(
          <FigureFrame
            exerciseId="side-lunge"
            pose={frontMovementPose('side-lunge', 1, side)}
            working={side}
            view="front"
            equipment="dumbbell"
          />,
        );
        expect(loaded.match(/data-equipment="dumbbell"/g)).toHaveLength(1);
        const unloaded = renderToStaticMarkup(
          <FigureFrame
            exerciseId="side-lunge"
            pose={frontMovementPose('side-lunge', 1, side)}
            working={side}
            view="front"
            equipment={null}
          />,
        );
        expect(unloaded).not.toContain('data-equipment="dumbbell"');
      }

      const defaultFigure = renderToStaticMarkup(
        <Figure exerciseId="side-lunge" stillOnly paused working={working} />,
      );
      expect(defaultFigure).toContain('data-view="front"');
    },
  );
});
