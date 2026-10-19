import type { ExerciseId } from '../../domain/types';
import { Figure } from '../../figures/Figure';

/** The animated exercise figure; left sets mirror the working side to V. */
export function FigureSlot({
  exerciseId,
  side,
}: {
  exerciseId: ExerciseId;
  side: 'right' | 'left' | 'both';
}) {
  return (
    <div className="size-32 shrink-0">
      <Figure
        exerciseId={exerciseId}
        working={side === 'left' ? 'left' : 'right'}
        stillOnly
      />
    </div>
  );
}
