import { Link } from 'wouter';
import { exerciseMetadata } from '../../content/exerciseMetadata';
import { exerciseReferences } from '../../content/exerciseReferences';
import { exercises } from '../../content/exercises';
import { kneeRehabSource } from '../../content/kneeRehab';
import { exerciseMuscles } from '../../content/muscles';
import {
  physioForm,
  physioHoldNote,
  physioKneeFitCount,
  physioKneeItemFor,
  physioKneePlan,
  physioKneeTotal,
  physioProgressionNotes,
  physioSwapNote,
} from '../../content/physioKneeProgramme';
import { rehabGroup } from '../../content/programmes';
import type { PlannedExercise, TrainingPreferences } from '../../domain/types';
import { ExerciseDifficulty } from '../exercise/ExerciseDifficulty';

export function ReadyWorkout({
  plan,
  preferences,
  onChange,
}: {
  plan: PlannedExercise[];
  preferences: TrainingPreferences;
  /** Opens the editor with this exercise's row open. */
  onChange(index: number): void;
}) {
  const knee =
    preferences.programId === 'rehab' && rehabGroup(preferences) === 'aaos';
  const physio =
    preferences.programId === 'rehab' && rehabGroup(preferences) === 'physio';
  const untouched =
    physio &&
    JSON.stringify(plan) === JSON.stringify(physioKneePlan(preferences));
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
      {physio ? (
        <p className="m-0 text-base">
          {untouched ? `${physioForm} ` : ''}
          {physioKneeFitCount(preferences)} av {physioKneeTotal} övningar passar
          din utrustning. Setvilan på 60 sekunder är appens justerbara standard.
          Avbryt en övning som gör ont.
        </p>
      ) : null}
      {!knee && !physio && preferences.programId !== 'rehab' ? (
        <p className="m-0 text-base text-ink-soft">
          Förslag nästa pass. Antal bygger på sparade resultat och hur passet
          kändes. Granska och ändra före start.
        </p>
      ) : null}
      <ol className="m-0 list-none p-0">
        {plan.map((item, index) => {
          const exercise = exercises[item.exerciseId];
          const variant = exerciseMetadata[item.exerciseId].variants.find(
            (v) => v.id === item.variantId,
          );
          const unit =
            exercise.unit === 'seconds'
              ? 'sek'
              : exercise.unit === 'meters'
                ? 'm'
                : exercise.unit === 'laps'
                  ? 'varv'
                  : '';
          const side = !exercise.perSide
            ? ''
            : item.sides?.length === 1
              ? item.sides[0] === 'left'
                ? ' vänster'
                : ' höger'
              : ' per sida';
          const sheetNo = physioKneeItemFor(item.exerciseId)?.sheetNo;
          const lead = physio
            ? sheetNo
              ? `${sheetNo}. `
              : ''
            : `${index + 1}. `;
          const note =
            item.explanation &&
            !item.explanation.startsWith('Startförslag') &&
            !(physio && item.explanation.startsWith('Förifyllt'))
              ? item.explanation
              : '';
          return (
            <li
              key={item.exerciseId}
              className={`flex items-start justify-between gap-3 border-t-2 border-edge px-3 py-2 ${index % 2 ? 'bg-upcoming text-upcoming-ink' : 'bg-surface text-ink'}`}
            >
              <div className="min-w-0">
                <Link
                  href={`/ovning/${item.exerciseId}`}
                  className="flex min-h-12 items-center text-xl font-bold underline"
                >
                  {lead}
                  {exerciseReferences[exercise.id]} · {exercise.name}
                </Link>
                <p className="m-0 text-base">
                  {item.sets} × {item.target}
                  {unit ? ` ${unit}` : ''}
                  {side} ·{' '}
                  {item.weightKg > 0
                    ? `${item.weightKg} kg totalt`
                    : (variant?.label ?? 'välj utrustning')}
                </p>
                {note ? <p className="m-0 text-base">{note}</p> : null}
                {physio
                  ? physioProgressionNotes(item.exerciseId).map((text) => (
                      <p key={text} className="m-0 text-base text-ink-soft">
                        {text}
                      </p>
                    ))
                  : null}
                {knee ? (
                  <ExerciseDifficulty
                    exerciseId={exercise.id}
                    variantId={item.variantId}
                    loadIndex={item.loadIndex}
                  />
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => onChange(index)}
                aria-label={`Ändra ${exercise.name}`}
                className="min-h-12 min-w-12 shrink-0 text-base font-bold underline"
              >
                Ändra
              </button>
            </li>
          );
        })}
      </ol>
      {physio ? (
        <p className="m-0 text-base">
          Numren är papperets övningsnummer. {physioSwapNote}
          {ids.some(
            (id) => id === 'seated-knee-extension' || id === 'hamstring-curl',
          )
            ? ` ${physioHoldNote}`
            : ''}
        </p>
      ) : null}
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
