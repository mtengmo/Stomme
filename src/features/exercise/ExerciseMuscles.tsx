import { exerciseMuscles, muscleGroups } from '../../content/muscles';
import type { ExerciseId } from '../../domain/types';
import { MuscleMap } from '../../figures/MuscleMap';

/** The same muscle guidance in the workout's how-to and the full exercise guide. */
export function ExerciseMuscles({ exerciseId }: { exerciseId: ExerciseId }) {
  const muscles = exerciseMuscles[exerciseId];
  return (
    <section aria-label="Muskelgrupper" className="flex flex-col gap-2">
      <div>
        <h3 className="m-0 text-base font-bold">Tränar främst</h3>
        <p className="m-0 text-base">
          {muscles.primary.map((id) => muscleGroups[id].label).join(', ')}
        </p>
      </div>
      <div>
        <h3 className="m-0 text-base font-bold">Hjälper till</h3>
        <p className="m-0 text-base">
          {muscles.secondary.map((id) => muscleGroups[id].label).join(', ') ||
            'Inga särskilda muskelgrupper.'}
        </p>
      </div>
      <details>
        <summary className="min-h-12 cursor-pointer py-3 text-base font-bold underline underline-offset-4">
          Visa muskelkarta
        </summary>
        <div className="pt-2">
          <MuscleMap exerciseId={exerciseId} />
        </div>
      </details>
    </section>
  );
}
