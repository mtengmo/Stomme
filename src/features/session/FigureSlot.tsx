import { useState } from 'react';
import { exercises } from '../../content/exercises';
import { loadPresentation } from '../../content/loadPresentation';
import type { ExerciseId } from '../../domain/types';
import { Figure, usePrefersReducedMotion } from '../../figures/Figure';

/** The animated exercise figure; left sets mirror the working side to V. */
export function FigureSlot({
  exerciseId,
  side,
  loadIndex,
  variantId,
}: {
  exerciseId: ExerciseId;
  side: 'right' | 'left' | 'both';
  loadIndex: number;
  variantId?: string;
}) {
  const [paused, setPaused] = useState(false);
  const reduced = usePrefersReducedMotion();
  return (
    <section
      className="session-movement relative mx-auto w-full shrink-0"
      aria-label="Rörelsen"
    >
      <Figure
        exerciseId={exerciseId}
        equipment={
          loadPresentation(exercises[exerciseId], loadIndex, variantId)
            .equipment
        }
        working={side === 'both' ? null : side}
        paused={paused || reduced}
        stillOnly
      />
      {!reduced ? (
        <button
          type="button"
          aria-pressed={paused}
          onClick={() => setPaused((value) => !value)}
          className="absolute top-0 right-0 min-h-12 bg-paper px-2 text-base font-bold underline"
        >
          {paused ? 'Spela rörelsen' : 'Pausa rörelsen'}
        </button>
      ) : (
        <span className="sr-only">
          Rörelsen visas stilla med minskad rörelse.
        </span>
      )}
    </section>
  );
}
