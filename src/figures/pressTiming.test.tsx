import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { exerciseMetadata } from '../content/exerciseMetadata';
import { demonstrationTiming, FigureFrame, movementPose } from './Figure';
import { cycleProgress, TWEEN_MS } from './lerp';
import { pressGripAngle } from './props';

describe('supported press grip and demonstration timing', () => {
  it.each(['kettlebell-press', 'kettlebell-floor-press'] as const)(
    '%s keeps one bell aligned with the moving forearm',
    (id) => {
      for (let i = 0; i <= 40; i++) {
        const p = movementPose(id, i / 40);
        const angle = pressGripAngle(p.eR, p.hR);
        // Local bell centre (0,12) rotates towards the elbow with a lateral offset.
        const rad = (angle * Math.PI) / 180;
        const center: readonly [number, number] = [
          p.hR[0] - 12 * Math.sin(rad),
          p.hR[1] + 12 * Math.cos(rad),
        ];
        expect(
          Math.hypot(center[0] - p.hR[0], center[1] - p.hR[1]),
        ).toBeCloseTo(12);
        expect(center[1] + 9).toBeLessThan(178);
        expect(
          Math.hypot(center[0] - p.head[0], center[1] - p.head[1]),
        ).toBeGreaterThan(18);
        for (const working of ['right', 'left'] as const) {
          const markup = renderToStaticMarkup(
            <FigureFrame
              exerciseId={id}
              pose={p}
              working={working}
              equipment="kettlebell"
            />,
          );
          expect(markup.match(/data-equipment="kettlebell"/g)).toHaveLength(1);
          expect(markup).toContain('data-grip="press"');
          expect(markup).toContain(`rotate(${angle} `);
        }
      }
    },
  );

  it('holds and relaxes for the same explicit durations as the instructions', () => {
    for (const id of [
      'half-squat',
      'hamstring-curl',
      'seated-knee-extension',
      'straight-leg-raise',
      'prone-leg-raise',
      'side-lying-hip-abduction',
      'side-lying-hip-adduction',
      'band-leg-press',
      'single-leg-floor-bridge',
    ] as const) {
      const timing = demonstrationTiming(id);
      expect(timing.endHoldMs).toBe(
        Number(exerciseMetadata[id].holdSeconds) * 1000,
      );
      const endAt = timing.startHoldMs + TWEEN_MS;
      expect(
        cycleProgress(
          endAt + timing.endHoldMs - 1,
          timing.endHoldMs,
          timing.startHoldMs,
        ),
      ).toBe(1);
      expect(
        cycleProgress(
          timing.startHoldMs - 1,
          timing.endHoldMs,
          timing.startHoldMs,
        ),
      ).toBe(0);
      expect(
        cycleProgress(
          timing.startHoldMs + timing.endHoldMs + 2 * TWEEN_MS,
          timing.endHoldMs,
          timing.startHoldMs,
        ),
      ).toBe(0);
    }
    expect(demonstrationTiming('prone-leg-raise').startHoldMs).toBe(2000);
  });
});
