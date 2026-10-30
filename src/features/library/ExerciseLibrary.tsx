import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { exerciseList } from '../../content/exercises';
import {
  bodyRegions,
  muscleGroups,
  parseMuscleFilter,
} from '../../content/muscles';
import {
  defaultEquipment,
  isTrainingPreferences,
} from '../../content/programmes';
import { templates } from '../../content/templates';
import { getDb } from '../../db/db';
import { readFavourites } from '../../db/favourites';
import { getMeta } from '../../db/repo';
import type { ExerciseId } from '../../domain/types';
import { useHashSearch } from '../../lib/hashLocation';
import {
  defaultSortMode,
  latestLogByExercise,
  parseSortMode,
  type SortContext,
  type SortMode,
  sortExercises,
  sortParamName,
  sortReason,
} from '../../rules/exerciseSort';
import {
  type ExerciseFilters,
  filterExercises,
  filtersFromParams,
  filtersToParams,
} from '../../rules/libraryFilters';
import { initialTrainingRoster } from '../../rules/programRosters';
import { Icon } from '../../ui/Icon';
import {
  ExerciseFilterControls,
  SortSelect,
} from '../exercise/ExerciseFilterControls';
import { FavouritesProvider } from '../exercise/FavouriteButton';
import { ResultList, ResultViewSwitch } from './ExerciseResults';
import { SelectionStatus, WorkoutBuilder } from './WorkoutBuilder';

export function ExerciseLibrary() {
  const search = useHashSearch();
  const [, navigate] = useLocation();
  const selected = parseMuscleFilter(search);
  const query = new URLSearchParams(search);
  const training = useLiveQuery(() => getMeta(getDb(), 'training'), []);
  const favourites = useLiveQuery(() => readFavourites(getDb()), []);
  const preferences = isTrainingPreferences(training) ? training : undefined;
  const filters = filtersFromParams(query);
  const inventory = preferences ?? { equipment: defaultEquipment };
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
  const logged = useLiveQuery(
    async () =>
      [...latestLogByExercise(await getDb().setLogs.toArray())] as [
        ExerciseId,
        string,
      ][],
    [],
  );
  const mode = parseSortMode(query.get(sortParamName));
  const filtered = filterExercises(exerciseList, filters, {
    inventory,
    mine,
    favourites,
  });
  const sortContext: SortContext = {
    mode,
    term: filters.term,
    inventory,
    experience: preferences?.experience,
    favourites,
    mine,
    lastLogged: new Map(logged),
  };
  const primary = sortExercises(filtered.primary, sortContext);
  const secondary = sortExercises(filtered.supporting, sortContext);
  const reasonOf = (id: ExerciseId) => sortReason(id, sortContext);
  const noHistory = mode === 'recent' && logged !== undefined && !logged.length;
  const changeSort = (next: SortMode) => {
    const params = new URLSearchParams(search);
    if (next === defaultSortMode) params.delete(sortParamName);
    else params.set(sortParamName, next);
    navigate(`/ovningar${params.size ? `?${params}` : ''}`);
  };
  const changeFilters = (patch: Partial<ExerciseFilters>) => {
    const next = filtersToParams(patch, search);
    navigate(`/ovningar${next.size ? `?${next}` : ''}`, {
      replace: 'term' in patch,
    });
  };
  const till = query.get('till');
  const clearFilters = () => {
    const keep = new URLSearchParams();
    if (till) keep.set('till', till);
    if (mode !== defaultSortMode) keep.set(sortParamName, mode);
    navigate(keep.size ? `/ovningar?${keep}` : '/ovningar');
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
    : filters.regions.length
      ? bodyRegions
          .filter((item) => filters.regions.includes(item.id))
          .map((item) => item.label)
          .join(' och ')
      : undefined;
  const onlyBodyweight =
    preferences &&
    !preferences.weights?.length &&
    !preferences.adjustableWeights?.length;

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
            Du har inga vikter registrerade.{' '}
            <Link
              href="/installningar/utrustning"
              className="font-bold text-accent underline underline-offset-4"
            >
              Lägg till vikter i Min utrustning
            </Link>
          </p>
        ) : null}
        <WorkoutBuilder>
          <SelectionStatus
            resultText={`${count} ${count === 1 ? 'övning' : 'övningar'}${area ? ` för ${area.toLowerCase()}` : ''}`}
          />
          <SortSelect value={mode} onChange={changeSort} idPrefix="library" />
          {noHistory ? (
            <p className="m-0 text-base text-ink-soft">
              Du har inte tränat något än, så övningarna visas i alfabetisk
              ordning.
            </p>
          ) : null}
          <ResultViewSwitch />
          {count === 0 ? (
            <p className="m-0 text-xl">Inga övningar passar filtren.</p>
          ) : null}
          <ResultList
            title={area ? 'Tränar främst' : 'Alla övningar'}
            items={primary}
            id="primary-results"
            inventory={inventory}
            groupByRegion={!filters.term.trim() && !area}
            experience={preferences?.experience}
            reasonOf={reasonOf}
          />
          <ResultList
            title="Hjälper till"
            items={secondary}
            id="secondary-results"
            inventory={inventory}
            experience={preferences?.experience}
            reasonOf={reasonOf}
          />
        </WorkoutBuilder>
      </div>
    </FavouritesProvider>
  );
}
