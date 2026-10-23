import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FigureFrame, movementPose, supportedFrontViews } from './Figure';
import { frontMovementPose } from './frontViews';

describe('authored frontal demonstrations', () => {
  it('supports the six authored front-view exercises', () => {
    expect(supportedFrontViews).toEqual([
      'goblet-squat',
      'dumbbell-rdl',
      'kettlebell-rack-carry',
      'step-up',
      'rear-foot-split-squat',
      'suitcase-carry',
    ]);
  });

  it('marks anatomical H/V sides without mirroring the frontal figure', () => {
    const right = renderToStaticMarkup(
      <FigureFrame
        exerciseId="goblet-squat"
        pose={movementPose('goblet-squat', 0.4)}
        working="right"
        view="front"
        phase={0.4}
      />,
    );
    expect(right).toContain('data-body-side="right" stroke="var(--accent)"');
    expect(right).toContain('data-body-side="left" stroke="var(--edge)"');
    expect(right).toContain('>H</text>');
    expect(right).not.toContain('translate(192 0)');
    expect(right).toContain('data-view="front"');

    const left = renderToStaticMarkup(
      <FigureFrame
        exerciseId="goblet-squat"
        pose={movementPose('goblet-squat', 0.4)}
        working="left"
        view="front"
        phase={0.4}
      />,
    );
    expect(left).toContain('data-body-side="left" stroke="var(--accent)"');
    expect(left).toContain('data-body-side="right" stroke="var(--edge)"');
    expect(left).toContain('>V</text>');
  });

  it.each([
    ['goblet-squat', 'dumbbell', 1],
    ['goblet-squat', 'kettlebell', 1],
    ['goblet-squat', null, 0],
    ['dumbbell-rdl', 'dumbbell', 2],
    ['dumbbell-rdl', 'kettlebell', 1],
    ['kettlebell-rack-carry', 'kettlebell', 1],
    ['step-up', 'dumbbell', 2],
    ['step-up', 'kettlebell', 2],
    ['step-up', null, 0],
    ['rear-foot-split-squat', null, 0],
    ['suitcase-carry', 'kettlebell', 1],
    ['suitcase-carry', 'dumbbell', 1],
  ] as const)(
    'shows %s with %s equipment count %i in front view',
    (exerciseId, equipment, count) => {
      const markup = renderToStaticMarkup(
        <FigureFrame
          exerciseId={exerciseId}
          pose={movementPose(exerciseId, 0.5)}
          working="right"
          equipment={equipment}
          view="front"
          phase={0.5}
          showMuscles
        />,
      );
      expect((markup.match(/stroke-width="4"/g) ?? []).length).toBe(count);
      expect(markup).not.toContain('data-muscle');
      if (exerciseId === 'kettlebell-rack-carry')
        expect(markup).toContain('data-grip="rack"');
    },
  );

  it('changes the authored squat and carry geometry through the live phase', () => {
    const squatStart = frontMovementPose('goblet-squat', 0);
    const squatBottom = frontMovementPose('goblet-squat', 1);
    expect(squatBottom.hip[1]).toBeGreaterThan(squatStart.hip[1]);
    expect(squatBottom.kR[0]).toBeLessThan(squatStart.kR[0]);
    const carryStart = frontMovementPose('kettlebell-rack-carry', 0);
    const carryStep = frontMovementPose('kettlebell-rack-carry', 0.5);
    expect(carryStep.aR[1]).toBeLessThan(carryStart.aR[1]);
  });
});

describe('front pilot support contacts', () => {
  it.each(['right', 'left'] as const)(
    'keeps the %s support foot planted throughout both leg exercises',
    (side) => {
      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        const step = frontMovementPose('step-up', t, side);
        const split = frontMovementPose('rear-foot-split-squat', t, side);
        const selected = side === 'right' ? 'R' : 'L';
        const other = side === 'right' ? 'L' : 'R';
        expect(step[`t${selected}`][1]).toBe(146);
        expect(split[`t${selected}`][1]).toBe(177);
        expect(split[`t${other}`][1]).toBe(142);
        expect(step[`k${selected}`][0]).toBe(step[`a${selected}`][0]);
        expect(split[`k${selected}`][0]).toBe(split[`a${selected}`][0]);
      }
    },
  );

  it.each(['right', 'left'] as const)(
    'places one suitcase in the %s hand with an upright torso',
    (side) => {
      for (const phase of [0, 0.2, 0.5, 0.8, 1]) {
        const pose = frontMovementPose('suitcase-carry', phase, side);
        expect(pose.head[0]).toBe(pose.hip[0]);
        expect(pose.neck[0]).toBe(pose.hip[0]);
        expect(pose.eR[1]).toBe(pose.eL[1]);
        const markup = renderToStaticMarkup(
          <FigureFrame
            exerciseId="suitcase-carry"
            pose={pose}
            working={side}
            equipment="kettlebell"
            view="front"
            phase={phase}
          />,
        );
        expect(markup).toContain(
          side === 'right' ? 'cx="72" cy="120"' : 'cx="128" cy="120"',
        );
        expect((markup.match(/stroke-width="4"/g) ?? []).length).toBe(1);
      }
    },
  );
});
