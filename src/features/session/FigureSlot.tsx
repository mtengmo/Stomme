import { exercises } from '../../content/exercises';
import { loadPresentation } from '../../content/loadPresentation';
import type { ExerciseId } from '../../domain/types';
import { Figure } from '../../figures/Figure';

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
  return (
    <div className="size-32 shrink-0">
      <Figure
        exerciseId={exerciseId}
        equipment={
          loadPresentation(exercises[exerciseId], loadIndex, variantId)
            .equipment
        }
        working={side === 'both' ? null : side}
        stillOnly
      />
    </div>
  );
}
