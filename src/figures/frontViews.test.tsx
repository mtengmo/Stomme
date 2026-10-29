import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  FigureFrame,
  movementPose,
  stillFramePhase,
  supportedFrontViews,
} from './Figure';
import {
  alternateView,
  defaultViewFor,
  frontMovementPose,
  obliqueMovementPose,
  supportedObliqueViews,
} from './frontViews';

describe('authored frontal demonstrations', () => {
  it('supports the authored front-view exercises and complementary oblique views', () => {
    expect(supportedFrontViews).toEqual([
      'goblet-squat',
      'dumbbell-rdl',
      'kettlebell-rack-carry',
      'step-up',
      'rear-foot-split-squat',
      'suitcase-carry',
      'reverse-lunge',
      'forward-lunge',
      'half-squat',
      'single-leg-chair-squat',
      'side-lunge',
      'farmer-carry',
    ]);
    expect(supportedObliqueViews).toEqual([
      'split-squat',
      'bench-side-plank-leg-lift',
    ]);
    expect(alternateView('split-squat')).toBe('oblique');
    expect(alternateView('bench-side-plank-leg-lift')).toBe('oblique');
    expect(alternateView('reverse-lunge')).toBe('front');
    expect(alternateView('push-up')).toBeUndefined();
    expect(defaultViewFor('side-lunge')).toBe('front');
    expect(defaultViewFor('reverse-lunge')).toBe('side');
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
    ['reverse-lunge', 'dumbbell', 2],
    ['reverse-lunge', 'kettlebell', 1],
    ['forward-lunge', 'dumbbell', 2],
    ['forward-lunge', 'kettlebell', 1],
    ['half-squat', null, 0],
    ['single-leg-chair-squat', null, 0],
    ['farmer-carry', 'dumbbell', 2],
    ['farmer-carry', 'kettlebell', 2],
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

  it('renders different reduced-motion start and end foot positions for the farmer carry', () => {
    const startPhase = stillFramePhase('farmer-carry', 'front', 'Start');
    const endPhase = stillFramePhase('farmer-carry', 'front', 'Slut');
    expect([startPhase, endPhase]).toEqual([0.25, 0.75]);
    const renderFrame = (phase: number) =>
      renderToStaticMarkup(
        <FigureFrame
          exerciseId="farmer-carry"
          pose={movementPose('farmer-carry', phase)}
          working={null}
          equipment="dumbbell"
          view="front"
          phase={phase}
        />,
      );
    const start = renderFrame(startPhase);
    const end = renderFrame(endPhase);
    expect(start).not.toBe(end);
    const rightLeg = (frame: string) =>
      frame.match(/<g data-body-side="right"[^>]*>([\s\S]*?)<\/g/)?.[1];
    expect(rightLeg(start)).not.toBe(rightLeg(end));
  });

  it.each(['right', 'left'] as const)(
    'keeps the %s single-leg chair squat foot fixed under the knee and returns a distinct end pose',
    (side) => {
      const start = frontMovementPose('single-leg-chair-squat', 0, side);
      const end = frontMovementPose('single-leg-chair-squat', 1, side);
      const planted = side === 'right' ? 'R' : 'L';
      expect(start[`a${planted}`]).toEqual(end[`a${planted}`]);
      const kneeX = end[`k${planted}`][0];
      const ankleX = end[`a${planted}`][0];
      const toeX = end[`t${planted}`][0];
      expect(kneeX).toBeGreaterThanOrEqual(Math.min(ankleX, toeX));
      expect(kneeX).toBeLessThanOrEqual(Math.max(ankleX, toeX));
      expect(end.hip[1]).toBeGreaterThan(start.hip[1]);
    },
  );

  it.each(['reverse-lunge', 'forward-lunge'] as const)(
    '%s keeps the selected front foot grounded as the lunge deepens',
    (id) => {
      for (const side of ['right', 'left'] as const) {
        const start = frontMovementPose(id, 0, side);
        const end = frontMovementPose(id, 1, side);
        const planted = side === 'right' ? 'R' : 'L';
        const stationary =
          id === 'reverse-lunge' ? planted : side === 'right' ? 'L' : 'R';
        const stepping =
          id === 'reverse-lunge' ? (side === 'right' ? 'L' : 'R') : planted;
        expect(end[`a${stationary}`]).toEqual(start[`a${stationary}`]);
        expect(end[`t${stepping}`][1]).toBe(id === 'forward-lunge' ? 177 : 164);
        expect(
          Math.hypot(
            end[`k${stepping}`][0] - end[`a${stepping}`][0],
            end[`k${stepping}`][1] - end[`a${stepping}`][1],
          ),
        ).toBeGreaterThan(0);
        expect(end.hip[1]).toBeGreaterThan(start.hip[1]);
      }
    },
  );

  it('keeps both half-squat heels planted and both hands on the same support', () => {
    const first = frontMovementPose('half-squat', 0);
    for (let i = 0; i <= 20; i++) {
      const pose = frontMovementPose('half-squat', i / 20);
      expect(pose.aR).toEqual(first.aR);
      expect(pose.aL).toEqual(first.aL);
      expect(pose.tR).toEqual(first.tR);
      expect(pose.tL).toEqual(first.tL);
      expect(pose.hR).toEqual([72, 92]);
      expect(pose.hL).toEqual([128, 92]);
    }
  });

  it('keeps split-squat depth distinct and E42 support contacts explicit in oblique views', () => {
    const splitStart = obliqueMovementPose('split-squat', 0, 'right');
    const splitEnd = obliqueMovementPose('split-squat', 1, 'right');
    expect(splitEnd.hip[1]).toBeGreaterThan(splitStart.hip[1]);
    expect(splitEnd.aR).toEqual(splitStart.aR);

    const splitMarkup = renderToStaticMarkup(
      <FigureFrame
        exerciseId="split-squat"
        pose={movementPose('split-squat', 0.5)}
        working="right"
        view="oblique"
        phase={0.5}
      />,
    );
    expect(splitMarkup).toContain('data-contact-plane="rear-foot"');

    const markup = renderToStaticMarkup(
      <FigureFrame
        exerciseId="bench-side-plank-leg-lift"
        pose={movementPose('bench-side-plank-leg-lift', 0.5)}
        working="right"
        view="oblique"
        phase={0.5}
      />,
    );
    expect(markup).toContain('data-view="oblique"');
    expect(markup).toContain('data-support="bench"');
    expect(markup).toContain('data-body-side="right" stroke="var(--accent)"');
    const leftMarkup = renderToStaticMarkup(
      <FigureFrame
        exerciseId="bench-side-plank-leg-lift"
        pose={movementPose('bench-side-plank-leg-lift', 0.5)}
        working="left"
        view="oblique"
        phase={0.5}
      />,
    );
    expect(leftMarkup).toContain(
      'data-body-side="left" stroke="var(--accent)"',
    );
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
