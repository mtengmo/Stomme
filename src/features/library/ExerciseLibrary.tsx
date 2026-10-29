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
  bodyRegions,
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
import { readFavourites } from '../../db/favourites';
import { getMeta } from '../../db/repo';
import type {
  BodyRegionId,
  EquipmentChoice,
  Exercise,
} from '../../domain/types';
import { useHashSearch } from '../../lib/hashLocation';
import {
  type ExerciseFilters,
  filterExercises,
  missingEquipment,
} from '../../rules/libraryFilters';
import { initialTrainingRoster } from '../../rules/programRosters';
import { Icon } from '../../ui/Icon';
import { ExerciseFilterControls } from '../exercise/ExerciseFilterControls';
import {
  FavouriteButton,
  FavouritesProvider,
} from '../exercise/FavouriteButton';
import {
  ExerciseChoice,
  SelectionNote,
  WorkoutBuilder,
} from './WorkoutBuilder';

function equipment(exercise: Exercise): string {
  return exerciseMetadata[exercise.id].variants
    .map((variant) => variant.label)
    .join(' / ');
}

function ExerciseRow({
  exercise,
  inventory,
}: {
  exercise: Exercise;
  inventory: EquipmentChoice[];
}) {
  const missing = missingEquipment(exercise.id, inventory);
  const membership = Object.values(templates).filter((template) =>
    template.items.some((item) => item.exerciseId === exercise.id),
  );
  return (
    <li className="grid grid-cols-[7rem_minmax(0,1fr)] items-start gap-4 border-t-2 border-edge py-4">
      <ExerciseChoice exercise={exercise} />
      <div className="min-w-0">
        <Link
          href={`/ovning/${exercise.id}`}
          className="flex min-h-12 items-center justify-between gap-3 text-ink underline decoration-2 underline-offset-4"
        >
          <h3 className="m-0 min-w-0 break-words font-sans text-xl leading-snug font-bold">
            {exercise.name}
          </h3>
          <Icon name="back" className="shrink-0 rotate-180" />
        </Link>
        <p className="m-0 mt-2 text-base">
          {exerciseReferences[exercise.id]} ·{' '}
          {primaryMuscleLabel(exercise.id) ? (
            <>Tränar främst: {primaryMuscleLabel(exercise.id)}</>
          ) : (
            'Rörlighet och position'
          )}
        </p>
        <p className="m-0 mt-1 text-base text-ink-soft">
          Utrustning: {equipment(exercise)}
        </p>
        {missing.length ? (
          <p className="m-0 mt-1 text-base font-bold">
            Saknar utrustning: {missing.join(', ')}
          </p>
        ) : null}
        <SelectionNote exercise={exercise} />
        <p className="m-0 mt-1 text-base text-ink-soft">
          Teknisk svårighetsgrad:{' '}
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
        <FavouriteButton id={exercise.id} />
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
      </div>
    </li>
  );
}

function ResultList({
  title,
  items,
  id,
  inventory,
}: {
  title: string;
  items: readonly Exercise[];
  id: string;
  inventory: EquipmentChoice[];
}) {
  if (!items.length) return null;
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="m-0 mb-3 text-3xl font-bold">
        {title}
      </h2>
      <ul className="m-0 list-none p-0">
        {items.map((exercise) => (
          <ExerciseRow
            key={exercise.id}
            exercise={exercise}
            inventory={inventory}
          />
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
  const favourites = useLiveQuery(() => readFavourites(getDb()), []);
  const favouritesOnly = query.get('favoriter') === '1';
  const preferences = isTrainingPreferences(training) ? training : undefined;
  const filters: ExerciseFilters = {
    aaos: query.get('kalla') === 'aaos',
    purpose:
      query.get('syfte') === 'mine'
        ? 'mine'
        : Object.hasOwn(purposeLabels, query.get('syfte') ?? '')
          ? (query.get('syfte') as ExerciseFilters['purpose'])
          : '',
    equipment:
      query.get('redskap') === 'available'
        ? 'available'
        : Object.hasOwn(equipmentLabels, query.get('redskap') ?? '')
          ? (query.get('redskap') as ExerciseFilters['equipment'])
          : '',
    level: Object.hasOwn(technicalLevelLabels, query.get('niva') ?? '')
      ? (query.get('niva') as ExerciseFilters['level'])
      : '',
    term: query.get('sok') ?? '',
    region: bodyRegions.some((item) => item.id === query.get('omrade'))
      ? (query.get('omrade') as BodyRegionId)
      : '',
    muscle: selected ?? '',
    kind:
      query.get('typ') === 'strength' || query.get('typ') === 'mobility'
        ? (query.get('typ') as ExerciseFilters['kind'])
        : '',
    unit:
      query.get('utforande') === 'reps' || query.get('utforande') === 'time'
        ? (query.get('utforande') as ExerciseFilters['unit'])
        : '',
    oneSide: query.get('sida') === '1',
    favouritesOnly,
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
  const { primary, supporting: secondary } = filterExercises(
    exerciseList,
    filters,
    { inventory, mine, favourites },
  );
  const paramNames: Record<keyof ExerciseFilters, string> = {
    aaos: 'kalla',
    term: 'sok',
    region: 'omrade',
    muscle: 'muskel',
    purpose: 'syfte',
    level: 'niva',
    equipment: 'redskap',
    kind: 'typ',
    unit: 'utforande',
    oneSide: 'sida',
    favouritesOnly: 'favoriter',
  };
  const changeFilters = (patch: Partial<ExerciseFilters>) => {
    const next = new URLSearchParams(search);
    for (const [name, value] of Object.entries(patch)) {
      const param = paramNames[name as keyof ExerciseFilters];
      if (value) next.set(param, value === true ? '1' : String(value));
      else next.delete(param);
    }
    navigate(`/ovningar${next.size ? `?${next}` : ''}`, {
      replace: 'term' in patch,
    });
  };
  const till = query.get('till');
  const clearFilters = () => {
    navigate(till ? `/ovningar?till=${encodeURIComponent(till)}` : '/ovningar');
    document.getElementById('library-search')?.focus();
  };
  const invalid = query.has('muskel') && selected === null;

  useEffect(() => {
    if (invalid) {
      const next = new URLSearchParams(search);
      next.delete('muskel');
      navigate(`/ovningar${next.size ? `?${next}` : ''}`, { replace: true });
    }
  }, [invalid, navigate, search]);

  const count = primary.length + secondary.length;
  const area = filters.muscle
    ? muscleGroups[filters.muscle].label
    : filters.region
      ? bodyRegions.find((item) => item.id === filters.region)?.label
      : undefined;
  const onlyBodyweight = preferences?.equipment.every(
    (item) => item === 'bodyweight',
  );

  return (
    <FavouritesProvider>
      <div className="mx-auto flex max-w-md flex-col gap-5 px-5 pt-3 pb-[var(--app-nav-height)]">
        <Link
          href="/"
          className="-ml-2 flex min-h-12 items-center gap-1 self-start px-2 text-base font-bold"
        >
          <Icon name="back" />
          Till träningen
        </Link>
        <header>
          <h1 className="m-0 text-5xl leading-none font-extrabold">Övningar</h1>
          <p className="m-0 mt-3 text-base text-ink-soft">
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
        {filters.aaos ? (
          <p className="m-0 text-base font-bold">
            Visar bara källbaserade AAOS knäövningar.
          </p>
        ) : null}
        <ExerciseFilterControls
          value={filters}
          onChange={changeFilters}
          onClear={clearFilters}
          defaultEquipment=""
          idPrefix="library"
          showMine
        />
        {onlyBodyweight ? (
          <p className="m-0 text-base text-ink-soft">
            Du har bara kroppsvikt registrerad.{' '}
            <Link
              href="/installningar"
              className="font-bold text-accent underline underline-offset-4"
            >
              Lägg till utrustning i Inställningar
            </Link>
          </p>
        ) : null}
        <p role="status" className="m-0 text-base text-ink-soft">
          {count} {count === 1 ? 'övning' : 'övningar'}
          {area ? ` för ${area.toLowerCase()}` : ''}
        </p>
        {count === 0 ? (
          <p className="m-0 text-xl">Inga övningar passar filtren.</p>
        ) : null}
        <WorkoutBuilder>
          <ResultList
            title={area ? 'Tränar främst' : 'Alla övningar'}
            items={primary}
            id="primary-results"
            inventory={inventory}
          />
          <ResultList
            title="Hjälper till"
            items={secondary}
            id="secondary-results"
            inventory={inventory}
          />
        </WorkoutBuilder>
      </div>
    </FavouritesProvider>
  );
}
