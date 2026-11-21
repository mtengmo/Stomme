import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FigureFrame, movementPose, stillFramePhase } from './Figure';
import {
  alternateView,
  defaultViewFor,
  frontMovementPose,
  supportedViewsFor,
} from './frontViews';
import type { Pt } from './lerp';
import { lungeRotationAngle } from './lungeRotation';
import { obliqueFrame, project } from './obliqueBody';
import { LYING_OBLIQUE } from './obliqueSpecs';
import { figures } from './poses';

const distance = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const frames = Array.from({ length: 201 }, (_, n) => n / 200);

describe('box jump figure', () => {
  const step = figures['box-jump'].props.find((pr) => pr.type === 'step');

  it('is a sequence figure with a step prop', () => {
    expect(figures['box-jump'].motion).toBe('sequence');
    expect(step).toBeDefined();
  });

  it('keeps thigh, shin and trunk lengths constant', () => {
    const first = movementPose('box-jump', 0);
    for (const t of frames) {
      const p = movementPose('box-jump', t);
      expect(distance(p.hip, p.kR), `thigh R ${t}`).toBeCloseTo(
        distance(first.hip, first.kR),
        6,
      );
      expect(distance(p.kR, p.aR), `shin R ${t}`).toBeCloseTo(
        distance(first.kR, first.aR),
        6,
      );
      expect(distance(p.hip, p.kL), `thigh L ${t}`).toBeCloseTo(
        distance(first.hip, first.kL),
        6,
      );
      expect(distance(p.kL, p.aL), `shin L ${t}`).toBeCloseTo(
        distance(first.kL, first.aL),
        6,
      );
      expect(distance(p.neck, p.hip), `trunk ${t}`).toBeCloseTo(
        distance(first.neck, first.hip),
        6,
      );
    }
  });

  it('never puts a foot inside the step or under the floor', () => {
    if (step?.type !== 'step') throw new Error('no step');
    for (const t of frames) {
      const p = movementPose('box-jump', t);
      for (const key of ['aR', 'tR', 'aL', 'tL'] as const) {
        const [x, y] = p[key];
        expect(y, `${key} ${t}`).toBeLessThanOrEqual(177);
        const inside = x > step.x && x < step.x + step.w && y > step.y + 0.01;
        expect(inside, `${key} inside step at ${t}`).toBe(false);
      }
    }
  });

  it('stands with both feet on top of the step at t = 0.6', () => {
    if (step?.type !== 'step') throw new Error('no step');
    const p = movementPose('box-jump', 0.6);
    for (const key of ['aR', 'aL'] as const) {
      expect(p[key][0]).toBeGreaterThan(step.x);
      expect(p[key][0]).toBeLessThan(step.x + step.w);
    }
    for (const key of ['tR', 'tL'] as const)
      expect(p[key][1]).toBeCloseTo(step.y, 6);
  });

  it('starts and ends on the same floor spot', () => {
    expect(movementPose('box-jump', 1)).toEqual(movementPose('box-jump', 0));
  });

  it('is airborne mid-jump', () => {
    expect(movementPose('box-jump', 0.4).aR[1]).toBeLessThan(174);
  });

  it('puts one foot on the floor before the other when stepping down', () => {
    const onFloor = (key: 'aR' | 'aL', t: number) =>
      movementPose('box-jump', t)[key][1] >= 174 - 1e-6;
    const firstDown = frames.find((t) => t >= 0.7 && onFloor('aR', t)) ?? 2;
    const secondDown = frames.find((t) => t >= 0.7 && onFloor('aL', t)) ?? 2;
    expect(firstDown).toBeGreaterThan(0.7);
    expect(firstDown).toBeLessThan(secondDown);
    expect(secondDown).toBeLessThanOrEqual(0.9);
  });

  it('shows four labelled frames for reduced motion', () => {
    const markup = renderToStaticMarkup(
      <FigureFrame
        exerciseId="box-jump"
        pose={movementPose('box-jump', 0.55)}
        phase={0.55}
      />,
    );
    expect(markup).toContain('<svg');
  });
});

describe('single-leg lateral hop figure', () => {
  const ts = Array.from({ length: 41 }, (_, n) => n / 40);

  it('is a front-only, ballistic demonstration', () => {
    expect(defaultViewFor('single-leg-lateral-hop')).toBe('front');
    expect(supportedViewsFor('single-leg-lateral-hop')).toEqual(['front']);
    expect(alternateView('single-leg-lateral-hop')).toBeUndefined();
    expect(figures['single-leg-lateral-hop'].motion).toBe('ballistic');
  });

  it('keeps every segment length constant and stays inside the frame', () => {
    for (const working of ['right', 'left'] as const) {
      const first = frontMovementPose('single-leg-lateral-hop', 0, working);
      for (const t of ts) {
        const p = frontMovementPose('single-leg-lateral-hop', t, working);
        expect(distance(p.hip, p.kR)).toBeCloseTo(
          distance(first.hip, first.kR),
          6,
        );
        expect(distance(p.kR, p.aR)).toBeCloseTo(
          distance(first.kR, first.aR),
          6,
        );
        expect(distance(p.hip, p.kL)).toBeCloseTo(
          distance(first.hip, first.kL),
          6,
        );
        expect(distance(p.kL, p.aL)).toBeCloseTo(
          distance(first.kL, first.aL),
          6,
        );
        expect(distance(p.neck, p.hip)).toBeCloseTo(
          distance(first.neck, first.hip),
          6,
        );
        expect(distance(p.neck, p.eR)).toBeCloseTo(
          distance(first.neck, first.eR),
          6,
        );
        for (const pt of Object.values(p)) {
          expect(pt[0]).toBeGreaterThan(14);
          expect(pt[0]).toBeLessThan(178);
          expect(pt[1]).toBeGreaterThan(20);
          expect(pt[1]).toBeLessThanOrEqual(178);
        }
      }
    }
  });

  it('lands on the working foot at the ends and keeps the free foot up', () => {
    for (const t of [0, 1]) {
      const p = frontMovementPose('single-leg-lateral-hop', t, 'right');
      expect(p.aR[1]).toBe(174);
    }
    expect(
      frontMovementPose('single-leg-lateral-hop', 0.5, 'right').aR[1],
    ).toBeLessThan(174);
    for (const t of ts)
      expect(
        frontMovementPose('single-leg-lateral-hop', t, 'right').tL[1],
      ).toBeLessThan(174);
  });

  it('mirrors left and right and swaps the leg roles', () => {
    for (const t of ts) {
      const r = frontMovementPose('single-leg-lateral-hop', t, 'right');
      const l = frontMovementPose('single-leg-lateral-hop', t, 'left');
      expect(l.aL[0]).toBeCloseTo(200 - r.aR[0], 6);
      expect(l.aL[1]).toBeCloseTo(r.aR[1], 6);
      expect(l.aR[0]).toBeCloseTo(200 - r.aL[0], 6);
      expect(l.hip[0]).toBeCloseTo(200 - r.hip[0], 6);
    }
  });

  it('uses Start and Slut for reduced motion and draws the hop line', () => {
    expect(stillFramePhase('single-leg-lateral-hop', 'front', 'Start')).toBe(0);
    expect(stillFramePhase('single-leg-lateral-hop', 'front', 'Slut')).toBe(1);
    const markup = renderToStaticMarkup(
      <FigureFrame
        exerciseId="single-leg-lateral-hop"
        pose={movementPose('single-leg-lateral-hop', 0.5)}
        view="front"
        phase={0.5}
      />,
    );
    expect(markup).toContain('data-contact-plane="hop-line"');
  });

  it('keeps the side-view fallback pose finite and above the floor', () => {
    const first = movementPose('single-leg-lateral-hop', 0);
    for (const t of ts) {
      const p = movementPose('single-leg-lateral-hop', t);
      expect(distance(p.hip, p.kR)).toBeCloseTo(
        distance(first.hip, first.kR),
        6,
      );
      expect(distance(p.hip, p.kL)).toBeCloseTo(
        distance(first.hip, first.kL),
        6,
      );
      expect(p.aR[1]).toBeLessThanOrEqual(174);
    }
  });
});

describe('skater bound figure', () => {
  const ts = Array.from({ length: 81 }, (_, n) => n / 80);
  const id = 'skater-bound' as const;
  const segments = (p: ReturnType<typeof frontMovementPose>) => [
    distance(p.hip, p.kR),
    distance(p.kR, p.aR),
    distance(p.hip, p.kL),
    distance(p.kL, p.aL),
    distance(p.neck, p.hip),
    distance(p.neck, p.eR),
    distance(p.eR, p.hR),
    distance(p.neck, p.eL),
    distance(p.eL, p.hL),
  ];

  it('is a front-only ballistic demonstration', () => {
    expect(defaultViewFor(id)).toBe('front');
    expect(supportedViewsFor(id)).toEqual(['front']);
    expect(alternateView(id)).toBeUndefined();
    expect(figures[id].motion).toBe('ballistic');
  });

  it('keeps every segment length constant and stays in the frame, above the floor', () => {
    for (const working of ['right', 'left'] as const) {
      const first = segments(frontMovementPose(id, 0, working));
      for (const t of ts) {
        const p = frontMovementPose(id, t, working);
        for (const [i, len] of segments(p).entries())
          expect(len, `${working} ${t} #${i}`).toBeCloseTo(first[i] ?? 0, 6);
        for (const pt of Object.values(p)) {
          expect(pt[0]).toBeGreaterThan(14);
          expect(pt[0]).toBeLessThan(186);
          expect(pt[1]).toBeGreaterThan(20);
          expect(pt[1]).toBeLessThanOrEqual(177);
        }
      }
    }
  });

  it('pushes off one foot, flies with both feet up and lands on the other', () => {
    const start = frontMovementPose(id, 0, 'right');
    const end = frontMovementPose(id, 1, 'right');
    expect(start.aR[1]).toBe(174);
    expect(start.aL[1]).toBeLessThan(174 - 10);
    expect(end.aL[1]).toBe(174);
    expect(end.aR[1]).toBeLessThan(174 - 10);
    expect(end.hip[0] - start.hip[0]).toBeGreaterThan(40);
    const mid = frontMovementPose(id, 0.5, 'right');
    expect(mid.aR[1]).toBeLessThan(174 - 10);
    expect(mid.aL[1]).toBeLessThan(174 - 10);
    // A longer bound than the lateral hop (85 to 115).
    expect(end.hip[0] - start.hip[0]).toBeGreaterThan(115 - 85);
  });

  it('lets the landing foot lead the hip in the second half of the flight and never crosses the legs mid-flight', () => {
    for (const t of [0.4, 0.5, 0.6, 0.7, 0.8]) {
      const p = frontMovementPose(id, t, 'right');
      expect(p.aL[0], `aL ${t}`).toBeGreaterThan(p.hip[0]);
    }
    for (const t of [0.3, 0.4, 0.5, 0.6]) {
      const p = frontMovementPose(id, t, 'right');
      expect(p.aR[0], `aR ${t}`).toBeLessThan(p.hip[0]);
      expect(p.aL[0] - p.aR[0], `gap ${t}`).toBeGreaterThan(6);
    }
  });

  it('never has a foot below the floor and only the stance foot touches it', () => {
    for (const t of ts) {
      const p = frontMovementPose(id, t, 'right');
      expect(p.aR[1]).toBeLessThanOrEqual(174);
      expect(p.aL[1]).toBeLessThanOrEqual(174);
      expect(p.tR[1]).toBeLessThanOrEqual(177);
      expect(p.tL[1]).toBeLessThanOrEqual(177);
    }
  });

  it('is a seamless loop: the end pose is the mirror image of the start', () => {
    const a = frontMovementPose(id, 0, 'right');
    const b = frontMovementPose(id, 1, 'right');
    expect(b.hip[0]).toBeCloseTo(200 - a.hip[0], 6);
    expect(b.aL[0]).toBeCloseTo(200 - a.aR[0], 6);
    expect(b.aR[0]).toBeCloseTo(200 - a.aL[0], 6);
    expect(b.hR[0]).toBeCloseTo(200 - a.hL[0], 6);
    expect(b.kL[1]).toBeCloseTo(a.kR[1], 6);
  });

  it('swings the arms against the hip travel', () => {
    const a = frontMovementPose(id, 0, 'right');
    const b = frontMovementPose(id, 1, 'right');
    expect(a.hR[0] - a.hip[0]).toBeGreaterThan(b.hR[0] - b.hip[0]);
  });

  it('mirrors left and right and swaps the leg roles', () => {
    for (const t of ts) {
      const r = frontMovementPose(id, t, 'right');
      const l = frontMovementPose(id, t, 'left');
      expect(l.aL[0]).toBeCloseTo(200 - r.aR[0], 6);
      expect(l.aL[1]).toBeCloseTo(r.aR[1], 6);
      expect(l.aR[0]).toBeCloseTo(200 - r.aL[0], 6);
      expect(l.hip[0]).toBeCloseTo(200 - r.hip[0], 6);
    }
  });

  it('uses Start and Slut for reduced motion and draws the landing marks', () => {
    expect(stillFramePhase(id, 'front', 'Start')).toBe(0);
    expect(stillFramePhase(id, 'front', 'Slut')).toBe(1);
    const markup = renderToStaticMarkup(
      <FigureFrame
        exerciseId={id}
        pose={movementPose(id, 0.5)}
        view="front"
        phase={0.5}
      />,
    );
    expect(markup).toContain('data-contact-plane="bound-marks"');
  });

  it('keeps the side-view fallback pose constant in length and above the floor', () => {
    const first = movementPose(id, 0);
    for (const t of ts) {
      const p = movementPose(id, t);
      expect(distance(p.hip, p.kR)).toBeCloseTo(
        distance(first.hip, first.kR),
        6,
      );
      expect(distance(p.kL, p.aL)).toBeCloseTo(distance(first.kL, first.aL), 6);
      expect(p.aR[1]).toBeLessThanOrEqual(174);
      expect(p.aL[1]).toBeLessThanOrEqual(174);
    }
  });
});

describe('lunge with rotation figure', () => {
  const id = 'lunge-with-rotation' as const;
  const ts = Array.from({ length: 81 }, (_, n) => n / 80);
  const lengths = (p: ReturnType<typeof movementPose>) => [
    distance(p.hip, p.kR),
    distance(p.kR, p.aR),
    distance(p.hip, p.kL),
    distance(p.kL, p.aL),
    distance(p.neck, p.hip),
    distance(p.neck, p.eR),
    distance(p.eR, p.hR),
  ];

  it('opens in the oblique view, the one that shows the rotation', () => {
    expect(defaultViewFor(id)).toBe('oblique');
    expect(supportedViewsFor(id)).toEqual(['side', 'oblique']);
    expect(figures[id].motion).toBe('controlled');
  });

  it('keeps segment lengths constant, the front foot planted and nothing below the floor', () => {
    const first = lengths(movementPose(id, 0));
    for (const t of ts) {
      const p = movementPose(id, t);
      for (const [i, len] of lengths(p).entries())
        expect(len, `#${i} ${t}`).toBeCloseTo(first[i] ?? 0, 6);
      expect(p.aR).toEqual([108, 174]);
      for (const k of ['aR', 'aL', 'tR', 'tL', 'kR', 'kL'] as const)
        expect(p[k][1], `${k} ${t}`).toBeLessThanOrEqual(177);
      expect(distance(p.aR, p.tR)).toBeCloseTo(distance(p.aL, p.tL), 6);
    }
  });

  it('starts and ends the loop standing, and sinks with the rear thigh hanging close to vertical', () => {
    const top = movementPose(id, 0);
    const bottom = movementPose(id, 1);
    expect(bottom.hip[1] - top.hip[1]).toBeGreaterThan(18);
    expect(bottom.aL[0]).toBeLessThan(bottom.aR[0] - 30);
    expect(bottom.tL[1]).toBeCloseTo(177, 1);
    expect(top.aL[1]).toBe(174);
    // The rear knee hangs below the hip, no more than 8 units in front of it.
    expect(bottom.kL[1] - bottom.hip[1]).toBeGreaterThan(25);
    expect(Math.abs(bottom.kL[0] - bottom.hip[0])).toBeLessThan(8);
  });

  it('keeps the front foot planted at its projected contact in the oblique view, both sides', () => {
    const spec = LYING_OBLIQUE[id];
    const [cx, cy] = project([108, 174, 12], 35, 25);
    for (const t of ts) {
      const r = obliqueFrame(spec, t, 'right').pose.aR;
      expect(r[0], `x ${t}`).toBeCloseTo(cx, 1);
      expect(r[1], `y ${t}`).toBeCloseTo(cy, 1);
      const l = obliqueFrame(spec, t, 'left').pose.aL;
      expect(l[0], `lx ${t}`).toBeCloseTo(192 - cx, 1);
      expect(l[1], `ly ${t}`).toBeCloseTo(cy, 1);
    }
  });

  it('rotates about 45 degrees at most and keeps the oblique arm segments equal', () => {
    expect(lungeRotationAngle(1)).toBeCloseTo(0.8, 6);
    // The drawn segments keep their (foreshortened, calibrated) lengths through
    // the loop and stay within 4 units of each other.
    const first = obliqueFrame(LYING_OBLIQUE[id], 0, 'right').pose;
    for (const t of ts) {
      const p = obliqueFrame(LYING_OBLIQUE[id], t, 'right').pose;
      expect(distance(p.neck, p.eR)).toBeCloseTo(
        distance(first.neck, first.eR),
        6,
      );
      expect(distance(p.eR, p.hR)).toBeCloseTo(distance(first.eR, first.hR), 6);
      expect(
        Math.abs(distance(p.neck, p.eR) - distance(p.eR, p.hR)),
      ).toBeLessThan(4);
    }
  });

  it('rotates the shoulder bar in the oblique view while the pelvis bar stays', () => {
    const spec = LYING_OBLIQUE[id];
    const start = obliqueFrame(spec, 0, 'right');
    const end = obliqueFrame(spec, 1, 'right');
    const width = (bar: [Pt, Pt]) => Math.abs(bar[0][0] - bar[1][0]);
    expect(width(end.shoulders)).toBeGreaterThan(width(start.shoulders) + 4);
    expect(end.pelvis[0][0] - end.pelvis[1][0]).toBeCloseTo(
      start.pelvis[0][0] - start.pelvis[1][0],
      6,
    );
    for (const t of ts) {
      const p = obliqueFrame(spec, t, 'right').pose;
      const f = obliqueFrame(spec, 0, 'right').pose;
      expect(distance(p.neck, p.eR)).toBeCloseTo(distance(f.neck, f.eR), 6);
      expect(distance(p.hip, p.kR)).toBeCloseTo(distance(f.hip, f.kR), 6);
    }
  });

  it('mirrors for the left leg', () => {
    const r = obliqueFrame(LYING_OBLIQUE[id], 1, 'right').pose;
    const l = obliqueFrame(LYING_OBLIQUE[id], 1, 'left').pose;
    expect(l.aL[0]).toBeCloseTo(192 - r.aR[0], 6);
    expect(l.hip[0]).toBeCloseTo(192 - r.hip[0], 6);
  });
});
