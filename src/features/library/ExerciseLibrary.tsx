import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import {
  equipmentLabels,
  exerciseMetadata,
  purposeLabels,
  technicalLevelLabels,
} from '../../content/exerciseMetadata';
import { exerciseReferences } from '../../content/exerciseReferences';
import { exerciseList } from '../../content/exercises';
import {
  exerciseMuscles,
  type MuscleGroupId,
  muscleGroups,
  parseMuscleFilter,
  primaryMuscleLabel,
} from '../../content/muscles';
import {
  defaultEquipment,
  isTrainingPreferences,
} from '../../content/programmes';
import { templates } from '../../content/templates';
import { getDb } from '../../db/db';
import { getMeta } from '../../db/repo';
import type { Exercise } from '../../domain/types';
import { useHashSearch } from '../../lib/hashLocation';
import {
  type LibraryFilters,
  matchesLibraryFilters,
} from '../../rules/libraryFilters';
import { initialTrainingRoster } from '../../rules/programRosters';
import { Icon } from '../../ui/Icon';

function equipment(exercise: Exercise): string {
  return exerciseMetadata[exercise.id].variants
    .map((variant) => variant.label)
    .join(' / ');
}

function ExerciseRow({ exercise }: { exercise: Exercise }) {
  const membership = Object.values(templates).filter((template) =>
    template.items.some((item) => item.exerciseId === exercise.id),
  );
  return (
    <li className="border-t-2 border-edge py-4">
      <Link
        href={`/ovning/${exercise.id}`}
        className="flex min-h-12 items-center justify-between gap-3 text-ink underline decoration-2 underline-offset-4"
      >
        <h3 className="m-0 font-sans text-xl leading-snug font-bold">
          {exercise.name}
        </h3>
        <Icon name="back" className="shrink-0 rotate-180" />
      </Link>
      <p className="m-0 mt-2 text-base">
        {exerciseReferences[exercise.id]} · Tränar främst:{' '}
        {primaryMuscleLabel(exercise.id)}
      </p>
      <p className="m-0 mt-1 text-base text-ink-soft">
        Utrustning: {equipment(exercise)}
      </p>
      <p className="m-0 mt-1 text-base text-ink-soft">
        {[
          ...new Set(
            exerciseMetadata[exercise.id].variants.map(
              (variant) => technicalLevelLabels[variant.technicalLevel],
            ),
          ),
        ].join(' / ')}{' '}
        ·{' '}
        {exerciseMetadata[exercise.id].kind === 'mobility'
          ? 'Rörlighet'
          : 'Styrka'}
      </p>
      {exercise.optional ? (
        <p className="m-0 mt-2 text-base font-bold">Valfri övning</p>
      ) : null}
      {membership.map((template) => (
        <Link
          key={template.id}
          href={`/pass/${template.id}`}
          className="inline-flex min-h-12 items-center text-base font-bold underline decoration-2 underline-offset-4"
        >
          Ingår i {template.name}
        </Link>
      ))}
    </li>
  );
}

function ResultList({
  title,
  items,
  id,
}: {
  title: string;
  items: readonly Exercise[];
  id: string;
}) {
  if (!items.length) return null;
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="m-0 mb-3 text-3xl font-bold">
        {title}
      </h2>
      <ul className="m-0 list-none p-0">
        {items.map((exercise) => (
          <ExerciseRow key={exercise.id} exercise={exercise} />
        ))}
      </ul>
    </section>
  );
}

export function ExerciseLibrary() {
  const search = useHashSearch();
  const [, navigate] = useLocation();
  const selected = parseMuscleFilter(search);
  const query = new URLSearchParams(search);
  const training = useLiveQuery(() => getMeta(getDb(), 'training'), []);
  const preferences = isTrainingPreferences(training) ? training : undefined;
  const filters: LibraryFilters = {
    aaos: query.get('kalla') === 'aaos',
    purpose:
      query.get('syfte') === 'mine'
        ? 'mine'
        : Object.hasOwn(purposeLabels, query.get('syfte') ?? '')
          ? (query.get('syfte') as LibraryFilters['purpose'])
          : '',
    equipment:
      query.get('redskap') === 'available'
        ? 'available'
        : Object.hasOwn(equipmentLabels, query.get('redskap') ?? '')
          ? (query.get('redskap') as LibraryFilters['equipment'])
          : '',
    level: Object.hasOwn(technicalLevelLabels, query.get('niva') ?? '')
      ? (query.get('niva') as LibraryFilters['level'])
      : '',
    term: query.get('sok') ?? '',
  };
  const inventory = preferences?.equipment ?? defaultEquipment;
  const roster = useLiveQuery(async () => {
    const sessions = (await getDb().sessions.toArray())
      .filter((session) =>
        preferences
          ? session.programId === preferences.programId
          : !session.programId,
      )
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    return (['A', 'B'] as const).flatMap(
      (id) =>
        sessions
          .find((session) => session.templateId === id)
          ?.plan.map((item) => item.exerciseId) ??
        (preferences
          ? initialTrainingRoster(preferences, id)
          : templates[id].items.map((item) => item.exerciseId)),
    );
  }, [preferences?.programId, JSON.stringify(inventory)]);
  const mine = new Set(
    roster ??
      (preferences
        ? (['A', 'B'] as const).flatMap((id) =>
            initialTrainingRoster(preferences, id),
          )
        : Object.values(templates).flatMap((template) =>
            template.items.map((item) => item.exerciseId),
          )),
  );
  const eligible = exerciseList.filter((exercise) =>
    matchesLibraryFilters(exercise, filters, inventory, mine),
  );
  const changeFilter = (name: string, value: string) => {
    const next = new URLSearchParams(search);
    if (value) next.set(name, value);
    else next.delete(name);
    navigate(`/ovningar${next.size ? `?${next}` : ''}`, {
      replace: name === 'sok',
    });
  };
  const invalid = query.has('muskel') && selected === null;

  useEffect(() => {
    if (invalid) navigate('/ovningar', { replace: true });
  }, [invalid, navigate]);

  const primary = selected
    ? eligible.filter((exercise) =>
        exerciseMuscles[exercise.id].primary.includes(selected),
      )
    : eligible;
  const secondary = selected
    ? eligible.filter((exercise) =>
        exerciseMuscles[exercise.id].secondary.includes(selected),
      )
    : [];
  const count = primary.length + secondary.length;
  const muscleFilters: (MuscleGroupId | null)[] = [
    null,
    ...(Object.keys(muscleGroups) as MuscleGroupId[]),
  ];

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 px-5 pt-3 pb-28">
      <Link
        href="/"
        className="-ml-2 flex min-h-12 items-center gap-1 self-start px-2 text-base font-bold"
      >
        <Icon name="back" />
        Till veckan
      </Link>
      <header>
        <h1 className="m-0 text-5xl leading-none font-extrabold">Övningar</h1>
        <p className="m-0 mt-3 text-xl">Vad vill du träna?</p>
        <p className="m-0 mt-2 text-base text-ink-soft">
          Hela kroppen, knäfokus och löpstyrka. Välj efter syfte, muskler och
          utrustning.
        </p>
      </header>
      <Link
        href="/ovningar?syfte=knee&kalla=aaos"
        className="flex min-h-12 items-center self-start text-base font-bold underline"
      >
        AAOS knäövningar · källbaserad samling
      </Link>
      <Link
        href="/granska"
        className="flex min-h-12 items-center self-start text-base font-bold underline decoration-2 underline-offset-4"
      >
        Granska alla övningar
      </Link>
      <label className="flex flex-col gap-2 text-lg font-bold">
        Träningssyfte
        <select
          value={filters.purpose}
          onChange={(event) => changeFilter('syfte', event.target.value)}
          className="min-h-12 rounded-sm border-2 border-edge bg-paper px-3 text-base text-ink"
        >
          <option value="">Alla syften</option>
          {Object.entries(purposeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
          <option value="mine">Mitt program</option>
        </select>
      </label>
      <label className="flex flex-col gap-2 text-lg font-bold">
        Sök efter namn eller nummer
        <input
          type="search"
          value={filters.term}
          onChange={(event) => changeFilter('sok', event.target.value)}
          className="min-h-12 rounded-sm border-2 border-edge bg-paper px-3 text-base text-ink"
        />
      </label>
      <details>
        <summary className="flex min-h-12 cursor-pointer items-center text-lg font-bold underline">
          Fler filter{filters.equipment || filters.level ? ' · aktiva' : ''}
        </summary>
        <div className="flex flex-col gap-3 py-3">
          <label className="flex flex-col gap-2 text-base font-bold">
            Utrustning
            <select
              value={filters.equipment}
              onChange={(event) => changeFilter('redskap', event.target.value)}
              className="min-h-12 rounded-sm border-2 border-edge bg-paper px-3 text-base text-ink"
            >
              <option value="">Alla redskap</option>
              <option value="available">Min tillgängliga utrustning</option>
              {Object.entries(equipmentLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-base font-bold">
            Teknisk nivå
            <select
              value={filters.level}
              onChange={(event) => changeFilter('niva', event.target.value)}
              className="min-h-12 rounded-sm border-2 border-edge bg-paper px-3 text-base text-ink"
            >
              <option value="">Alla nivåer</option>
              {Object.entries(technicalLevelLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </details>
      {search ? (
        <button
          type="button"
          onClick={() => navigate('/ovningar')}
          className="min-h-12 self-start text-base font-bold underline"
        >
          Rensa alla filter
        </button>
      ) : null}
      <fieldset
        className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0"
        aria-label="Filtrera på muskelgrupp"
      >
        {muscleFilters.map((group) => {
          const active = group === selected;
          return (
            <button
              key={group ?? 'all'}
              type="button"
              aria-pressed={active}
              onClick={() => changeFilter('muskel', group ?? '')}
              className={`inline-flex min-h-12 items-center gap-1.5 rounded-sm border-2 bg-paper px-3 py-2 text-base font-bold ${active ? 'border-blue text-blue' : 'border-edge text-ink'}`}
            >
              {active ? <Icon name="check" size={18} /> : null}
              {group ? muscleGroups[group].label : 'Alla'}
            </button>
          );
        })}
      </fieldset>
      <p role="status" className="m-0 text-base text-ink-soft">
        {count} {count === 1 ? 'övning' : 'övningar'}
        {selected ? ` för ${muscleGroups[selected].label.toLowerCase()}` : ''}
      </p>
      {count === 0 ? (
        <p className="m-0 text-xl">
          Inga övningar matchar dina filter. Rensa filtren eller välj andra
          alternativ.
        </p>
      ) : null}
      <ResultList
        title={selected ? 'Tränar främst' : 'Alla övningar'}
        items={primary}
        id="primary-results"
      />
      <ResultList
        title="Hjälper till"
        items={secondary}
        id="secondary-results"
      />
    </div>
  );
}
