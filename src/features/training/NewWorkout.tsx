import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  experienceLabels,
  isTrainingPreferences,
} from '../../content/programmes';
import { readyWorkouts } from '../../content/readyWorkouts';
import { addReadyWorkout, createCustomWorkout } from '../../db/customWorkouts';
import { getDb } from '../../db/db';
import { getMeta } from '../../db/repo';
import type { ExerciseId, PlannedExercise } from '../../domain/types';
import { inventorySummary } from '../../rules/equipment';
import { Icon } from '../../ui/Icon';
import { linkClass } from '../../ui/link';
import { CustomWorkoutList } from '../library/CustomWorkoutList';
import { CustomPicker } from './CustomPicker';
import { RunningProposals } from './RunningProposals';

const SELECTION_KEY = 'stomme.new-workout.selection';

/** "/nytt-pass": the start-flow picker for people who already have a setup. */
export function NewWorkout() {
  const [, navigate] = useLocation();
  const training = useLiveQuery(
    async () => ({ value: await getMeta(getDb(), 'training') }),
    [],
  );
  const [filters, setFilters] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!training) return null;
  const preferences = isTrainingPreferences(training.value)
    ? training.value
    : undefined;
  if (!preferences)
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4 px-5 pt-6 pb-[var(--app-nav-clear)]">
        <h1 className="m-0 text-5xl font-extrabold">Skapa eget pass</h1>
        <Link
          href="/"
          className={`flex min-h-12 items-center text-base ${linkClass}`}
        >
          Välj träningsinriktning först
        </Link>
      </div>
    );
  const summary = [
    `Utrustning: ${inventorySummary(preferences).toLocaleLowerCase('sv')}`,
    ...(preferences.programId === 'rehab'
      ? []
      : [`Träningsvana: ${experienceLabels[preferences.experience]}`]),
  ].join(' · ');
  async function create(
    ids: ExerciseId[],
    plan: PlannedExercise[] | undefined,
  ) {
    const id = await createCustomWorkout(ids, plan);
    try {
      sessionStorage.removeItem(SELECTION_KEY);
    } catch {
      /* Nothing to clear. */
    }
    navigate(`/traning/A?workout=${id}`);
  }
  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 px-5 pt-3 pb-[var(--app-nav-height)]">
      <Link
        href="/"
        className="-ml-2 flex min-h-12 items-center gap-1 self-start px-2 text-base font-bold"
      >
        <Icon name="back" />
        Till träningen
      </Link>
      <h1 className="m-0 text-5xl leading-none font-extrabold">
        Skapa eget pass
      </h1>
      <p className="m-0 text-base text-ink-soft">{summary}</p>
      <Link
        href="/installningar/utrustning?tillbaka=nytt-pass"
        className={`flex min-h-12 items-center self-start text-base ${linkClass}`}
      >
        Ändra utrustning
      </Link>
      {preferences.programId === 'rehab' ? null : (
        <section
          aria-labelledby="ready-workouts"
          className="flex flex-col gap-3 border-y-2 border-edge py-3"
        >
          <h2 id="ready-workouts" className="m-0 text-2xl font-bold">
            Färdiga pass
          </h2>
          {readyWorkouts.map((workout) => (
            <RunningProposals
              key={workout.id}
              workout={workout}
              preferences={preferences}
              busy={busy}
              onAdd={async (name, ids) => {
                setBusy(true);
                setError('');
                try {
                  const id = await addReadyWorkout(name, ids, workout.group);
                  navigate(`/traning/A?workout=${id}`);
                } catch {
                  setError('Kunde inte lägga till passet. Försök igen.');
                  setBusy(false);
                }
              }}
            />
          ))}
          {error ? (
            <p role="alert" className="m-0 text-base font-bold">
              {error}
            </p>
          ) : null}
        </section>
      )}
      <p className="m-0 text-lg">
        Välj upp till 12. Ordning, set och vikt ändrar du sedan.
      </p>
      <CustomPicker
        preferences={preferences}
        storageKey={SELECTION_KEY}
        filters={filters}
        onFiltersChange={setFilters}
        onCreate={create}
        idPrefix="new"
      />
      <details className="pb-24">
        <summary className="min-h-12 cursor-pointer py-3 text-base font-bold">
          Dina sparade pass
        </summary>
        <CustomWorkoutList
          headingId="new-saved-workouts"
          title="Sparade pass"
        />
      </details>
    </div>
  );
}
