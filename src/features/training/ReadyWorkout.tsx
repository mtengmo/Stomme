import { Link } from 'wouter';
import { exerciseMetadata } from '../../content/exerciseMetadata';
import { exercises } from '../../content/exercises';
import { kneeRehabSource } from '../../content/kneeRehab';
import { exerciseMuscles } from '../../content/muscles';
import type { PlannedExercise, TrainingPreferences } from '../../domain/types';
import { ExerciseDifficulty } from '../exercise/ExerciseDifficulty';

export function ReadyWorkout({
  plan,
  preferences,
}: {
  plan: PlannedExercise[];
  preferences: TrainingPreferences;
}) {
  const knee =
    preferences.programId === 'rehab' && preferences.rehabFocus === 'knee';
  const ids = plan.map((item) => item.exerciseId);
  const primary = new Set(
    ids.flatMap((exerciseId) => exerciseMuscles[exerciseId].primary),
  );
  const missing = [
    !['quads', 'hamstrings', 'glutes'].some((group) =>
      primary.has(group as 'quads' | 'hamstrings' | 'glutes'),
    )
      ? 'ben och höft'
      : '',
    !ids.includes('supported-row') ? 'drag för överkroppen' : '',
    !ids.some((exerciseId) =>
      [
        'floor-press',
        'kettlebell-floor-press',
        'shoulder-press',
        'kettlebell-press',
      ].includes(exerciseId),
    )
      ? 'press för överkroppen'
      : '',
    !primary.has('core') ? 'bål' : '',
  ].filter(Boolean);
  return (
    <section aria-labelledby="ready-workout" className="flex flex-col gap-3">
      <h2 id="ready-workout" className="m-0 text-2xl font-bold">
        Ditt pass · {plan.length} {plan.length === 1 ? 'övning' : 'övningar'}
      </h2>
      {preferences.programId === 'general' && missing.length > 0 ? (
        <p className="m-0 text-base">
          Urvalet täcker inte alla delar av helkroppspasset. Saknas:{' '}
          {missing.join(', ')}. Se över utrustningen och alternativen under
          Anpassa passet.
        </p>
      ) : null}
      {knee ? (
        <p className="m-0 text-base">
          Värm upp 5–10 minuter med promenad eller lugn cykling. Avbryt en
          övning som gör ont. Tekniknivån beskriver kontroll och balans. Vikt,
          antal och dagsform påverkar hur ansträngande övningen känns.
        </p>
      ) : null}
      {!knee && preferences.programId !== 'rehab' ? (
        <p className="m-0 text-base text-ink-soft">
          Förslag nästa pass. Antal bygger på sparade resultat och hur passet
          kändes. Granska och ändra före start.
        </p>
      ) : null}
      <ol className="m-0 list-none p-0">
        {plan.map((item) => {
          const exercise = exercises[item.exerciseId];
          const variant = exerciseMetadata[item.exerciseId].variants.find(
            (v) => v.id === item.variantId,
          );
          const unit =
            exercise.unit === 'seconds'
              ? 'sekunder'
              : exercise.unit === 'meters'
                ? 'meter'
                : 'repetitioner';
          const side = !exercise.perSide
            ? ''
            : item.sides?.length === 1
              ? item.sides[0] === 'left'
                ? ' · vänster'
                : ' · höger'
              : ' · per sida';
          return (
            <li key={item.exerciseId} className="border-b-2 border-edge py-3">
              <Link
                href={`/ovning/${item.exerciseId}`}
                className="flex min-h-12 items-center text-xl font-bold underline"
              >
                {exercise.name}
              </Link>
              {item.explanation ? (
                <p className="m-0 text-base text-ink-soft">
                  {item.explanation}
                </p>
              ) : null}
              {knee ? (
                <ExerciseDifficulty
                  exerciseId={exercise.id}
                  variantId={item.variantId}
                  loadIndex={item.loadIndex}
                />
              ) : null}
              <p className="m-0 text-lg">
                {item.sets} × {item.target} {unit}
                {side}
              </p>
              <p className="m-0 text-base text-ink-soft">
                {variant?.label ?? 'Välj utrustning under Anpassa passet'}
                {item.weightKg > 0 ? ` · ${item.weightKg} kg totalt` : ''}
              </p>
            </li>
          );
        })}
      </ol>
      {knee ? (
        <details>
          <summary className="min-h-12 cursor-pointer py-3 text-base font-bold">
            Om knäpasset
          </summary>
          <p className="m-0 text-base">
            Stomme har valt övningar och startdos ur AAOS allmänna knäprogram.
            Granska och ändra doseringen före start. Vid skada eller efter
            operation: stäm av övningar och dosering med vården. Setvilan är
            appens justerbara standard. Passet ökar inte automatiskt.
          </p>
          <a
            href={kneeRehabSource}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-12 items-center text-base font-bold underline"
          >
            Läs AAOS vägledning
          </a>
        </details>
      ) : null}
    </section>
  );
}
