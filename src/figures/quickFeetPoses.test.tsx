import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FigureFrame, movementPose, stillFramePhase } from './Figure';
import {
  alternateView,
  defaultViewFor,
  FRONT_ONLY,
  frontMovementPose,
  IN_OUT_MARKER_DX,
  SHUFFLE_LINE_X,
  supportedViewsFor,
} from './frontViews';
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
/** Foot sole level: ankle y 174 plus the toe's 3 px. */
const GROUNDED = 173;

describe.each([['fast-feet'], ['knee-drive']] as const)(
  '%s side figure',
  (id) => {
    const side = (t: number) => movementPose(id, t);

    it('is a side-view ballistic demonstration', () => {
      expect(figures[id].motion).toBe('ballistic');
      expect(supportedViewsFor(id)).toEqual(['side']);
      expect(defaultViewFor(id)).toBe('side');
      expect(alternateView(id)).toBeUndefined();
      expect(FRONT_ONLY).not.toContain(id);
    });

    it('keeps every segment length constant and every point inside 14..188', () => {
      constantLengths(side);
      inFrame(side);
    });

    it('never puts a foot below the floor and keeps a stance foot on it', () => {
      for (const t of ts) {
        const p = side(t);
        expect(p.aR[1]).toBeLessThanOrEqual(174 + 1e-9);
        expect(p.aL[1]).toBeLessThanOrEqual(174 + 1e-9);
        expect(Math.max(p.aR[1], p.aL[1])).toBeCloseTo(174, 6);
      }
    });

    it('has both feet down in the middle and lifts a different leg at each end', () => {
      const mid = side(0.5);
      expect(mid.aR[1]).toBeCloseTo(174, 6);
      expect(mid.aL[1]).toBeCloseTo(174, 6);
      expect(side(0).aR[1]).toBeLessThan(GROUNDED);
      expect(side(0).aL[1]).toBeCloseTo(174, 6);
      expect(side(1).aL[1]).toBeLessThan(GROUNDED);
      expect(side(1).aR[1]).toBeCloseTo(174, 6);
    });

    it('is the mirror image between the legs at t=0 and t=1', () => {
      const a = side(0),
        b = side(1);
      for (const [r, l] of [
        ['kR', 'kL'],
        ['aR', 'aL'],
        ['tR', 'tL'],
        ['eR', 'eL'],
        ['hR', 'hL'],
      ] as const) {
        expect(a[r][0]).toBeCloseTo(b[l][0], 6);
        expect(a[r][1]).toBeCloseTo(b[l][1], 6);
        expect(a[l][0]).toBeCloseTo(b[r][0], 6);
        expect(a[l][1]).toBeCloseTo(b[r][1], 6);
      }
    });

    it('swings the arms against the legs', () => {
      // Lifting the right leg sends the right hand back; the left hand goes forward.
      const p = side(0);
      expect(p.hR[0]).toBeLessThan(p.hL[0]);
      const q = side(1);
      expect(q.hL[0]).toBeLessThan(q.hR[0]);
    });

    it('shows different Start and Slut stills', () => {
      expect(stillFramePhase(id, 'side', 'Start')).toBe(0);
      expect(stillFramePhase(id, 'side', 'Slut')).toBe(1);
      expect(JSON.stringify(side(0))).not.toBe(JSON.stringify(side(1)));
    });
  },
);

describe('knee drive', () => {
  it('lifts the thigh towards horizontal with the shin below it', () => {
    const p = movementPose('knee-drive', 0);
    expect(p.kR[1] - p.hip[1]).toBeLessThan(10);
    expect(p.kR[0]).toBeGreaterThan(p.hip[0] + 20);
    expect(p.aR[1]).toBeGreaterThan(p.kR[1]);
  });
});

describe('in-and-out jump front figure', () => {
  const front = (t: number) => frontMovementPose('in-and-out-jump', t);

  it('is a front-only, ballistic demonstration', () => {
    expect(defaultViewFor('in-and-out-jump')).toBe('front');
    expect(supportedViewsFor('in-and-out-jump')).toEqual(['front']);
    expect(alternateView('in-and-out-jump')).toBeUndefined();
    expect(figures['in-and-out-jump'].motion).toBe('ballistic');
    expect(FRONT_ONLY).toContain('in-and-out-jump');
  });

  it('keeps every segment length constant and inside the frame', () => {
    const first = front(0);
    for (const t of ts) {
      const p = front(t);
      for (const [a, b] of SEGMENTS) {
        if (a === 'hip' && (b === 'kR' || b === 'kL')) continue;
        expect(distance(p[a], p[b])).toBeCloseTo(
          distance(first[a], first[b]),
          6,
        );
      }
      expect(distance(p.hip, p.kR)).toBeCloseTo(
        distance(first.hip, first.kR),
        6,
      );
      expect(distance(p.hip, p.kL)).toBeCloseTo(
        distance(first.hip, first.kL),
        6,
      );
      for (const [x, y] of Object.values(p)) {
        expect(x).toBeGreaterThanOrEqual(14);
        expect(x).toBeLessThanOrEqual(178);
        expect(y).toBeGreaterThanOrEqual(20);
        expect(y).toBeLessThanOrEqual(188);
      }
    }
  });

  it('starts with the feet together inside the markers and ends wide outside them', () => {
    const start = front(0),
      end = front(1);
    expect(start.aR[1]).toBeCloseTo(174, 6);
    expect(end.aR[1]).toBeCloseTo(174, 6);
    expect(start.aL[0] - start.aR[0]).toBeLessThan(2 * IN_OUT_MARKER_DX);
    expect(start.aL[0]).toBeLessThan(100 + IN_OUT_MARKER_DX);
    expect(end.aR[0]).toBeLessThan(100 - IN_OUT_MARKER_DX);
    expect(end.aL[0]).toBeGreaterThan(100 + IN_OUT_MARKER_DX);
  });

  it('lifts both feet by 10 sin(pi t)', () => {
    for (const t of ts) {
      const p = front(t);
      const lift = 10 * Math.sin(Math.PI * t);
      expect(174 - p.aR[1]).toBeCloseTo(lift, 6);
      expect(174 - p.aL[1]).toBeCloseTo(lift, 6);
    }
  });

  it('keeps the knees outward over the toes, never medial of the hip-ankle line', () => {
    for (const t of ts) {
      const p = front(t);
      const lineX = (a: Pt, k: Pt) =>
        p.hip[0] + ((a[0] - p.hip[0]) * (k[1] - p.hip[1])) / (a[1] - p.hip[1]);
      expect(p.kR[0]).toBeLessThanOrEqual(lineX(p.aR, p.kR) + 1e-9);
      expect(p.kL[0]).toBeGreaterThanOrEqual(lineX(p.aL, p.kL) - 1e-9);
    }
  });

  it('never has a grounded foot within 10 px of a marker', () => {
    for (const t of ts) {
      const p = front(t);
      for (const [a, toe] of [
        [p.aR, p.tR],
        [p.aL, p.tL],
      ] as const) {
        if (a[1] < GROUNDED - 0.5) continue;
        for (const foot of [a, toe])
          for (const m of [100 - IN_OUT_MARKER_DX, 100 + IN_OUT_MARKER_DX])
            expect(Math.abs(foot[0] - m), `t=${t}`).toBeGreaterThanOrEqual(10);
      }
    }
  });

  it('uses Start and Slut for reduced motion and draws two floor markers', () => {
    expect(stillFramePhase('in-and-out-jump', 'front', 'Start')).toBe(0);
    expect(stillFramePhase('in-and-out-jump', 'front', 'Slut')).toBe(1);
    expect(JSON.stringify(front(0))).not.toBe(JSON.stringify(front(1)));
    const markup = renderToStaticMarkup(
      <FigureFrame
        exerciseId="in-and-out-jump"
        pose={movementPose('in-and-out-jump', 0.5)}
        view="front"
        phase={0.5}
      />,
    );
    expect(markup.match(/data-support="floor-marker"/g)).toHaveLength(2);
  });

  it('keeps a valid side-view fallback pose', () => {
    constantLengths((t) => movementPose('in-and-out-jump', t));
    inFrame((t) => movementPose('in-and-out-jump', t));
  });
});

describe('lateral shuffle front figure', () => {
  const front = (t: number) => frontMovementPose('lateral-shuffle', t);
  const grounded = (a: Pt) => a[1] >= GROUNDED;

  it('is a front-only, ballistic demonstration', () => {
    expect(defaultViewFor('lateral-shuffle')).toBe('front');
    expect(supportedViewsFor('lateral-shuffle')).toEqual(['front']);
    expect(alternateView('lateral-shuffle')).toBeUndefined();
    expect(figures['lateral-shuffle'].motion).toBe('ballistic');
    expect(FRONT_ONLY).toContain('lateral-shuffle');
  });

  it('keeps every segment length constant and inside the frame', () => {
    const first = front(0);
    for (const t of ts) {
      const p = front(t);
      for (const [a, b] of SEGMENTS)
        expect(distance(p[a], p[b])).toBeCloseTo(
          distance(first[a], first[b]),
          6,
        );
      for (const [x, y] of Object.values(p)) {
        expect(x).toBeGreaterThanOrEqual(14);
        expect(x).toBeLessThanOrEqual(178);
        expect(y).toBeGreaterThanOrEqual(20);
        expect(y).toBeLessThanOrEqual(188);
      }
    }
  });

  it('always has a foot on the floor and the feet never cross', () => {
    for (const t of ts) {
      const p = front(t);
      expect(grounded(p.aR) || grounded(p.aL), `t=${t}`).toBe(true);
      expect(p.aL[0] - p.aR[0], `t=${t}`).toBeGreaterThan(0);
    }
  });

  it('keeps the ankles 32 to 60 px apart', () => {
    for (const t of ts) {
      const p = front(t);
      const gap = p.aL[0] - p.aR[0];
      expect(gap).toBeGreaterThanOrEqual(32 - 1e-9);
      expect(gap).toBeLessThanOrEqual(60 + 1e-9);
    }
  });

  it('puts the feet on either side of the line mid-way and steps over it with the leading foot', () => {
    const mid = front(0.5);
    expect(mid.aR[0]).toBeLessThan(SHUFFLE_LINE_X);
    expect(mid.aL[0]).toBeGreaterThan(SHUFFLE_LINE_X);
    expect(front(0).aL[0]).toBeLessThan(SHUFFLE_LINE_X);
    expect(front(0.25).aL[1]).toBeLessThan(GROUNDED);
    expect(front(0.75).aR[1]).toBeLessThan(GROUNDED);
    expect(front(1).hip[0]).toBeGreaterThan(front(0).hip[0]);
  });

  it('never has a grounded foot within 4 px of the line', () => {
    for (const t of ts) {
      const p = front(t);
      for (const [a, toe] of [
        [p.aR, p.tR],
        [p.aL, p.tL],
      ] as const) {
        if (!grounded(a)) continue;
        for (const foot of [a, toe])
          expect(Math.abs(foot[0] - SHUFFLE_LINE_X), `t=${t}`).toBeGreaterThan(
            4,
          );
      }
    }
  });

  it('uses Start and Slut for reduced motion and draws the shuffle line', () => {
    expect(stillFramePhase('lateral-shuffle', 'front', 'Start')).toBe(0);
    expect(stillFramePhase('lateral-shuffle', 'front', 'Slut')).toBe(1);
    expect(JSON.stringify(front(0))).not.toBe(JSON.stringify(front(1)));
    const markup = renderToStaticMarkup(
      <FigureFrame
        exerciseId="lateral-shuffle"
        pose={movementPose('lateral-shuffle', 0.5)}
        view="front"
        phase={0.5}
      />,
    );
    expect(markup).toContain('data-contact-plane="shuffle-line"');
  });

  it('keeps a valid side-view fallback pose', () => {
    constantLengths((t) => movementPose('lateral-shuffle', t));
    inFrame((t) => movementPose('lateral-shuffle', t));
  });
});
