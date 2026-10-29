import { useLiveQuery } from 'dexie-react-hooks';
import { exerciseList } from '../../content/exercises';
import { bodyRegions, muscleGroups } from '../../content/muscles';
import { getDb } from '../../db/db';
import { readFavourites } from '../../db/favourites';
import type {
  ExerciseId,
  PlannedExercise,
  TrainingPreferences,
} from '../../domain/types';
import { filterExercises } from '../../rules/libraryFilters';
import { ExerciseFilterControls } from '../exercise/ExerciseFilterControls';
import { FavouritesProvider } from '../exercise/FavouriteButton';
import { ResultList, ResultViewSwitch } from '../library/ExerciseResults';
import { SelectionStatus, WorkoutBuilder } from '../library/WorkoutBuilder';
import { pickFiltersFrom, pickFiltersPatch } from './pickFilters';

export interface CustomPickerProps {
  /** The setup the doses are built from: the draft in the start flow, else the saved one. */
  preferences: TrainingPreferences;
  /** sessionStorage key for the picks. */
  storageKey: string;
  filters: string;
  onFiltersChange(next: string): void;
  onCreate(
    ids: ExerciseId[],
    plan: PlannedExercise[] | undefined,
  ): Promise<void> | void;
  idPrefix: string;
}

/** Search, filter and pick exercises for a new workout; the host saves. */
export function CustomPicker({
  preferences,
  storageKey,
  filters: query,
  onFiltersChange,
  onCreate,
  idPrefix,
}: CustomPickerProps) {
  const favourites = useLiveQuery(() => readFavourites(getDb()), []);
  // Rehab never uses the strength level, so level fit is not offered there.
  const rehab = preferences.programId === 'rehab';
  const filters = pickFiltersFrom(query, !rehab);
  const { primary, supporting } = filterExercises(exerciseList, filters, {
    inventory: preferences.equipment,
    favourites,
    experience: preferences.experience,
  });
  const count = primary.length + supporting.length;
  const area = filters.muscle
    ? muscleGroups[filters.muscle].label
    : filters.region
      ? bodyRegions.find((item) => item.id === filters.region)?.label
      : undefined;
  return (
    <FavouritesProvider>
      <WorkoutBuilder
        preferences={preferences}
        storageKey={storageKey}
        showSaved={false}
        alwaysShowBar
        onCreate={onCreate}
      >
        <SelectionStatus
          resultText={`${count} ${count === 1 ? 'övning' : 'övningar'}${area ? ` för ${area.toLowerCase()}` : ''}`}
        />
        <ExerciseFilterControls
          value={filters}
          onChange={(patch) => onFiltersChange(pickFiltersPatch(query, patch))}
          onClear={() => onFiltersChange('')}
          defaultEquipment="available"
          idPrefix={idPrefix}
          showLevelFit={!rehab}
          defaultLevelFit={!rehab}
          regionLegend="Kroppsdel"
        />
        <ResultViewSwitch />
        {count === 0 ? (
          <p className="m-0 text-xl">Inga övningar passar filtren.</p>
        ) : null}
        <ResultList
          title={area ? 'Tränar främst' : 'Alla övningar'}
          items={primary}
          id={`${idPrefix}-primary`}
          inventory={preferences.equipment}
          groupByRegion={!filters.term.trim() && !area}
          experience={preferences.experience}
        />
        <ResultList
          title="Hjälper till"
          items={supporting}
          id={`${idPrefix}-secondary`}
          inventory={preferences.equipment}
          experience={preferences.experience}
        />
      </WorkoutBuilder>
    </FavouritesProvider>
  );
}
