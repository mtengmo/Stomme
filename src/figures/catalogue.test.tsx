import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { exerciseMetadata } from '../content/exerciseMetadata';
import { exerciseList } from '../content/exercises';
import { loadPresentation } from '../content/loadPresentation';
import { FigureFrame, movementPose } from './Figure';
import { figures } from './poses';

describe('catalogue equipment and contacts', () => {
  it.each(exerciseList)(
    '$id renders both working sides and every supported implement count',
    (exercise) => {
      for (const variant of exerciseMetadata[exercise.id].variants) {
        const presentation = loadPresentation(
          exercise,
          variant.defaultLoadIndex,
          variant.id,
        );
        const count = variant.equipment
          .filter((e) => e.type === 'dumbbell' || e.type === 'kettlebell')
          .reduce((sum, e) => sum + e.count, 0);
        for (const working of ['right', 'left'] as const) {
          for (const t of [0, 0.5, 1]) {
            const markup = renderToStaticMarkup(
              <FigureFrame
                exerciseId={exercise.id}
                pose={movementPose(exercise.id, t)}
                equipment={presentation.equipment}
                working={exercise.perSide ? working : null}
              />,
            );
            expect((markup.match(/stroke-width="4"/g) ?? []).length).toBe(
              count,
            );
            if (exercise.perSide && working === 'left')
              expect(markup).toContain('translate(192 0) scale(-1 1)');
            if (exercise.id === 'band-leg-press')
              expect(markup).toContain('data-equipment="band"');
          }
        }
      }
    },
  );
  it('keeps support and floor contact while the intended joints move', () => {
    expect(
      figures['glute-bridge'].props.every((prop) => prop.type !== 'step'),
    ).toBe(true);
    expect(figures['glute-bridge'].start.aR).toEqual(
      figures['glute-bridge'].end.aR,
    );
    expect(figures['glute-bridge'].end.hip[1]).toBeLessThan(
      figures['glute-bridge'].start.hip[1],
    );
    expect(figures['floor-press'].start.eR[1]).toBe(174);
    expect(figures['supported-row'].start.hL).toEqual(
      figures['supported-row'].end.hL,
    );
    expect(figures['side-lying-hip-adduction'].start.aL).toEqual(
      figures['side-lying-hip-adduction'].end.aL,
    );
    expect(figures['side-lying-hip-adduction'].end.aR[1]).toBeLessThan(
      figures['side-lying-hip-adduction'].start.aR[1],
    );
    expect(movementPose('reverse-lunge', 0.5)).toEqual(
      figures['reverse-lunge'].middle,
    );
    expect(figures['reverse-lunge'].start.aR).toEqual(
      figures['reverse-lunge'].end.aR,
    );
    expect(figures['reverse-lunge'].middle?.aR).toEqual(
      figures['reverse-lunge'].end.aR,
    );
    expect(movementPose('kettlebell-swing', 0.5)).toEqual(
      figures['kettlebell-swing'].middle,
    );
    expect(figures['kettlebell-swing'].motion).toBe('ballistic');
  });
});
