import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FigureFrame, FRAMING, movementPose } from './Figure';
import { alternateView, defaultViewFor, supportedViewsFor } from './frontViews';
import type { Pt } from './lerp';
import { figures, type Pose } from './poses';

const distance = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const ts = Array.from({ length: 101 }, (_, n) => n / 100);
type Pair = readonly [keyof Pose, keyof Pose];
const SEGMENTS: readonly Pair[] = [
  ['head', 'neck'],
  ['neck', 'hip'],
  ['neck', 'eR'],
  ['eR', 'hR'],
  ['neck', 'eL'],
  ['eL', 'hL'],
  ['hip', 'kR'],
  ['kR', 'aR'],
  ['aR', 'tR'],
  ['hip', 'kL'],
  ['kL', 'aL'],
  ['aL', 'tL'],
];
function constantLengths(make: (t: number) => Pose) {
  const first = make(0);
  for (const t of ts) {
    const p = make(t);
    for (const [a, b] of SEGMENTS)
      expect(distance(p[a], p[b]), `${a}-${b} at ${t}`).toBeCloseTo(
        distance(first[a], first[b]),
        6,
      );
  }
}
function inFrame(make: (t: number) => Pose) {
  for (const t of ts)
    for (const [x, y] of Object.values(make(t))) {
      expect(x).toBeGreaterThanOrEqual(14);
      expect(x).toBeLessThanOrEqual(188);
      expect(y).toBeGreaterThanOrEqual(14);
      expect(y).toBeLessThanOrEqual(188);
    }
}

describe('isometric lunge hold figure', () => {
  const id = 'isometric-lunge-hold';
  const at = (t: number) => movementPose(id, t);

  it('is a side-view hold with its own framing', () => {
    expect(figures[id].motion).toBe('hold');
    expect(supportedViewsFor(id)).toEqual(['side']);
    expect(defaultViewFor(id)).toBe('side');
    expect(alternateView(id)).toBeUndefined();
    expect(FRAMING[id]).toBeDefined();
  });

  it('keeps constant segment lengths and stays in frame', () => {
    constantLengths(at);
    inFrame(at);
  });

  it('keeps both feet planted for the whole lowering, none below the floor', () => {
    const first = at(0);
    for (const t of ts) {
      const p = at(t);
      expect(p.aR).toEqual(first.aR);
      expect(p.aL).toEqual(first.aL);
      expect(p.tR).toEqual(first.tR);
      expect(p.tL).toEqual(first.tL);
      for (const key of ['aR', 'aL', 'tR', 'tL'] as const)
        expect(p[key][1]).toBeLessThanOrEqual(177.5);
    }
  });

  it('ends with the front thigh parallel, the back knee just above the floor, hands on the hips', () => {
    const p = at(1);
    expect(Math.abs(p.kR[1] - p.hip[1])).toBeLessThan(1);
    expect(p.kR[0]).toBeGreaterThan(p.hip[0] + 30);
    expect(Math.abs(p.aR[0] - p.kR[0])).toBeLessThan(5);
    expect(p.kL[1]).toBeLessThan(171);
    expect(p.kL[1]).toBeGreaterThan(160);
    for (const hand of [p.hR, p.hL])
      expect(distance(hand, p.hip)).toBeLessThan(8);
    expect(Math.abs(p.neck[0] - p.hip[0])).toBeLessThan(2);
  });

  it('shows a higher Start than the held bottom', () => {
    expect(at(0).hip[1]).toBeLessThan(at(1).hip[1] - 8);
  });
});

describe('plate pogos figure', () => {
  const id = 'plate-pogos';
  const at = (t: number) => movementPose(id, t);

  it('is a ballistic side-view figure with the plate as a floor prop', () => {
    expect(figures[id].motion).toBe('ballistic');
    expect(supportedViewsFor(id)).toEqual(['side']);
    expect(figures[id].props).toEqual([
      expect.objectContaining({ type: 'plate' }),
    ]);
    expect(FRAMING[id]).toBeDefined();
  });

  it('keeps constant segment lengths and stays in frame', () => {
    constantLengths(at);
    inFrame(at);
  });

  it('lands on the forefoot with a lifted heel and never goes below the floor', () => {
    for (const t of [0, 1]) {
      const p = at(t);
      expect(p.tR[1]).toBeCloseTo(177, 6);
      expect(p.tL[1]).toBeCloseTo(177, 6);
      expect(p.aR[1]).toBeLessThan(p.tR[1] - 5);
    }
    for (const t of ts) {
      const p = at(t);
      for (const key of ['aR', 'aL', 'tR', 'tL'] as const)
        expect(p[key][1]).toBeLessThanOrEqual(177 + 1e-9);
    }
  });

  it('leaves the floor in the middle with almost straight legs', () => {
    const p = at(0.5);
    expect(p.tR[1]).toBeLessThan(170);
    expect(distance(p.hip, p.aR)).toBeGreaterThan(62);
  });

  it('never overlaps the plate', () => {
    for (const t of ts) {
      const p = at(t);
      for (const key of ['aR', 'aL', 'tR', 'tL'] as const)
        expect(p[key][0]).toBeLessThan(132);
    }
  });

  it('differs between Start and Slut', () => {
    expect(JSON.stringify(at(0))).not.toBe(JSON.stringify(at(1)));
  });

  it('renders the figure', () => {
    const html = renderToStaticMarkup(
      <FigureFrame exerciseId={id} pose={at(0)} />,
    );
    expect(html).toContain('<svg');
  });
});
