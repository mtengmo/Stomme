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
  STEP_DOWN_FRONT_GRIP_Y,
  STEP_DOWN_FRONT_RAIL_X,
  supportedObliqueViews,
} from './frontViews';
import { figures } from './poses';

describe('authored frontal demonstrations', () => {
  it('rotates seated feet with still knees and ankles, a cushion and foot band', () => {
    const start = frontMovementPose('seated-tibial-rotation', 0);
    const end = frontMovementPose('seated-tibial-rotation', 1);
    expect(end.kR).toEqual(start.kR);
    expect(end.kL).toEqual(start.kL);
    expect(end.aR).toEqual(start.aR);
    expect(end.aL).toEqual(start.aL);
    expect(start.tR[0]).toBeGreaterThan(start.aR[0]);
    expect(end.tR[0]).toBeLessThan(end.aR[0]);
    expect(start.tL[0]).toBeLessThan(start.aL[0]);
    expect(end.tL[0]).toBeGreaterThan(end.aL[0]);
    const markup = renderToStaticMarkup(
      <FigureFrame
        exerciseId="seated-tibial-rotation"
        pose={movementPose('seated-tibial-rotation', 0.5)}
        view="front"
        phase={0.5}
      />,
    );
    expect(markup).toContain('data-support="chair"');
    expect(markup).toContain('data-support="knee-cushion"');
    expect(markup).toContain('data-equipment="band"');
  });
  it('supports the authored front-view exercises and complementary oblique views', () => {
    expect(supportedFrontViews).toEqual([
      'seated-tibial-rotation',
      'single-leg-lateral-hop',
      'in-and-out-jump',
      'lateral-shuffle',
      'goblet-squat',
      'dumbbell-rdl',
      'kettlebell-rack-carry',
      'step-up',
      'step-down',
      'rear-foot-split-squat',
      'suitcase-carry',
      'reverse-lunge',
      'forward-lunge',
      'half-squat',
      'single-leg-chair-squat',
      'side-lunge',
      'farmer-carry',
      'woodchop',
      'kettlebell-goblet-squat',
    ]);
    expect(supportedObliqueViews).toEqual([
      'split-squat',
      'bench-side-plank-leg-lift',
      'russian-twist',
    ]);
    expect(alternateView('split-squat')).toBe('oblique');
    expect(alternateView('bench-side-plank-leg-lift')).toBe('oblique');
    expect(alternateView('reverse-lunge')).toBe('front');
    expect(alternateView('push-up')).toBeUndefined();
    expect(defaultViewFor('side-lunge')).toBe('front');
    expect(defaultViewFor('reverse-lunge')).toBe('side');
    expect(defaultViewFor('russian-twist')).toBe('oblique');
    expect(defaultViewFor('seated-tibial-rotation')).toBe('front');
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

describe('step-down front view', () => {
  it.each(['right', 'left'] as const)(
    'has vertical constant shins, thighs within 36 and a free foot at most 6 units below the step (%s)',
    (side) => {
      for (let i = 0; i <= 40; i++) {
        const pose = frontMovementPose('step-down', i / 40, side);
        for (const leg of ['R', 'L'] as const) {
          const knee = pose[`k${leg}`];
          const ankle = pose[`a${leg}`];
          expect(knee[0]).toBeCloseTo(ankle[0], 8);
          expect(ankle[1] - knee[1]).toBeCloseTo(33, 8);
          expect(
            Math.hypot(pose.hip[0] - knee[0], pose.hip[1] - knee[1]),
          ).toBeLessThanOrEqual(36);
          // Step top is y = 164 and the floor is y = 178.
          expect(pose[`t${leg}`][1]).toBeLessThanOrEqual(172);
        }
        const selected = side === 'right' ? 'R' : 'L';
        expect(pose[`a${selected}`][1]).toBe(161);
      }
    },
  );
});

describe('step-down front view railing', () => {
  it.each([
    ['right', 'L', STEP_DOWN_FRONT_RAIL_X],
    ['left', 'R', 200 - STEP_DOWN_FRONT_RAIL_X],
  ] as const)(
    'keeps the %s-side support hand (%s) on the railing with constant arm lengths',
    (side, hand, railX) => {
      const first = frontMovementPose('step-down', 0, side);
      const upper = Math.hypot(
        first.neck[0] - first[`e${hand}`][0],
        first.neck[1] - first[`e${hand}`][1],
      );
      for (let i = 0; i <= 40; i++) {
        const pose = frontMovementPose('step-down', i / 40, side);
        expect(pose[`h${hand}`][0]).toBeCloseTo(railX, 6);
        expect(pose[`h${hand}`][1]).toBeCloseTo(STEP_DOWN_FRONT_GRIP_Y, 6);
        expect(
          Math.hypot(
            pose.neck[0] - pose[`e${hand}`][0],
            pose.neck[1] - pose[`e${hand}`][1],
          ),
        ).toBeCloseTo(upper, 6);
        expect(
          Math.hypot(
            pose[`e${hand}`][0] - pose[`h${hand}`][0],
            pose[`e${hand}`][1] - pose[`h${hand}`][1],
          ),
        ).toBeCloseTo(Math.hypot(6, 22), 6);
      }
    },
  );
  it.each([
    ['right', 0],
    ['right', 1],
    ['left', 0],
    ['left', 1],
  ] as const)(
    'draws the railing in the %s front view at phase %s',
    (side, phase) => {
      const markup = renderToStaticMarkup(
        <FigureFrame
          exerciseId="step-down"
          pose={figures['step-down'].start}
          working={side}
          view="front"
          phase={phase}
        />,
      );
      const railX =
        side === 'right'
          ? STEP_DOWN_FRONT_RAIL_X
          : 200 - STEP_DOWN_FRONT_RAIL_X;
      expect(markup).toContain(`data-support="rail"`);
      expect(markup).toContain(`d="M${railX} 60V164"`);
    },
  );
  it('leaves the other front views without a railing', () => {
    const markup = renderToStaticMarkup(
      <FigureFrame
        exerciseId="step-up"
        pose={figures['step-up'].start}
        view="front"
      />,
    );
    expect(markup).not.toContain('data-support="rail"');
  });
});

describe('step-up front view proportions', () => {
  it.each(['right', 'left'] as const)(
    'keeps both shins vertical at a fixed length and never stretches a thigh (%s)',
    (side) => {
      for (let i = 0; i <= 40; i++) {
        const pose = frontMovementPose('step-up', i / 40, side);
        for (const leg of ['R', 'L'] as const) {
          const knee = pose[`k${leg}`];
          const ankle = pose[`a${leg}`];
          expect(knee[0]).toBeCloseTo(ankle[0], 8);
          expect(ankle[1] - knee[1]).toBeCloseTo(33, 8);
          const thigh = Math.hypot(
            pose.hip[0] - knee[0],
            pose.hip[1] - knee[1],
          );
          expect(thigh).toBeLessThanOrEqual(36);
        }
      }
    },
  );
  it('draws a stair-height step in the front view of both step exercises', () => {
    const rect = (id: 'step-up' | 'step-down') =>
      renderToStaticMarkup(
        <FigureFrame exerciseId={id} pose={figures[id].end} view="front" />,
      ).match(
        /data-support="step"[^>]*><rect[^>]*y="(\d+)"[^>]*height="(\d+)"/,
      );
    expect(rect('step-up')?.slice(1)).toEqual(['159', '18']);
    expect(rect('step-down')?.slice(1)).toEqual(['164', '14']);
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
        expect(step[`t${selected}`][1]).toBe(159);
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

describe('kettlebell goblet squat front view', () => {
  it('opens in front view with both hands on the horns at chest height', () => {
    expect(defaultViewFor('kettlebell-goblet-squat')).toBe('front');
    for (let i = 0; i <= 20; i++) {
      const p = frontMovementPose('kettlebell-goblet-squat', i / 20);
      expect(p.hR[1]).toBeCloseTo(p.hL[1], 5);
      expect(p.hL[0] - p.hR[0]).toBeCloseTo(12, 5);
      expect(p.hR[1] - p.neck[1]).toBeCloseTo(13, 5);
      // Elbows tucked: below the hands and inside the shoulder-wide frame.
      expect(p.eR[1]).toBeGreaterThan(p.hR[1] - 1);
      expect(p.eL[1]).toBeGreaterThan(p.hL[1] - 1);
      expect(100 - p.eR[0]).toBeLessThan(14);
    }
  });
  it.each([0, 0.5, 1])(
    'draws the grip markers on the handle at phase %s',
    (phase) => {
      const markup = renderToStaticMarkup(
        <FigureFrame
          exerciseId="kettlebell-goblet-squat"
          pose={movementPose('kettlebell-goblet-squat', phase)}
          working={null}
          equipment="kettlebell"
          view="front"
          phase={phase}
        />,
      );
      expect(markup).toContain('data-grip="goblet-horns"');
      expect(markup).toContain('data-equipment="kettlebell"');
    },
  );
});

describe('woodchop front view', () => {
  it('shows the diagonal from the start hip to above the opposite shoulder, mirrored per side', () => {
    expect(defaultViewFor('woodchop')).toBe('front');
    const dist = (a: readonly number[], b: readonly number[]) =>
      Math.hypot((a[0] ?? 0) - (b[0] ?? 0), (a[1] ?? 0) - (b[1] ?? 0));
    const start = frontMovementPose('woodchop', 0, 'right');
    const end = frontMovementPose('woodchop', 1, 'right');
    // Starts low by the right hip (viewer's left), finishes above the left shoulder.
    expect(start.hR[0]).toBeLessThan(start.hip[0]);
    expect(start.hR[1]).toBeGreaterThan(start.hip[1] - 8);
    expect(end.hR[0]).toBeGreaterThan(end.neck[0] + 8);
    expect(end.hR[1]).toBeLessThan(end.head[1] - 15);
    // The pivot foot's heel lifts and swings across; the far foot stays put.
    expect(end.aR[1]).toBeLessThan(start.aR[1] - 2);
    expect(end.tR[0]).toBeGreaterThan(start.tR[0] + 10);
    expect(end.tR[1]).toBeCloseTo(start.tR[1], 5);
    expect(end.aL).toEqual(start.aL);
    expect(end.hip[0]).toBeGreaterThan(start.hip[0] + 5);
    for (let i = 0; i <= 20; i++) {
      const p = frontMovementPose('woodchop', i / 20, 'right');
      expect(p.hR).toEqual(p.hL);
      expect(dist(p.neck, p.eR) + dist(p.eR, p.hR)).toBeGreaterThan(
        dist(p.neck, p.hR) - 0.01,
      );
      expect(dist(p.neck, p.eR)).toBeCloseTo(24, 0);
      expect(dist(p.eR, p.hR)).toBeCloseTo(24, 0);
      expect(dist(p.hip, p.kR)).toBeCloseTo(35.9, 0);
      expect(dist(p.kR, p.aR)).toBeCloseTo(34, 0);
      expect(dist(p.aR, p.tR)).toBeCloseTo(Math.hypot(9, 3), 1);
      const mirrored = frontMovementPose('woodchop', i / 20, 'left');
      expect(mirrored.hR[0]).toBeCloseTo(200 - p.hL[0], 5);
      expect(mirrored.aL[0]).toBeCloseTo(200 - p.aR[0], 5);
    }
  });
});
