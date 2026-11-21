import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AB_WHEEL } from './abWheel';
import { FigureFrame, movementPose, stillFramePhase } from './Figure';
import type { Pt } from './lerp';
import { figures } from './poses';

const id = 'kneeling-ab-wheel-rollout';
const distance = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const frames = Array.from({ length: 201 }, (_, n) => n / 200);

describe('kneeling ab wheel rollout figure', () => {
  it('is a controlled side-view figure with distinct Start and Slut stills', () => {
    expect(figures[id].motion).toBe('controlled');
    const start = figures[id].start;
    const end = figures[id].end;
    expect(distance(start.hR, end.hR)).toBeGreaterThan(40);
    expect(end.neck[1]).toBeGreaterThan(start.neck[1] + 15);
    expect(stillFramePhase(id, 'side', 'Start')).toBe(0);
    expect(stillFramePhase(id, 'side', 'Slut')).toBe(1);
  });

  it('keeps the knees and toes on the floor and the wheel on the floor line', () => {
    const start = movementPose(id, 0);
    for (const t of frames) {
      const p = movementPose(id, t);
      expect(p.kR).toEqual(start.kR);
      expect(p.kR[1]).toBe(174);
      expect(p.tR[1]).toBe(174);
      expect(p.hR[1] + AB_WHEEL.radius).toBe(178);
      for (const key of ['head', 'neck', 'hip', 'hR', 'aR', 'tR'] as const)
        expect(p[key][1]).toBeLessThanOrEqual(178);
    }
  });

  it('keeps thigh, shin, trunk and straight arms at constant length', () => {
    const first = movementPose(id, 0);
    for (const t of frames) {
      const p = movementPose(id, t);
      expect(distance(p.hip, p.kR)).toBeCloseTo(
        distance(first.hip, first.kR),
        6,
      );
      expect(distance(p.kR, p.aR)).toBeCloseTo(distance(first.kR, first.aR), 6);
      expect(distance(p.neck, p.hip)).toBeCloseTo(46, 6);
      expect(distance(p.neck, p.eR) + distance(p.eR, p.hR)).toBeCloseTo(64, 6);
      expect(distance(p.neck, p.hR)).toBeCloseTo(64, 6);
    }
  });

  it('keeps the hips above the knee-to-shoulder line (no sag) and reaches a long body', () => {
    for (const t of frames) {
      const p = movementPose(id, t);
      const [kx, ky] = p.kR;
      const [nx, ny] = p.neck;
      // y of the knee-shoulder line at the hip's x (smaller y is higher on screen).
      const lineY = ky + ((p.hip[0] - kx) * (ny - ky)) / (nx - kx);
      expect(p.hip[1]).toBeLessThanOrEqual(lineY + 0.5);
    }
    const end = movementPose(id, 1);
    expect(end.hip[1]).toBeLessThan(end.kR[1] - 15);
    expect(end.kR[0] - end.neck[0]).toBeGreaterThan(60);
  });

  it('draws the wheel at the hands, equipment-coloured, inside the frame', () => {
    for (const t of [0, 0.5, 1]) {
      const markup = renderToStaticMarkup(
        createElement(FigureFrame, {
          exerciseId: id,
          pose: movementPose(id, t),
        }),
      );
      expect(markup).toContain('data-equipment="ab-wheel"');
    }
    const end = movementPose(id, 1);
    expect(end.hR[0] - AB_WHEEL.radius).toBeGreaterThan(4);
    expect(end.tR[0]).toBeLessThan(188);
  });
});
