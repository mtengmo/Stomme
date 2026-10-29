import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Link } from 'wouter';
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
  exerciseMuscles,
  muscleGroups,
  primaryMuscleLabel,
} from '../../content/muscles';
import { getDb } from '../../db/db';
import { readFavourites, toggleFavourite } from '../../db/favourites';
import type { ExerciseId, TrainingPreferences } from '../../domain/types';
import { FigureFrame, movementPose } from '../../figures/Figure';
import { equipmentFits } from '../../rules/equipment';
import { movementSlots } from '../../rules/levelPolicy';
import {
  type ExerciseFilters,
  emptyExerciseFilters,
  filterExercises,
} from '../../rules/libraryFilters';
import { Icon } from '../../ui/Icon';
import {
  activeFilterCount,
  ExerciseFilterControls,
} from '../exercise/ExerciseFilterControls';

interface PickerState {
  filters: ExerciseFilters;
  broadened: boolean;
}

const pickerDefaultFilters: ExerciseFilters = {
  ...emptyExerciseFilters,
  equipment: 'available',
};
const defaultState: PickerState = {
  filters: pickerDefaultFilters,
  broadened: false,
};

function oneOf(value: unknown, allowed: readonly string[]): boolean {
  return typeof value === 'string' && allowed.includes(value);
}

function isPickerState(value: unknown): value is PickerState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const state = value as Record<string, unknown>;
  const f = state.filters as Record<string, unknown> | undefined;
  return (
    !!f &&
    typeof f === 'object' &&
    typeof f.term === 'string' &&
    oneOf(f.region, ['', ...bodyRegions.map((region) => region.id)]) &&
    oneOf(f.muscle, ['', ...Object.keys(muscleGroups)]) &&
    oneOf(f.purpose, ['', ...Object.keys(purposeLabels)]) &&
    oneOf(f.level, ['', ...Object.keys(technicalLevelLabels)]) &&
    oneOf(f.equipment, ['', 'available', ...Object.keys(equipmentLabels)]) &&
    oneOf(f.kind, ['', 'strength', 'mobility']) &&
    oneOf(f.unit, ['', 'reps', 'time']) &&
    typeof f.oneSide === 'boolean' &&
    typeof f.favouritesOnly === 'boolean' &&
    typeof state.broadened === 'boolean'
  );
}

function readPickerState(key: string): PickerState {
  try {
    const raw = window.sessionStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return isPickerState(parsed) ? parsed : defaultState;
  } catch {
    return defaultState;
  }
}

function writePickerState(key: string, state: PickerState) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(state));
  } catch {
    // The picker remains usable when session storage is unavailable.
  }
}

function hasAvailableEquipment(
  id: ExerciseId,
  preferences: TrainingPreferences,
): boolean {
  return exerciseMetadata[id].variants.some((variant) =>
    equipmentFits(variant.equipment, preferences.equipment),
  );
}

function supportingMuscleLabel(id: ExerciseId): string {
  return exerciseMuscles[id].secondary
    .map((muscle) => muscleGroups[muscle].label)
    .join(', ');
}

function equipmentDescription(id: ExerciseId): string {
  const labels = exerciseMetadata[id].variants.map((variant) => variant.label);
  return [...new Set(labels)].join(' / ');
}

export interface ExercisePickerProps {
  preferences: TrainingPreferences;
  selectedIds: ExerciseId[];
  replacingId?: ExerciseId;
  allowedIds?: readonly ExerciseId[];
  onChoose(id: ExerciseId): void;
  onCancel(): void;
  /** Stable preview/draft key; preserves filters across guide navigation. */
  pickerKey?: string;
  /** Use level 1 when the chooser is the route's main content. */
  headingLevel?: 1 | 2;
}

export function ExercisePicker({
  preferences,
  selectedIds,
  replacingId,
  allowedIds,
  onChoose,
  onCancel,
  pickerKey,
  headingLevel = 2,
}: ExercisePickerProps) {
  const storageKey = `stomme.exercise-picker.${pickerKey ?? `${preferences.programId}.${replacingId ?? 'add'}`}`;
  const [state, setState] = useState<PickerState>(() =>
    typeof window === 'undefined' ? defaultState : readPickerState(storageKey),
  );
  const favourites = useLiveQuery(() => readFavourites(getDb()), []);

  function updateState(update: Partial<PickerState>) {
    const next = { ...state, ...update };
    setState(next);
    writePickerState(storageKey, next);
  }
  function updateFilters(patch: Partial<ExerciseFilters>) {
    updateState({ filters: { ...state.filters, ...patch } });
  }

  const filters = state.filters;
  const slot = replacingId ? movementSlots[replacingId] : undefined;
  const allowed = allowedIds ? new Set(allowedIds) : undefined;
  const candidates = useMemo(() => {
    if (replacingId && !state.broadened) {
      if (!slot) return [];
      return exerciseList.filter(
        (exercise) =>
          exercise.id !== replacingId && movementSlots[exercise.id] === slot,
      );
    }
    return exerciseList;
  }, [replacingId, slot, state.broadened]);

  const scopedCandidates = candidates.filter(
    (exercise) => !allowed || allowed.has(exercise.id),
  );
  const availableCandidates = scopedCandidates.filter((exercise) =>
    hasAvailableEquipment(exercise.id, preferences),
  );
  const { primary, supporting } = filterExercises(
    availableCandidates,
    filters,
    { inventory: preferences.equipment, favourites },
  );
  const filtered = [...primary, ...supporting];
  const areaActive = Boolean(filters.region || filters.muscle);
  const activeCount = activeFilterCount(filters, 'available');
  const noCompatibleAlternatives = Boolean(
    replacingId && !state.broadened && candidates.length === 0,
  );
  const noAllowedExercises = scopedCandidates.length === 0;
  const noEquipmentMatches =
    scopedCandidates.length > 0 && availableCandidates.length === 0;
  const Heading = headingLevel === 1 ? 'h1' : 'h2';

  async function toggleFavorite(id: ExerciseId) {
    try {
      await toggleFavourite(getDb(), id);
    } catch {
      // The list remains available; its live query will continue showing stored state.
    }
  }

  function resetFilters() {
    updateState({ filters: pickerDefaultFilters });
    document.getElementById('exercise-picker-search')?.focus();
  }

  function renderRow(exercise: (typeof exerciseList)[number]) {
    const alreadySelected = selectedIds.includes(exercise.id);
    const current = exercise.id === replacingId;
    const disabled = alreadySelected;
    const primaryLabel = primaryMuscleLabel(exercise.id);
    const secondaryLabel = supportingMuscleLabel(exercise.id);
    return (
      <li
        key={exercise.id}
        className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-3 border-t-2 border-edge py-4"
      >
        <div className="h-24 w-[5.5rem] shrink-0" aria-hidden="true">
          <FigureFrame
            exerciseId={exercise.id}
            pose={movementPose(exercise.id, 0.5)}
            working={exercise.perSide ? 'right' : null}
          />
        </div>
        <div className="min-w-0">
          <div className="flex min-h-12 items-center justify-between gap-2">
            <h3 className="m-0 min-w-0 flex-1 break-words text-lg font-bold leading-snug">
              <span className="mr-2 text-ink-soft">
                {exerciseReferences[exercise.id]}
              </span>
              {exercise.name}
            </h3>
            <Link
              href={`/ovning/${exercise.id}`}
              aria-label={`Visa instruktion: ${exercise.name}`}
              className="inline-flex min-h-12 shrink-0 items-center gap-1 text-base font-bold text-accent underline underline-offset-4"
            >
              Guide <Icon name="back" size={18} className="rotate-180" />
            </Link>
          </div>
          <p className="m-0 mt-1 text-base">
            {primaryLabel ? (
              <>
                <strong>Tränar främst:</strong> {primaryLabel}
              </>
            ) : (
              'Rörlighet och position'
            )}
            {secondaryLabel ? (
              <>
                {' '}
                · <strong>Stödjer:</strong> {secondaryLabel}
              </>
            ) : null}
          </p>
          <p className="m-0 mt-1 text-base text-ink-soft">
            Utrustning: {equipmentDescription(exercise.id)}
          </p>
          <button
            type="button"
            aria-pressed={favourites?.includes(exercise.id) ?? false}
            disabled={favourites === undefined}
            onClick={() => void toggleFavorite(exercise.id)}
            className="mt-1 inline-flex min-h-12 items-center gap-2 text-base font-bold text-ink underline underline-offset-4 disabled:opacity-50"
          >
            {favourites?.includes(exercise.id) ? 'Ta bort favorit' : 'Favorit'}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChoose(exercise.id)}
            className="mt-2 flex min-h-12 w-full items-center justify-center rounded-md border-[3px] border-ink bg-surface px-4 text-base font-bold text-ink disabled:border-edge disabled:bg-surface disabled:text-ink-soft"
          >
            {current
              ? 'Nuvarande övning'
              : alreadySelected
                ? 'Redan i passet'
                : replacingId
                  ? 'Byt till övningen'
                  : 'Lägg till övningen'}
          </button>
        </div>
      </li>
    );
  }

  function renderGroup(items: typeof filtered, title?: string) {
    if (!items.length) return null;
    return (
      <section>
        {title ? <h3 className="m-0 mb-2 text-xl font-bold">{title}</h3> : null}
        <ul className="m-0 list-none p-0">{items.map(renderRow)}</ul>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="exercise-picker-heading"
      className="space-y-4 border-t-[3px] border-ink pt-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <Heading
            id="exercise-picker-heading"
            className="m-0 font-display text-3xl font-bold leading-none"
          >
            {replacingId ? 'Byt övning' : 'Lägg till övning'}
          </Heading>
          {allowedIds ? (
            <p className="m-0 mt-2 text-base text-ink-soft">
              Visar bara övningar som ingår i den tillåtna samlingen.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-12 px-2 text-base font-bold text-accent underline underline-offset-4"
        >
          Avbryt
        </button>
      </div>

      <ExerciseFilterControls
        value={filters}
        onChange={updateFilters}
        onClear={() => updateState({ filters: pickerDefaultFilters })}
        defaultEquipment="available"
        idPrefix="exercise-picker"
      />

      {replacingId ? (
        <div className="space-y-2">
          {!state.broadened ? (
            <>
              <p className="m-0 text-base text-ink-soft">
                {noCompatibleAlternatives
                  ? 'Det finns inga granskade alternativ för samma rörelsemönster.'
                  : 'Visar granskade alternativ med samma rörelsemönster först.'}
              </p>
              <button
                type="button"
                onClick={() => updateState({ broadened: true })}
                className="min-h-12 font-bold text-accent underline underline-offset-4"
              >
                Visa alla övningar
              </button>
            </>
          ) : (
            <>
              <p className="m-0 text-base text-ink-soft">
                Alla övningar visas. Välj en som passar rörelsemönstret i
                passet.
              </p>
              <button
                type="button"
                onClick={() => updateState({ broadened: false })}
                className="min-h-12 font-bold text-accent underline underline-offset-4"
              >
                Visa granskade alternativ
              </button>
            </>
          )}
        </div>
      ) : null}

      <p role="status" className="m-0 text-base text-ink-soft">
        {filtered.length} {filtered.length === 1 ? 'övning' : 'övningar'}
      </p>
      {!filtered.length ? (
        <p className="m-0 text-base">
          {noCompatibleAlternatives
            ? 'Visa alla övningar för fler val.'
            : noAllowedExercises
              ? 'Inga övningar ingår i den tillåtna samlingen.'
              : noEquipmentMatches
                ? 'Inga övningar i samlingen passar den registrerade utrustningen.'
                : filters.favouritesOnly && favourites === undefined
                  ? 'Läser in dina favoriter…'
                  : 'Inga övningar passar filtren.'}
          {activeCount > 0 && !noCompatibleAlternatives ? (
            <>
              {' '}
              <button
                type="button"
                onClick={resetFilters}
                className="min-h-12 font-bold text-accent underline underline-offset-4"
              >
                Rensa filter
              </button>
            </>
          ) : null}
        </p>
      ) : (
        <div className="space-y-4">
          {renderGroup(primary, areaActive ? 'Tränar främst' : undefined)}
          {renderGroup(supporting, 'Stödjer')}
        </div>
      )}
    </section>
  );
}
