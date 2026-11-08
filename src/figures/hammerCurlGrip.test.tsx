import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FigureFrame, forearmAxisAngle, movementPose } from './Figure';

describe('hammer curl dumbbell follows the forearm (E20)', () => {
  it('plumb forearm keeps the old vertical dumbbell', () => {
    expect(
      forearmAxisAngle(
        { eR: [0, 0], hR: [0, 10], eL: [0, 0], hL: [0, 10] },
        [0, 10],
      ),
    ).toBeCloseTo(90);
  });

  it('turns the dumbbell with the forearm through the curl, both hands', () => {
    let maxTurn = 0;
    for (const t of [0, 0.25, 0.375, 0.5, 0.625, 0.75, 1]) {
      const p = movementPose('hammer-curl', t);
      for (const hand of ['R', 'L'] as const) {
        const e = p[`e${hand}`];
        const h = p[`h${hand}`];
        const angle = forearmAxisAngle(p, h);
        // The long axis (rotated from the horizontal bar) is parallel to e -> h.
        const rad = (angle * Math.PI) / 180;
        const axis: readonly [number, number] = [Math.cos(rad), Math.sin(rad)];
        const fore: readonly [number, number] = [h[0] - e[0], h[1] - e[1]];
        const len = Math.hypot(...fore);
        expect(
          Math.abs(axis[0] * fore[1] - axis[1] * fore[0]) / len,
        ).toBeLessThan(1e-6);
        maxTurn = Math.max(maxTurn, Math.abs(angle - 90));
        const markup = renderToStaticMarkup(
          <FigureFrame
            exerciseId="hammer-curl"
            pose={p}
            working={null}
            equipment="dumbbell"
          />,
        );
        expect(markup).toContain(`rotate(${angle} ${h[0]} ${h[1]})`);
      }
    }
    // At the top the forearm is far from plumb, so the dumbbell clearly turned.
    expect(maxTurn).toBeGreaterThan(40);
  });
});
