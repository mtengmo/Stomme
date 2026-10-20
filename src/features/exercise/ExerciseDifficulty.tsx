import {
  technicalLevelLabels,
  variantForLoad,
} from '../../content/exerciseMetadata';
import type { ExerciseId } from '../../domain/types';

const rank = { basic: 1, practiced: 2, technical: 3 } as const;

/** Editorial movement complexity, separate from the user's effort rating. */
export function ExerciseDifficulty({
  exerciseId,
  variantId,
  loadIndex = 0,
  explain = false,
}: {
  exerciseId: ExerciseId;
  variantId?: string;
  loadIndex?: number;
  explain?: boolean;
}) {
  const variant = variantForLoad(exerciseId, loadIndex, variantId);
  return (
    <p className="m-0 text-base text-ink-soft">
      <span className="font-bold">
        Tekniknivå {rank[variant.technicalLevel]}/3 ·{' '}
        {technicalLevelLabels[variant.technicalLevel]}
      </span>
      {explain ? ` — ${variant.technicalReason}` : ''}
    </p>
  );
}
