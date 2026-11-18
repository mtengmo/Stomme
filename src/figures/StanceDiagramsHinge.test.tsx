import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { exercises } from '../content/exercises';
import { hasPlacementDiagram } from './PlacementDiagrams';
import { hasStanceDiagram, StanceDiagram } from './StanceDiagrams';
import {
  DEADLIFT_PLAN,
  SUPPORTED_ROW_PLAN,
  TWO_HAND_SWING_PLAN,
} from './StanceDiagramsHinge';

const MID = 80;
const IDS = [
  'kettlebell-deadlift',
  'kettlebell-swing',
  'supported-row',
] as const;
const html = (id: (typeof IDS)[number]) =>
  renderToStaticMarkup(<StanceDiagram exerciseId={id} />);
const count = (markup: string, attr: string) =>
  markup.match(new RegExp(` ${attr}=`, 'g'))?.length ?? 0;
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

describe('hinge placement diagrams (E13, E15, E26)', () => {
  it.each(IDS)('%s is registered as a placement diagram', (id) => {
    expect(exercises[id]).toBeDefined();
    expect(hasStanceDiagram(id)).toBe(true);
    expect(hasPlacementDiagram(id)).toBe(true);
    expect(html(id)).toContain(`data-testid="placement-diagram-${id}"`);
  });

  it.each(IDS)(
    '%s keeps the shoulder and pelvis lines level and square',
    (id) => {
      const markup = html(id);
      expect(count(markup, 'data-shoulders')).toBe(1);
      expect(count(markup, 'data-pelvis')).toBe(1);
      expect(count(markup, 'data-level')).toBe(2);
      expect(count(markup, 'data-foot')).toBe(2);
    },
  );

  it('kettlebell deadlift: feet shoulder-wide, the bell between them, both hands on one handle', () => {
    const markup = html('kettlebell-deadlift');
    const feet = centres(markup, 'data-foot');
    expect(feet).toHaveLength(2);
    expect((feet[1] ?? 0) - (feet[0] ?? 0)).toBe(2 * DEADLIFT_PLAN.footHalf);
    expect(markup).toContain(`cx="${MID}" cy="${DEADLIFT_PLAN.weightY}"`);
    expect(count(markup, 'data-weight')).toBe(1);
    expect(count(markup, 'data-hand')).toBe(2);
    expect(count(markup, 'data-arm')).toBe(2);
    expect(markup).toContain('axelbrett');
    expect(markup).toContain('samma handtag');
  });

  it('kettlebell swing: feet wider than hip width, the bell passes between the legs', () => {
    const markup = html('kettlebell-swing');
    const feet = centres(markup, 'data-foot');
    expect((feet[1] ?? 0) - (feet[0] ?? 0)).toBe(
      2 * TWO_HAND_SWING_PLAN.footHalf,
    );
    // Wider than the hip width of 24, narrower than the 2 x 30 limit of a squat stance.
    expect(2 * TWO_HAND_SWING_PLAN.footHalf).toBeGreaterThan(24);
    expect(count(markup, 'data-weight')).toBe(1);
    expect(count(markup, 'data-arrow')).toBe(2);
    expect(count(markup, 'data-hand')).toBe(2);
    expect(markup).toContain('mellan benen');
  });

  it('supported row: support hand on the step, row hand under the shoulder, no rotation', () => {
    const markup = html('supported-row');
    const p = SUPPORTED_ROW_PLAN;
    expect(count(markup, 'data-support')).toBe(1);
    expect(count(markup, 'data-weight')).toBe(1);
    expect(count(markup, 'data-hand')).toBe(2);
    // The support hand sits on the step, which lies in front (above) of the shoulders.
    expect(p.supportHandY).toBeGreaterThan(p.stepY);
    expect(p.supportHandY).toBeLessThanOrEqual(p.stepY + p.stepH + 24);
    expect(p.rowStartY).toBeLessThan(p.rowEndY);
    expect(markup).toContain('inte vrids');
  });
});
