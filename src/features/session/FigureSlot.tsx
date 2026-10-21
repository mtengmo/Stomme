import { useState } from 'react';
import { exercises } from '../../content/exercises';
import { loadPresentation } from '../../content/loadPresentation';
import type { ExerciseId } from '../../domain/types';
import {
  Figure,
  supportedFrontViews,
  usePrefersReducedMotion,
} from '../../figures/Figure';

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
  const [view, setView] = useState<'side' | 'front'>('side');
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
        view={view}
      />
      {supportedFrontViews.some((id) => id === exerciseId) ? (
        <button
          type="button"
          onClick={() =>
            setView((angle) => (angle === 'side' ? 'front' : 'side'))
          }
          className="absolute top-0 left-0 min-h-12 bg-paper px-2 text-base font-bold underline"
          aria-label={view === 'side' ? 'Visa framifrån' : 'Visa från sidan'}
        >
          {view === 'side' ? 'Framifrån' : 'Från sidan'}
        </button>
      ) : null}
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
