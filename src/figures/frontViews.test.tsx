import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FigureFrame, movementPose, supportedFrontViews } from './Figure';
import { frontMovementPose } from './frontViews';

describe('authored frontal demonstrations', () => {
  it('supports only the three readable front-view exercises', () => {
    expect(supportedFrontViews).toEqual([
      'goblet-squat',
      'dumbbell-rdl',
      'kettlebell-rack-carry',
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
    expect(right).toContain('data-body-side="right" stroke="var(--blue)"');
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
    expect(left).toContain('data-body-side="left" stroke="var(--blue)"');
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
