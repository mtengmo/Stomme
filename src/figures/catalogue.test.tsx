import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { exerciseMetadata } from '../content/exerciseMetadata';
import { exerciseList } from '../content/exercises';
import { loadPresentation } from '../content/loadPresentation';
import { FigureFrame, movementPose } from './Figure';
import { figures } from './poses';

describe('catalogue equipment and contacts', () => {
  it('curls around a fixed knee without shrinking the shin or turning the toes upward', () => {
    const start = movementPose('hamstring-curl', 0);
    const distance = (a: readonly number[], b: readonly number[]) =>
      Math.hypot((a[0] ?? 0) - (b[0] ?? 0), (a[1] ?? 0) - (b[1] ?? 0));
    for (const t of [0, 0.125, 0.25, 0.5, 0.75, 1]) {
      const pose = movementPose('hamstring-curl', t);
      expect(pose.kR).toEqual(start.kR);
      expect(pose.hip).toEqual(start.hip);
      expect(pose.aL).toEqual(start.aL);
      expect(pose.hR).toEqual(start.hR);
      expect(pose.hL).toEqual(start.hL);
      expect(distance(pose.kR, pose.aR)).toBeCloseTo(
        distance(start.kR, start.aR),
        8,
      );
      expect(distance(pose.aR, pose.tR)).toBeCloseTo(
        distance(start.aR, start.tR),
        8,
      );
    }
    const end = movementPose('hamstring-curl', 1);
    expect(end.aR[0]).toBeLessThan(start.aR[0]);
    expect(end.aR[1]).toBeLessThan(start.aR[1]);
    expect(end.tR[1]).toBeGreaterThan(end.aR[1]);
    expect(end).toEqual(figures['hamstring-curl'].end);
  });
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
