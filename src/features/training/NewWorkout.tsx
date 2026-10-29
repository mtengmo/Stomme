import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  experienceLabels,
  isTrainingPreferences,
} from '../../content/programmes';
import { createCustomWorkout } from '../../db/customWorkouts';
import { getDb } from '../../db/db';
import { getMeta } from '../../db/repo';
import type { ExerciseId, PlannedExercise } from '../../domain/types';
import { inventorySummary } from '../../rules/equipment';
import { Icon } from '../../ui/Icon';
import { CustomPicker } from './CustomPicker';

const SELECTION_KEY = 'stomme.new-workout.selection';

/** "/nytt-pass": the start-flow picker for people who already have a setup. */
export function NewWorkout() {
  const [, navigate] = useLocation();
  const training = useLiveQuery(
    async () => ({ value: await getMeta(getDb(), 'training') }),
    [],
  );
  const [filters, setFilters] = useState('');
  if (!training) return null;
  const preferences = isTrainingPreferences(training.value)
    ? training.value
    : undefined;
  if (!preferences)
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4 px-5 pt-6 pb-28">
        <h1 className="m-0 text-5xl font-extrabold">Skapa eget pass</h1>
        <Link
          href="/"
          className="flex min-h-12 items-center text-base font-bold text-accent underline underline-offset-4"
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
        href="/?andra=utrustning&tillbaka=nytt-pass"
        className="flex min-h-12 items-center self-start text-base font-bold text-accent underline underline-offset-4"
      >
        Ändra utrustning eller vana
      </Link>
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
    </div>
  );
}
