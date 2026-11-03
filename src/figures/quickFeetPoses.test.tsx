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

    it('swaps the roles of the legs between t=0 and t=1', () => {
      const a = side(0),
        b = side(1);
      // Foot heights mirror exactly (the knees depend on the foot's own x); the arms swap exactly.
      for (const [r, l] of [
        ['aR', 'aL'],
        ['tR', 'tL'],
      ] as const) {
        expect(a[r][1]).toBeCloseTo(b[l][1], 6);
        expect(a[l][1]).toBeCloseTo(b[r][1], 6);
      }
      for (const [r, l] of [
        ['eR', 'eL'],
        ['hR', 'hL'],
      ] as const) {
        expect(a[r][0]).toBeCloseTo(b[l][0], 6);
        expect(a[r][1]).toBeCloseTo(b[l][1], 6);
        expect(a[l][0]).toBeCloseTo(b[r][0], 6);
        expect(a[l][1]).toBeCloseTo(b[r][1], 6);
      }
      // The lifted foot sits the same distance in front of its own stance foot.
      expect(a.aR[0] - 103).toBeCloseTo(b.aL[0] - 97, 6);
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

  it('starts with both feet before the line and ends with both feet past it', () => {
    const start = front(0),
      end = front(1);
    for (const x of [start.aR[0], start.aL[0], start.tR[0], start.tL[0]])
      expect(x).toBeLessThan(SHUFFLE_LINE_X - 4);
    for (const x of [end.aR[0], end.aL[0], end.tR[0], end.tL[0]])
      expect(x).toBeGreaterThan(SHUFFLE_LINE_X + 4);
  });

  it('puts the feet on either side of the line mid-way', () => {
    const mid = front(0.5);
    expect(mid.aR[0]).toBeLessThan(SHUFFLE_LINE_X);
    expect(mid.aL[0]).toBeGreaterThan(SHUFFLE_LINE_X);
  });

  it('steps both feet over the line, each while it is in the air, the leading foot first', () => {
    const crossing = (foot: 'aR' | 'aL') => {
      const at = ts.find((t) => front(t)[foot][0] > SHUFFLE_LINE_X) as number;
      // The foot is clearly up when it passes the line.
      expect(174 - front(at)[foot][1]).toBeGreaterThan(3);
      return at;
    };
    const leading = crossing('aL'),
      trailing = crossing('aR');
    expect(leading).toBeLessThan(trailing);
    expect(front(0.1).aL[1]).toBeLessThan(GROUNDED);
    expect(front(0.4).aR[1]).toBeLessThan(GROUNDED);
  });

  it('moves one foot at a time, two steps each', () => {
    let stepsL = 0,
      stepsR = 0;
    let wasL = false,
      wasR = false;
    for (let i = 1; i < ts.length; i++) {
      const a = front(ts[i - 1] as number),
        b = front(ts[i] as number);
      const movedL = Math.abs(b.aL[0] - a.aL[0]) > 1e-9;
      const movedR = Math.abs(b.aR[0] - a.aR[0]) > 1e-9;
      expect(movedL && movedR).toBe(false);
      if (movedL && !wasL) stepsL++;
      if (movedR && !wasR) stepsR++;
      wasL = movedL;
      wasR = movedR;
    }
    expect(stepsL).toBe(2);
    expect(stepsR).toBe(2);
  });

  it('travels the hip about 56 px and keeps the knees slightly bent', () => {
    expect(front(1).hip[0] - front(0).hip[0]).toBeGreaterThanOrEqual(50);
    for (const t of ts) {
      const p = front(t);
      // The stance leg is shorter than the straight 70 px of thigh and shin.
      const stance = p.aR[1] >= GROUNDED ? p.aR : p.aL;
      expect(distance(p.hip, stance)).toBeLessThan(68);
      expect(distance(p.hip, stance)).toBeGreaterThan(55);
    }
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
