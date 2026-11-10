import { exercises } from '../../content/exercises';
import type { ReadyWorkout } from '../../content/readyWorkouts';
import type { ExerciseId } from '../../domain/types';
import { buttonClass } from '../../ui/Button';
import { ExerciseThumb } from '../program/ExerciseThumb';

/** A ready-made workout with a fixed list: shows it as is and adds it with one button. */
export function FixedReadyWorkout({
  workout,
  busy,
  onAdd,
}: {
  workout: ReadyWorkout;
  busy: boolean;
  onAdd(name: string, exerciseIds: ExerciseId[]): void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-xl font-bold">{workout.name}</p>
      <p className="m-0 text-base">{workout.summary}</p>
      <p className="m-0 text-base font-bold">
        {workout.exerciseIds.length} övningar
      </p>
      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {workout.exerciseIds.map((id) => (
          <li key={id} className="flex items-center gap-3 text-base">
            <ExerciseThumb exerciseId={id} animate={false} />
            <span>{exercises[id].name}</span>
          </li>
        ))}
      </ol>
      <p className="m-0 text-base text-ink-soft">{workout.caution}</p>
      <button
        type="button"
        disabled={busy}
        aria-label={`Lägg till färdigt pass: ${workout.name}`}
        className={buttonClass('secondary')}
        onClick={() => onAdd(workout.name, [...workout.exerciseIds])}
      >
        Lägg till och visa
      </button>
    </div>
  );
}
