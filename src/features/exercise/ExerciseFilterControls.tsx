import { useState } from 'react';
import {
  equipmentLabels,
  purposeLabels,
  technicalLevelLabels,
} from '../../content/exerciseMetadata';
import {
  bodyRegions,
  type MuscleGroupId,
  muscleGroups,
} from '../../content/muscles';
import type { ExerciseFilters } from '../../rules/libraryFilters';
import { Icon } from '../../ui/Icon';

export interface ExerciseFilterControlsProps {
  value: ExerciseFilters;
  onChange(patch: Partial<ExerciseFilters>): void;
  /** Resets every filter to the host's defaults. */
  onClear(): void;
  /** The equipment filter the host starts from; changing it counts as active. */
  defaultEquipment: ExerciseFilters['equipment'];
  /** Prefix for element ids, unique per host. */
  idPrefix: string;
  /** Adds "Mitt program" to the purpose list. */
  showMine?: boolean;
  /** Adds the "fits my level" checkbox under "Fler filter". */
  showLevelFit?: boolean;
}

const selectClass =
  'min-h-12 w-full rounded-sm border-2 border-edge bg-surface px-3 text-base text-ink';
const chipClass = (active: boolean) =>
  `inline-flex min-h-12 items-center gap-1.5 rounded-sm border-2 bg-surface px-3 text-base font-bold ${active ? 'border-accent text-accent' : 'border-edge text-ink'}`;

/** Number of active filters behind "Fler filter". */
export function advancedFilterCount(
  value: ExerciseFilters,
  defaultEquipment: ExerciseFilters['equipment'],
): number {
  return (
    Number(Boolean(value.purpose)) +
    Number(Boolean(value.level)) +
    Number(value.equipment !== defaultEquipment) +
    Number(Boolean(value.kind)) +
    Number(Boolean(value.unit)) +
    Number(value.oneSide) +
    Number(value.favouritesOnly)
  );
}

/** Number of active filters of any kind, including search, region and muscle. */
export function activeFilterCount(
  value: ExerciseFilters,
  defaultEquipment: ExerciseFilters['equipment'],
): number {
  return (
    advancedFilterCount(value, defaultEquipment) +
    Number(Boolean(value.term.trim())) +
    Number(Boolean(value.region)) +
    Number(Boolean(value.muscle))
  );
}

export function ExerciseFilterControls({
  value,
  onChange,
  onClear,
  defaultEquipment,
  idPrefix,
  showMine = false,
  showLevelFit = false,
}: ExerciseFilterControlsProps) {
  const [moreOpen, setMoreOpen] = useState(() => Boolean(value.muscle));
  const advanced = advancedFilterCount(value, defaultEquipment);
  const total = activeFilterCount(value, defaultEquipment);
  const noArea = !value.region && !value.muscle;
  const field = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-base font-bold" htmlFor={field('search')}>
          Sök övning
        </label>
        <input
          id={field('search')}
          type="search"
          value={value.term}
          onChange={(event) => onChange({ term: event.target.value })}
          placeholder="Namn, E-nummer eller alias"
          className="min-h-12 w-full rounded-sm border-2 border-edge bg-surface px-3 text-base text-ink placeholder:text-ink-soft"
        />
      </div>

      <fieldset className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0">
        <legend className="mb-2 text-base font-bold">Vad vill du träna?</legend>
        <button
          type="button"
          aria-pressed={noArea}
          onClick={() => onChange({ region: '', muscle: '' })}
          className={chipClass(noArea)}
        >
          {noArea ? <Icon name="check" size={18} /> : null}
          Alla
        </button>
        {bodyRegions.map((region) => {
          const active = value.region === region.id && !value.muscle;
          return (
            <button
              key={region.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ region: region.id, muscle: '' })}
              className={chipClass(active)}
            >
              {active ? <Icon name="check" size={18} /> : null}
              {region.label}
            </button>
          );
        })}
      </fieldset>

      <details
        open={moreOpen}
        onToggle={(event) => setMoreOpen(event.currentTarget.open)}
      >
        <summary className="flex min-h-12 cursor-pointer items-center text-base font-bold underline underline-offset-4">
          Mer specifikt
          {value.muscle ? ` · ${muscleGroups[value.muscle].label}` : ''}
        </summary>
        <fieldset className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0 pt-2">
          <legend className="sr-only">Välj enskild muskelgrupp</legend>
          {(Object.keys(muscleGroups) as MuscleGroupId[]).map((muscle) => (
            <button
              key={muscle}
              type="button"
              aria-pressed={value.muscle === muscle}
              onClick={() => onChange({ muscle, region: '' })}
              className={chipClass(value.muscle === muscle)}
            >
              {value.muscle === muscle ? <Icon name="check" size={18} /> : null}
              {muscleGroups[muscle].label}
            </button>
          ))}
        </fieldset>
      </details>

      <details>
        <summary className="flex min-h-12 cursor-pointer items-center text-base font-bold underline underline-offset-4">
          Fler filter{advanced ? ` · ${advanced} aktiva` : ''}
        </summary>
        <div className="space-y-2 py-2">
          <label
            className="block text-base font-bold"
            htmlFor={field('purpose')}
          >
            Träningssyfte
          </label>
          <select
            id={field('purpose')}
            value={value.purpose}
            onChange={(event) =>
              onChange({
                purpose: event.target.value as ExerciseFilters['purpose'],
              })
            }
            className={selectClass}
          >
            <option value="">Alla syften</option>
            {Object.entries(purposeLabels).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
            {showMine ? <option value="mine">Mitt program</option> : null}
          </select>
          <label className="block text-base font-bold" htmlFor={field('level')}>
            Teknisk svårighetsgrad
          </label>
          <select
            id={field('level')}
            value={value.level}
            onChange={(event) =>
              onChange({
                level: event.target.value as ExerciseFilters['level'],
              })
            }
            className={selectClass}
          >
            <option value="">Alla nivåer</option>
            {Object.entries(technicalLevelLabels).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <label
            className="block text-base font-bold"
            htmlFor={field('equipment')}
          >
            Utrustning
          </label>
          <select
            id={field('equipment')}
            value={value.equipment}
            onChange={(event) =>
              onChange({
                equipment: event.target.value as ExerciseFilters['equipment'],
              })
            }
            className={selectClass}
          >
            <option value="">Alla redskap</option>
            <option value="available">Min tillgängliga utrustning</option>
            {Object.entries(equipmentLabels).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <label className="block text-base font-bold" htmlFor={field('kind')}>
            Typ av övning
          </label>
          <select
            id={field('kind')}
            value={value.kind}
            onChange={(event) =>
              onChange({ kind: event.target.value as ExerciseFilters['kind'] })
            }
            className={selectClass}
          >
            <option value="">Styrka och rörlighet</option>
            <option value="strength">Styrka</option>
            <option value="mobility">Rörlighet</option>
          </select>
          <label className="block text-base font-bold" htmlFor={field('unit')}>
            Utförande
          </label>
          <select
            id={field('unit')}
            value={value.unit}
            onChange={(event) =>
              onChange({ unit: event.target.value as ExerciseFilters['unit'] })
            }
            className={selectClass}
          >
            <option value="">Repetitioner och tid</option>
            <option value="reps">Repetitioner</option>
            <option value="time">På tid</option>
          </select>
          {showLevelFit ? (
            <label className="flex min-h-12 items-center gap-3 text-base font-bold">
              <input
                type="checkbox"
                checked={value.levelFit}
                onChange={(event) =>
                  onChange({ levelFit: event.target.checked })
                }
                className="h-6 w-6"
              />
              Bara övningar som passar min vana
            </label>
          ) : null}
          <label className="flex min-h-12 items-center gap-3 text-base font-bold">
            <input
              type="checkbox"
              checked={value.oneSide}
              onChange={(event) => onChange({ oneSide: event.target.checked })}
              className="h-6 w-6"
            />
            Bara övningar en sida i taget
          </label>
          <label className="flex min-h-12 items-center gap-3 text-base font-bold">
            <input
              type="checkbox"
              checked={value.favouritesOnly}
              onChange={(event) =>
                onChange({ favouritesOnly: event.target.checked })
              }
              className="h-6 w-6"
            />
            Bara mina favoriter
          </label>
        </div>
      </details>
      {total > 0 ? (
        <button
          type="button"
          onClick={onClear}
          className="min-h-12 text-base font-bold text-accent underline underline-offset-4"
        >
          Rensa filter
        </button>
      ) : null}
    </div>
  );
}
