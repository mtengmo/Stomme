import type { ReactNode } from 'react';
import { Link } from 'wouter';
import { exerciseMetadata } from '../../content/exerciseMetadata';
import { exerciseReferences } from '../../content/exerciseReferences';
import { exercises } from '../../content/exercises';
import { kneeRehabSource } from '../../content/kneeRehab';
import {
  physioForm,
  physioHoldNote,
  physioKneeFitCount,
  physioKneeItemFor,
  physioKneeMissing,
  physioKneeMissingText,
  physioKneePlan,
  physioKneeTotal,
  physioProgressionNotes,
  physioSwapNote,
} from '../../content/physioKneeProgramme';
import { rehabGroup } from '../../content/programmes';
import { neighbour } from '../../content/runningProposals';
import type {
  ExerciseId,
  PlannedExercise,
  TrainingPreferences,
} from '../../domain/types';
import { coverageLabels, missingCoverage } from '../../rules/coverage';
import { ExerciseDifficulty } from '../exercise/ExerciseDifficulty';

export function ReadyWorkout({
  plan,
  preferences,
  onChange,
  onSwap,
  onRemove,
  undoBanner,
  short = false,
  fullBody = !preferences.bodyParts?.length,
  programPass = false,
  hasHistory = true,
}: {
  plan: PlannedExercise[];
  preferences: TrainingPreferences;
  /** Opens the editor with this exercise's row open. */
  onChange(index: number): void;
  /** Custom workouts: swap an exercise for an easier or harder one. Shows the Lättare/Svårare controls. */
  onSwap?(from: ExerciseId, to: ExerciseId): void;
  /** Custom workouts: remove an exercise. Shows a visible Ta bort. */
  onRemove?(exerciseId: ExerciseId): void;
  /** The "Tog bort ... Ångra" notice. */
  undoBanner?: ReactNode;
  short?: boolean;
  fullBody?: boolean;
  /** A generated programme pass: no coverage warning, it is built to fit. */
  programPass?: boolean;
  /** At least one completed session; without it the doses are a starting guess. */
  hasHistory?: boolean;
}) {
  const knee =
    preferences.programId === 'rehab' && rehabGroup(preferences) === 'aaos';
  const physio =
    preferences.programId === 'rehab' && rehabGroup(preferences) === 'physio';
  const untouched =
    physio &&
    JSON.stringify(plan) === JSON.stringify(physioKneePlan(preferences));
  const ids = plan.map((item) => item.exerciseId);
  const missing = missingCoverage(ids).map((area) => coverageLabels[area]);
  return (
    <section aria-labelledby="ready-workout" className="flex flex-col gap-3">
      <h2 id="ready-workout" className="m-0 text-2xl font-bold">
        {short ? 'Ditt kortpass' : 'Ditt pass'} · {plan.length}{' '}
        {plan.length === 1 ? 'övning' : 'övningar'}
      </h2>
      {!short &&
      !programPass &&
      fullBody &&
      preferences.programId === 'general' &&
      missing.length > 0 ? (
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
      {physio && physioKneeMissing(preferences).length > 0 ? (
        <div className="flex flex-col gap-1 border-2 border-edge p-3 text-base">
          <p className="m-0 font-bold">
            {physioKneeMissingText(preferences)}{' '}
            <Link
              href="/installningar/utrustning?tillbaka=traning"
              className="inline-flex min-h-12 items-center underline"
            >
              Ändra utrustning
            </Link>
          </p>
          <ul className="m-0 list-none p-0">
            {physioKneeMissing(preferences).map(({ item, needs }) => (
              <li key={item.sheetNo} className="py-1">
                Papperets övning {item.sheetNo}: {item.sheetLabel} – kräver{' '}
                {needs.join(' och ')}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {physio ? (
        <p className="m-0 text-base">
          {untouched ? `${physioForm} ` : ''}
          {physioKneeFitCount(preferences)} av {physioKneeTotal} övningar passar
          din utrustning. Setvilan på 60 sekunder är appens justerbara standard.
          Avbryt en övning som gör ont.
        </p>
      ) : null}
      {!short && !knee && !physio && preferences.programId !== 'rehab' ? (
        <p className="m-0 text-base text-ink-soft">
          {hasHistory
            ? 'Förslag nästa pass. Antal bygger på sparade resultat och hur passet kändes. Granska och ändra före start.'
            : 'Startförslag för din nivå. Ändra före start om det behövs.'}
        </p>
      ) : null}
      {!physio && !knee && !hasHistory ? (
        <p className="m-0 text-base text-ink-soft">
          2 × 10 = 2 set med 10 repetitioner. 60 s vila mellan seten.
        </p>
      ) : null}
      {undoBanner}
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
            !item.explanation.startsWith('Sparat pass.') &&
            !(physio && item.explanation.startsWith('Förifyllt'))
              ? item.explanation
              : '';
          const easier = onSwap
            ? neighbour(item.exerciseId, 'easier', preferences, ids)
            : undefined;
          const harder = onSwap
            ? neighbour(item.exerciseId, 'harder', preferences, ids)
            : undefined;
          return (
            <li
              key={item.exerciseId}
              className={`flex items-start justify-between gap-3 border-t-2 border-edge px-3 py-2 ${index % 2 ? 'bg-upcoming text-upcoming-ink' : 'bg-[color-mix(in_srgb,var(--ink)_8%,var(--paper))] text-ink'}`}
            >
              <div className="min-w-0">
                <Link
                  href={`/ovning/${item.exerciseId}`}
                  className="flex min-h-12 items-center text-xl font-bold underline"
                >
                  {lead}
                  {preferences.programId === 'rehab'
                    ? `${exerciseReferences[exercise.id]} · `
                    : ''}
                  {exercise.name}
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
              <div className="flex shrink-0 flex-col items-end">
                <button
                  type="button"
                  onClick={() => onChange(index)}
                  aria-label={`Ändra ${exercise.name}`}
                  className="min-h-12 min-w-12 text-base font-bold underline"
                >
                  Ändra
                </button>
                {onSwap && easier ? (
                  <button
                    type="button"
                    onClick={() => onSwap(item.exerciseId, easier)}
                    aria-label={`Lättare än ${exercise.name}: ${exercises[easier].name}`}
                    className="min-h-12 min-w-12 text-base font-bold underline"
                  >
                    Lättare
                  </button>
                ) : null}
                {onSwap && harder ? (
                  <button
                    type="button"
                    onClick={() => onSwap(item.exerciseId, harder)}
                    aria-label={`Svårare än ${exercise.name}: ${exercises[harder].name}`}
                    className="min-h-12 min-w-12 text-base font-bold underline"
                  >
                    Svårare
                  </button>
                ) : null}
                {onRemove && plan.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => onRemove(item.exerciseId)}
                    aria-label={`Ta bort ${exercise.name}`}
                    className="min-h-12 min-w-12 text-base font-bold underline"
                  >
                    Ta bort
                  </button>
                ) : null}
              </div>
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
