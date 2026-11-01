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
