import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { exercises } from '../content/exercises';
import {
  CALF,
  FOOT_HALF,
  HALO,
  haloPoint,
  hasStanceDiagram,
  LUNGE,
  PELVIS_HALF,
  SHOULDER_HALF,
  STANCE_DIAGRAM_IDS,
  StanceDiagram,
  TRICEPS,
  WALL_PUSH_UP,
} from './StanceDiagrams';

const MID = 80;
type Id = (typeof STANCE_DIAGRAM_IDS)[number];
const html = (id: Id) =>
  renderToStaticMarkup(<StanceDiagram exerciseId={id} />);
const count = (markup: string, attr: string) =>
  markup.match(new RegExp(` ${attr}=`, 'g'))?.length ?? 0;
const nums = (markup: string, attr: string) =>
  [...markup.matchAll(new RegExp(` ${attr}="(-?[\\d.]+)"`, 'g'))].map((m) =>
    Number(m[1]),
  );
const pathNums = (markup: string) =>
  [...markup.matchAll(/ d="([^"]+)"/g)].flatMap((m) =>
    [...(m[1] ?? '').matchAll(/-?\d+(?:\.\d+)?/g)].map((n) => Number(n[0])),
  );
/** Centre x of each rect that carries the given data attribute. */
const centres = (markup: string, attr: string) =>
  [
    ...markup.matchAll(
      new RegExp(
        ` ${attr}="[^"]*" x="(-?[\\d.]+)" y="[\\d.]+" width="([\\d.]+)"`,
        'g',
      ),
    ),
  ].map((m) => Number(m[1]) + Number(m[2]) / 2);
const bar = (markup: string, attr: string) => {
  const m = markup.match(
    new RegExp(`${attr}="" d="M([\\d.]+) ([\\d.]+)L([\\d.]+) ([\\d.]+)"`),
  );
  return (m ?? []).slice(1).map(Number) as [number, number, number, number];
};

describe('standing placement diagrams', () => {
  it('cover the twelve exercises, all in the catalogue', () => {
    expect(STANCE_DIAGRAM_IDS).toHaveLength(12);
    for (const id of STANCE_DIAGRAM_IDS) {
      expect(exercises[id]).toBeDefined();
      expect(hasStanceDiagram(id)).toBe(true);
    }
    expect(hasStanceDiagram('plank')).toBe(false);
    expect(renderToStaticMarkup(<StanceDiagram exerciseId="plank" />)).toBe('');
  });

  it.each(STANCE_DIAGRAM_IDS)(
    '%s: stays inside the view with a name and caption',
    (id) => {
      const markup = html(id);
      expect(markup).toContain(`data-testid="placement-diagram-${id}"`);
      expect(markup).toContain('viewBox="0 0 160 160"');
      expect(markup).toContain('role="img"');
      expect(markup).toContain('<figcaption');
      for (const attr of ['cx', 'cy', 'x', 'y'])
        for (const n of nums(markup, attr)) {
          expect(n).toBeGreaterThanOrEqual(0);
          expect(n).toBeLessThanOrEqual(160);
        }
      for (const n of pathNums(markup)) {
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThanOrEqual(160);
      }
    },
  );

  it('puts every pair of feet and weights symmetrically about the midline', () => {
    for (const id of STANCE_DIAGRAM_IDS) {
      if (id === 'jumping-lunge' || id === 'walking-lunge') continue;
      const markup = html(id);
      for (const attr of ['data-foot', 'data-weight']) {
        const c = centres(markup, attr);
        if (c.length === 2)
          expect((c[0] ?? 0) + (c[1] ?? 0)).toBeCloseTo(2 * MID, 6);
      }
    }
  });

  describe('shoulder-wide squat family (E62, E72, E73, E74)', () => {
    it.each([
      'squat-jump',
      'squat-curl',
      'thruster',
      'single-arm-thruster',
    ] as const)(
      '%s: feet as wide as the shoulders, one knee over each foot',
      (id) => {
        const markup = html(id);
        expect(FOOT_HALF.shoulderWide).toBe(SHOULDER_HALF);
        expect(count(markup, 'data-foot')).toBe(2);
        expect(count(markup, 'data-knee')).toBe(2);
        expect(count(markup, 'data-knee-line')).toBe(2);
        const knees = nums(markup, 'cx');
        expect(knees).toContain(MID - FOOT_HALF.shoulderWide);
        expect(knees).toContain(MID + FOOT_HALF.shoulderWide);
        expect(markup).toContain('axelbrett');
      },
    );

    it('squat-curl and thruster carry two dumbbells, the single-arm thruster one', () => {
      expect(count(html('squat-curl'), 'data-weight')).toBe(2);
      expect(count(html('thruster'), 'data-weight')).toBe(2);
      expect(count(html('single-arm-thruster'), 'data-weight')).toBe(1);
      expect(count(html('single-arm-thruster'), 'data-midline')).toBe(1);
    });
  });

  describe('bent-over-row (E75) and kettlebell swing (E83)', () => {
    it('row: hip-wide feet, centred parallel lines, a dumbbell per shoulder', () => {
      const markup = html('bent-over-row');
      expect(FOOT_HALF.hipWide).toBeLessThan(SHOULDER_HALF);
      expect(count(markup, 'data-foot')).toBe(2);
      expect(count(markup, 'data-weight')).toBe(2);
      expect(markup).toContain('höftbrett');
      for (const attr of ['data-shoulders', 'data-pelvis']) {
        const [x1, y1, x2, y2] = bar(markup, attr);
        expect(y1).toBe(y2);
        expect(x1 + x2).toBe(2 * MID);
      }
    });

    it('swing: feet wider than the hips, narrower than the shoulders, bars parallel, one bell', () => {
      const markup = html('one-arm-kettlebell-swing');
      expect(FOOT_HALF.widerThanHip).toBeGreaterThan(PELVIS_HALF);
      expect(FOOT_HALF.widerThanHip).toBeLessThan(SHOULDER_HALF);
      for (const attr of ['data-shoulders', 'data-pelvis']) {
        const [x1, y1, x2, y2] = bar(markup, attr);
        expect(y1).toBe(y2);
        expect(x1 + x2).toBe(2 * MID);
      }
      expect(count(markup, 'data-weight')).toBe(1);
      expect(markup).toContain('inte vrids');
    });
  });

  describe('lunges (E63, E81)', () => {
    it.each(['jumping-lunge', 'walking-lunge'] as const)(
      '%s: two parallel hip-wide tracks, knee over the front foot',
      (id) => {
        const markup = html(id);
        expect(count(markup, 'data-track')).toBe(2);
        expect(count(markup, 'data-foot')).toBe(2);
        expect(LUNGE.trackHalf).toBeGreaterThanOrEqual(PELVIS_HALF);
        expect(LUNGE.trackHalf).toBeLessThan(SHOULDER_HALF);
        expect(LUNGE.frontFootY).toBeLessThan(LUNGE.kneeY);
        expect(LUNGE.kneeY).toBeLessThan(LUNGE.pelvisY);
        expect(LUNGE.rearFootY).toBeGreaterThan(LUNGE.pelvisY);
        expect(count(markup, 'data-knee')).toBe(1);
        expect(nums(markup, 'cx')).toContain(MID - LUNGE.trackHalf);
        expect(markup).toContain('parallella höftbreda linjer');
      },
    );

    it('walking lunge carries two dumbbells and steps forward; jumping lunge swaps legs', () => {
      expect(count(html('walking-lunge'), 'data-weight')).toBe(2);
      expect(count(html('walking-lunge'), 'data-arrow')).toBe(1);
      expect(count(html('jumping-lunge'), 'data-arrow')).toBe(2);
    });
  });

  describe('wall push-up (E66)', () => {
    it('hands on the wall a little wider than the shoulders, feet hip-wide', () => {
      const w = WALL_PUSH_UP;
      expect(w.handHalf).toBeGreaterThan(w.shoulderHalf);
      expect(w.handHalf - w.shoulderHalf).toBeLessThan(12);
      expect(w.footHalf).toBeLessThan(w.shoulderHalf);
      expect(w.handY).toBeGreaterThan(w.wallY);
      const markup = html('wall-push-up');
      expect(count(markup, 'data-arm')).toBe(2);
      expect(count(markup, 'data-hand')).toBe(2);
      expect(count(markup, 'data-support')).toBe(1);
      expect(markup).toContain('något bredare än axlarna');
    });
  });

  describe('calf raise (E67)', () => {
    it('parallel hip-wide feet straight ahead, an axis line through each', () => {
      const markup = html('calf-raise');
      expect(CALF.half).toBe(FOOT_HALF.hipWide);
      expect(count(markup, 'data-foot-axis')).toBe(2);
      expect(count(markup, 'data-ball')).toBe(2);
      expect(markup).not.toContain('rotate(');
    });
  });

  describe('overhead triceps (E78)', () => {
    it('elbows stay near the head, the flared ghost is well outside it', () => {
      const t = TRICEPS;
      expect(t.elbowHalf - t.headR).toBeLessThan(14);
      expect(t.flaredElbowHalf).toBeGreaterThan(2 * t.elbowHalf);
      const markup = html('overhead-triceps-extension');
      expect(count(markup, 'data-arm')).toBe(4);
      expect(markup).toContain('data-arm="flared"');
      expect(count(markup, 'data-weight')).toBe(1);
    });
  });

  describe('kettlebell halo (E84)', () => {
    it('keeps the weight at a constant distance clear of the head, all the way round', () => {
      for (let deg = 0; deg < 360; deg += 15) {
        const [x, y] = haloPoint(deg);
        expect(Math.hypot(x - HALO.head[0], y - HALO.head[1])).toBeCloseTo(
          HALO.pathR,
          6,
        );
      }
      expect(HALO.pathR - HALO.weightR - HALO.headR).toBeGreaterThanOrEqual(8);
    });

    it('shows the full circle, four stops and four direction arrows', () => {
      const markup = html('kettlebell-halo');
      expect(count(markup, 'data-halo-path')).toBe(1);
      expect(count(markup, 'data-weight')).toBe(4);
      expect(count(markup, 'data-arrow')).toBe(4);
      expect(markup).toContain('ett helt varv');
      expect(markup).toContain('byt håll');
    });
  });
});
