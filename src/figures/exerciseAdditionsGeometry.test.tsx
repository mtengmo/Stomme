import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  Figure,
  FigureFrame,
  movementPose,
  russianTwistReducedFrames,
  stillFramePhase,
  walkingLungeReducedFrames,
} from './Figure';
import {
  defaultViewFor,
  frontMovementPose,
  obliqueMovementPose,
} from './frontViews';
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
        2,
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

describe('walking lunge two-step geometry', () => {
  it('alternates lead legs while planted feet stay at ground and camera-relative world positions', () => {
    const rightLead = movementPose('walking-lunge', 0);
    const firstRise = movementPose('walking-lunge', 0.25);
    const leftLead = movementPose('walking-lunge', 0.5);
    const secondRise = movementPose('walking-lunge', 0.75);
    const cycleEnd = movementPose('walking-lunge', 1);

    expect(figures['walking-lunge'].motion).toBe('sequence');
    expect(figures['walking-lunge'].start).toEqual(rightLead);
    expect(figures['walking-lunge'].end).toEqual(leftLead);
    expect(leftLead.kR).toEqual(rightLead.kL);
    expect(leftLead.aR).toEqual(rightLead.aL);
    expect(leftLead.kL).toEqual(rightLead.kR);
    expect(leftLead.aL).toEqual(rightLead.aR);
    expect(cycleEnd).toEqual(rightLead);

    expect(rightLead.aR[0]).toBe(132);
    expect(rightLead.aL[0]).toBe(73);
    expect(leftLead.aR[0]).toBe(73);
    expect(leftLead.aL[0]).toBe(132);
    expect(firstRise.aR[0]).toBeCloseTo(102.5, 4);
    expect(firstRise.aL[0]).toBeCloseTo(102.5, 4);
    expect(firstRise.aR[1]).toBe(174);
    expect(firstRise.aL[1]).toBe(150);
    expect(secondRise.aL[1]).toBe(174);
    expect(secondRise.aR[1]).toBe(150);
    expect(firstRise.hip[1]).toBe(110);
    expect(secondRise.hip[1]).toBe(110);
    expect(rightLead.hip[1]).toBe(128);
    expect(leftLead.hip[1]).toBe(128);

    let previous: ReturnType<typeof movementPose> | undefined;
    for (let frame = 0; frame <= 100; frame++) {
      const t = frame / 100;
      const pose = movementPose('walking-lunge', t);
      const cameraAdvance = 118 * t;
      expect(pose.hR[1] - pose.hip[1]).toBeCloseTo(3, 8);
      expect(pose.hL[1] - pose.hip[1]).toBeCloseTo(3, 8);
      expect(pose.aR[1]).toBeGreaterThanOrEqual(150);
      expect(pose.aR[1]).toBeLessThanOrEqual(174);
      expect(pose.aL[1]).toBeGreaterThanOrEqual(150);
      expect(pose.aL[1]).toBeLessThanOrEqual(174);
      if (t <= 0.5) expect(pose.aR[1]).toBe(174);
      if (t >= 0.5) expect(pose.aL[1]).toBe(174);
      expect(pose.tR[1]).toBe(pose.aR[1] + 3);
      expect(pose.tL[1]).toBe(pose.aL[1] + 3);
      expect(distance(pose.hip, pose.kR)).toBeCloseTo(34, 5);
      expect(distance(pose.kR, pose.aR)).toBeCloseTo(32, 5);
      expect(distance(pose.hip, pose.kL)).toBeCloseTo(34, 5);
      expect(distance(pose.kL, pose.aL)).toBeCloseTo(32, 5);
      expect(cross(pose.hip, pose.aR, pose.kR)).toBeLessThan(0);
      expect(cross(pose.hip, pose.aL, pose.kL)).toBeLessThan(0);
      if (t <= 0.5) expect(pose.aR[0] + cameraAdvance).toBeCloseTo(132, 4);
      if (t >= 0.5) expect(pose.aL[0] + cameraAdvance).toBeCloseTo(191, 4);
      if (previous) {
        for (const key of ['head', 'hip', 'aR', 'aL', 'kR', 'kL'] as const)
          expect(distance(pose[key], previous[key])).toBeLessThan(10);
      }
      previous = pose;
    }

    expect(figures['walking-lunge'].held?.hands).toEqual(['hR', 'hL']);
    expect(rightLead.hR).not.toEqual(rightLead.hL);
    const staticFrames = walkingLungeReducedFrames();
    expect(staticFrames.map(([label]) => label)).toEqual([
      'Utfall',
      'Steg framåt',
    ]);
    const bottomStill = staticFrames[0][1];
    const stepStill = staticFrames[1][1];
    expect(bottomStill.hip[1]).toBe(128);
    expect(stepStill.hip[1]).toBe(110);
    expect(bottomStill.aR[0]).toBe(132);
    expect(stepStill.aR[0]).toBeCloseTo(102.5, 4);
    expect(stepStill.aL[1]).toBe(150);
    expect(bottomStill).not.toEqual(stepStill);

    const bottomMarkup = renderToStaticMarkup(
      <FigureFrame
        exerciseId="walking-lunge"
        pose={bottomStill}
        working={null}
        equipment="dumbbell"
      />,
    );
    const stepMarkup = renderToStaticMarkup(
      <FigureFrame
        exerciseId="walking-lunge"
        pose={stepStill}
        working={null}
        equipment="dumbbell"
      />,
    );
    expect(bottomMarkup).not.toBe(stepMarkup);

    const markup = renderToStaticMarkup(
      <FigureFrame
        exerciseId="walking-lunge"
        pose={firstRise}
        working={null}
        equipment="dumbbell"
      />,
    );
    expect(markup).toContain('data-equipment="dumbbell"');
  });
});

describe('kettlebell goblet squat figure geometry', () => {
  it('uses a normal stance with fixed feet and one bell below the shared two-hand grip', () => {
    const start = movementPose('kettlebell-goblet-squat', 0);
    const bottom = movementPose('kettlebell-goblet-squat', 1);

    expect(figures['kettlebell-goblet-squat'].held).toEqual({
      kind: 'kettlebell',
      hands: ['hR'],
    });
    expect(start.hR).toEqual(start.hL);
    expect(bottom.hR).toEqual(bottom.hL);
    expect(Math.abs(start.aR[0] - start.aL[0])).toBe(22);
    expect(
      Math.abs(
        figures['sumo-squat'].start.aR[0] - figures['sumo-squat'].start.aL[0],
      ),
    ).toBe(50);

    for (const [knee, ankle] of [
      [start.kR, start.aR],
      [start.kL, start.aL],
    ] as const)
      expect(distance(start.hip, knee) + distance(knee, ankle)).toBeCloseTo(
        distance(start.hip, ankle),
        2,
      );

    for (let frame = 0; frame <= 20; frame++) {
      const pose = movementPose('kettlebell-goblet-squat', frame / 20);
      expect(pose.aR).toEqual(start.aR);
      expect(pose.tR).toEqual(start.tR);
      expect(pose.aL).toEqual(start.aL);
      expect(pose.tL).toEqual(start.tL);
      expect(pose.hR).toEqual(pose.hL);
      expect(distance(pose.neck, pose.eR)).toBeGreaterThan(24);
      expect(distance(pose.neck, pose.eR)).toBeLessThan(34);
      expect(distance(pose.eR, pose.hR)).toBeGreaterThan(16);
      expect(distance(pose.eR, pose.hR)).toBeLessThan(23);
    }

    expect(bottom.hip[1]).toBeGreaterThan(start.hip[1]);
    expect(
      distance(bottom.hip, bottom.kR) + distance(bottom.kR, bottom.aR),
    ).toBeGreaterThan(distance(bottom.hip, bottom.aR) + 5);

    const markup = renderToStaticMarkup(
      <FigureFrame
        exerciseId="kettlebell-goblet-squat"
        pose={bottom}
        working={null}
        equipment="kettlebell"
      />,
    );
    expect(markup.match(/data-equipment="kettlebell"/g)).toHaveLength(1);
    expect(markup.match(/<circle cx=/g)).toHaveLength(2);
    expect(markup).toContain(`cy="${bottom.hR[1] + 12}"`);
  });
});

describe('russian twist oblique geometry', () => {
  it('rotates the chest and shared weight while pelvis, trunk axis, and feet stay fixed', () => {
    const centerStart = obliqueMovementPose('russian-twist', 0, null);
    const leftTurn = obliqueMovementPose('russian-twist', 0.25, null);
    const centerReturn = obliqueMovementPose('russian-twist', 0.5, null);
    const rightTurn = obliqueMovementPose('russian-twist', 0.75, null);
    const centerEnd = obliqueMovementPose('russian-twist', 1, null);

    expect(defaultViewFor('russian-twist')).toBe('oblique');
    expect(stillFramePhase('russian-twist', 'oblique', 'Vrid åt vänster')).toBe(
      0.25,
    );
    expect(stillFramePhase('russian-twist', 'oblique', 'Vrid åt höger')).toBe(
      0.75,
    );
    expect(centerEnd).toEqual(centerStart);
    expect(centerReturn.head).toEqual(centerStart.head);
    expect(leftTurn.head).toEqual(centerStart.head);
    expect(rightTurn.head).toEqual(centerStart.head);
    for (const key of [
      'neck',
      'hip',
      'kR',
      'aR',
      'tR',
      'kL',
      'aL',
      'tL',
    ] as const) {
      expect(leftTurn[key]).toEqual(centerStart[key]);
      expect(rightTurn[key]).toEqual(centerStart[key]);
    }
    expect(centerStart.hip[1]).toBeGreaterThanOrEqual(165);
    expect(centerStart.hip[1]).toBeLessThanOrEqual(174);
    expect(centerStart.kR[1]).toBeLessThan(centerStart.hip[1]);
    expect(centerStart.kL[1]).toBeLessThan(centerStart.hip[1]);
    expect(centerStart.aR[1]).toBeGreaterThanOrEqual(170);
    expect(centerStart.aL[1]).toBeGreaterThanOrEqual(170);
    expect((centerStart.hR[1] + centerStart.hL[1]) / 2 + 21).toBeLessThan(175);

    const handCenterX = (pose: typeof centerStart) =>
      (pose.hR[0] + pose.hL[0]) / 2;
    expect(handCenterX(leftTurn)).toBeLessThan(handCenterX(centerStart));
    expect(handCenterX(rightTurn)).toBeGreaterThan(handCenterX(centerStart));
    expect(handCenterX(centerEnd)).toBeCloseTo(handCenterX(centerStart), 8);
    expect(leftTurn.hR[1]).toBe(centerStart.hR[1]);
    expect(rightTurn.hR[1]).toBe(centerStart.hR[1]);
    expect(figures['russian-twist'].held?.hands).toEqual(['hR', 'hL']);

    const leftMarkup = renderToStaticMarkup(
      <FigureFrame
        exerciseId="russian-twist"
        pose={leftTurn}
        working={null}
        view="oblique"
        phase={0.25}
        equipment="dumbbell"
      />,
    );
    const rightMarkup = renderToStaticMarkup(
      <FigureFrame
        exerciseId="russian-twist"
        pose={rightTurn}
        working={null}
        view="oblique"
        phase={0.75}
        equipment="dumbbell"
      />,
    );
    expect(leftMarkup).toContain('data-torso-yaw="-1.00"');
    expect(leftMarkup).toContain('data-contact-plane="seated-base"');
    expect(rightMarkup).toContain('data-torso-yaw="1.00"');
    expect(leftMarkup).not.toBe(rightMarkup);
    expect(leftMarkup.match(/data-equipment="dumbbell"/g)).toHaveLength(1);
    expect(leftMarkup.match(/<circle cx=/g)).toHaveLength(1);

    const bellMarkup = renderToStaticMarkup(
      <FigureFrame
        exerciseId="russian-twist"
        pose={leftTurn}
        working={null}
        view="oblique"
        phase={0.25}
        equipment="kettlebell"
      />,
    );
    expect(bellMarkup.match(/data-equipment="kettlebell"/g)).toHaveLength(1);
    expect(bellMarkup.match(/<circle cx=/g)).toHaveLength(2);
    expect(bellMarkup.indexOf('data-equipment="kettlebell"')).toBeGreaterThan(
      bellMarkup.indexOf('data-body-side="right"'),
    );
    const bodyweightMarkup = renderToStaticMarkup(
      <FigureFrame
        exerciseId="russian-twist"
        pose={leftTurn}
        working={null}
        view="oblique"
        phase={0.25}
        equipment={null}
      />,
    );
    expect(bodyweightMarkup).not.toContain('data-equipment="dumbbell"');

    const stills = russianTwistReducedFrames();
    expect(stills.map(([label]) => label)).toEqual([
      'Vrid åt vänster',
      'Vrid åt höger',
    ]);
    const defaultFigure = renderToStaticMarkup(
      <Figure exerciseId="russian-twist" stillOnly paused working={null} />,
    );
    expect(defaultFigure).toContain('data-view="oblique"');
  });
});

describe('woodchop figure geometry', () => {
  it('moves one shared-grip weight diagonally up with fixed feet and attached arms', () => {
    const start = movementPose('woodchop', 0);
    const end = movementPose('woodchop', 1);
    expect(figures.woodchop.held).toEqual({ kind: 'dumbbell', hands: ['hR'] });
    expect(end.hR[1]).toBeLessThan(start.hR[1] - 80);
    expect(end.hR[0]).toBeGreaterThan(start.hR[0]);
    for (let frame = 0; frame <= 20; frame++) {
      const pose = movementPose('woodchop', frame / 20);
      expect(pose.hR).toEqual(pose.hL);
      expect(pose.aR).toEqual(start.aR);
      expect(pose.tL).toEqual(start.tL);
      expect(distance(pose.neck, pose.eR)).toBeGreaterThan(15);
      expect(distance(pose.neck, pose.eR)).toBeLessThan(34);
      expect(distance(pose.eR, pose.hR)).toBeGreaterThan(14);
      expect(distance(pose.eR, pose.hR)).toBeLessThan(26);
    }
  });
});

describe('one-arm kettlebell swing figure geometry', () => {
  it('swings one bell with the free arm hanging clear of it', () => {
    expect(figures['one-arm-kettlebell-swing'].held).toEqual({
      kind: 'kettlebell',
      hands: ['hR'],
    });
    expect(figures['one-arm-kettlebell-swing'].motion).toBe('ballistic');
    for (let frame = 0; frame <= 20; frame++) {
      const pose = movementPose('one-arm-kettlebell-swing', frame / 20);
      expect(distance(pose.neck, pose.eL)).toBeLessThan(36);
      expect(distance(pose.eL, pose.hL)).toBeLessThan(28);
      expect(distance(pose.eL, pose.hL)).toBeGreaterThan(12);
    }
    const end = movementPose('one-arm-kettlebell-swing', 1);
    expect(end.hR[0]).toBeGreaterThan(end.hip[0] + 40);
    expect(end.hL[0]).toBeLessThan(end.hR[0] - 30);
  });
});
