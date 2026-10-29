import { useState } from 'react';
import { exercises } from '../../content/exercises';
import { loadPresentation } from '../../content/loadPresentation';
import type { ExerciseId } from '../../domain/types';
import type { FigureAngle } from '../../figures/Figure';
import {
  alternateView,
  defaultViewFor,
  Figure,
  supportedViewsFor,
  usePrefersReducedMotion,
} from '../../figures/Figure';

/** The animated exercise figure; left sets mirror the working side to V. */
export function FigureSlot({
  exerciseId,
  side,
  loadIndex,
  variantId,
  progress,
}: {
  exerciseId: ExerciseId;
  side: 'right' | 'left' | 'both';
  loadIndex: number;
  variantId?: string;
  /** Rep counter clock: the figure follows it instead of its own timer. */
  progress?: () => number | undefined;
}) {
  const [selectedView, setSelectedView] = useState<{
    exerciseId: ExerciseId;
    view: FigureAngle;
  }>(() => ({ exerciseId, view: defaultViewFor(exerciseId) }));
  const view =
    selectedView.exerciseId === exerciseId
      ? selectedView.view
      : defaultViewFor(exerciseId);
  const availableViews = supportedViewsFor(exerciseId);
  const alternate = alternateView(exerciseId);
  const defaultView = defaultViewFor(exerciseId);
  const activeView = availableViews.includes(view) ? view : defaultView;
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
        paused={reduced}
        stillOnly
        view={activeView}
        progress={progress}
      />
      {availableViews.length > 1 ? (
        <button
          type="button"
          onClick={() => {
            const nextView =
              availableViews.find((candidate) => candidate !== activeView) ??
              defaultView;
            setSelectedView({ exerciseId, view: nextView });
          }}
          className="absolute top-0 left-0 min-h-12 bg-paper px-2 text-base font-bold underline"
          aria-label={
            activeView === 'side'
              ? `Visa ${alternate === 'front' ? 'framifrån' : 'från sned vinkel'}`
              : 'Visa från sidan'
          }
        >
          {activeView === 'side'
            ? alternate === 'front'
              ? 'Framifrån'
              : 'Sned vinkel'
            : 'Från sidan'}
        </button>
      ) : null}
      {reduced ? (
        <span className="sr-only">
          Rörelsen visas stilla med minskad rörelse.
        </span>
      ) : null}
    </section>
  );
}
