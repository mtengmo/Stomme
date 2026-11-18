import type { ExerciseId } from '../domain/types';
import {
  hasPronePlacementDiagram,
  PronePlacementDiagram,
} from './PronePlacementDiagrams';
import { hasStanceDiagram, StanceDiagram } from './StanceDiagrams';

/** Exercises with a static top-down placement diagram (prone or standing). */
export const hasPlacementDiagram = (id: ExerciseId): boolean =>
  hasPronePlacementDiagram(id) || hasStanceDiagram(id);

/** The placement diagram of an exercise, shown in the exercise card and the set screen. */
export function PlacementDiagram({ exerciseId }: { exerciseId: ExerciseId }) {
  return hasStanceDiagram(exerciseId) ? (
    <StanceDiagram exerciseId={exerciseId} />
  ) : (
    <PronePlacementDiagram exerciseId={exerciseId} />
  );
}
