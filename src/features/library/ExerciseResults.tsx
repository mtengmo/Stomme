import { type ReactNode, useEffect, useRef, useSyncExternalStore } from 'react';
import { Link } from 'wouter';
import {
  exerciseMetadata,
  technicalLevelLabels,
} from '../../content/exerciseMetadata';
import { exerciseReferences } from '../../content/exerciseReferences';
import { bodyRegions, primaryMuscleLabel } from '../../content/muscles';
import { templates } from '../../content/templates';
import type { Exercise, TrainingPreferences } from '../../domain/types';
import { Figure, FigureFrame, movementPose } from '../../figures/Figure';
import type { Inventory } from '../../rules/equipment';
import {
  missingEquipment,
  requiresGoodTechnique,
} from '../../rules/libraryFilters';
import { regionOfExercise } from '../../rules/selectionSummary';
import { Icon } from '../../ui/Icon';
import { FavouriteButton } from '../exercise/FavouriteButton';
import { useSelection } from './WorkoutBuilder';

type ResultView = 'compact' | 'detailed';
const viewKey = 'stomme.library-view';
const viewListeners = new Set<() => void>();

function readView(): ResultView {
  try {
    return localStorage.getItem(viewKey) === 'detailed'
      ? 'detailed'
      : 'compact';
  } catch {
    return 'compact';
  }
}

function useResultView(): [ResultView, (view: ResultView) => void] {
  const view = useSyncExternalStore(
    (listener) => {
      viewListeners.add(listener);
      return () => viewListeners.delete(listener);
    },
    readView,
    () => 'compact' as const,
  );
  return [
    view,
    (next) => {
      try {
        localStorage.setItem(viewKey, next);
      } catch {
        /* The choice then lasts only until the page is reloaded. */
      }
      for (const listener of viewListeners) listener();
    },
  ];
}

/** "Kompakt / Detaljerad", remembered per viewer in localStorage. */
export function ResultViewSwitch() {
  const [view, setView] = useResultView();
  return (
    <fieldset className="m-0 flex min-w-0 items-center gap-2 border-0 p-0">
      <legend className="sr-only">Visning av övningar</legend>
      {(['compact', 'detailed'] as const).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={view === value}
          onClick={() => setView(value)}
          className={`inline-flex min-h-12 items-center rounded-sm border-2 bg-surface px-3 text-base font-bold ${view === value ? 'border-accent text-accent' : 'border-edge text-ink'}`}
        >
          {value === 'compact' ? 'Kompakt' : 'Detaljerad'}
        </button>
      ))}
    </fieldset>
  );
}

function equipment(exercise: Exercise): string {
  return exerciseMetadata[exercise.id].variants
    .map((variant) => variant.label)
    .join(' / ');
}

function levels(exercise: Exercise): string {
  return [
    ...new Set(
      exerciseMetadata[exercise.id].variants.map(
        (variant) => technicalLevelLabels[variant.technicalLevel],
      ),
    ),
  ].join(' / ');
}

function regionLabel(exercise: Exercise): string {
  const region = regionOfExercise(exercise.id);
  return (
    bodyRegions.find((item) => item.id === region)?.label ??
    'Rörlighet och position'
  );
}

function SelectionNote({ exercise }: { exercise: Exercise }) {
  const { reason, ids } = useSelection();
  const text = reason(exercise.id);
  if (!text || ids.includes(exercise.id)) return null;
  return <p className="m-0 mt-1 text-base font-bold">{text}</p>;
}

/** A static pose that plays the movement on tap; pauses when scrolled away. */
function Thumb({
  exercise,
  size,
}: {
  exercise: Exercise;
  size: 'small' | 'large';
}) {
  const { playing, play } = useSelection();
  const ref = useRef<HTMLDivElement>(null);
  const active = playing === exercise.id;
  useEffect(() => {
    if (!active || !ref.current || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) play(null);
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [active, play]);
  const small = size === 'small';
  return (
    <div ref={ref} className="shrink-0">
      <button
        type="button"
        aria-label={`${active ? 'Pausa' : 'Visa'} rörelsen: ${exercise.name}`}
        aria-pressed={active}
        onClick={() => play(active ? null : exercise.id)}
        className={`flex shrink-0 flex-col items-center rounded-sm border-2 border-edge text-base font-bold ${small ? 'h-14 w-14 justify-center p-0.5' : 'w-28 p-1'}`}
      >
        <span
          className={`block w-full ${small ? 'h-full' : 'h-24'}`}
          aria-hidden="true"
        >
          {active ? (
            <Figure
              exerciseId={exercise.id}
              working={exercise.perSide ? 'right' : null}
              stillOnly
            />
          ) : (
            <FigureFrame
              exerciseId={exercise.id}
              pose={movementPose(exercise.id, 0.5)}
              working={exercise.perSide ? 'right' : null}
            />
          )}
        </span>
        {small ? null : active ? 'Pausa' : 'Visa rörelse'}
      </button>
    </div>
  );
}

function PickToggle({
  exercise,
  wide,
}: {
  exercise: Exercise;
  wide?: boolean;
}) {
  const { ids, toggle, reason, max } = useSelection();
  const picked = ids.includes(exercise.id);
  return (
    <button
      type="button"
      aria-label={`Välj: ${exercise.name}`}
      aria-pressed={picked}
      disabled={!picked && (ids.length >= max || Boolean(reason(exercise.id)))}
      onClick={() => toggle(exercise.id)}
      className={`flex min-h-12 shrink-0 items-center justify-center rounded-md border-[3px] text-base font-bold disabled:opacity-50 ${wide ? 'w-28 gap-2 px-3' : 'min-w-[4.75rem] gap-1 px-2'} ${picked ? 'border-accent bg-surface-tint text-accent' : 'border-edge bg-surface text-ink'}`}
    >
      <Icon name={picked ? 'check' : 'plus'} size={18} className="shrink-0" />
      {picked ? 'Vald' : 'Välj'}
    </button>
  );
}

interface RowProps {
  /** Under a region header the region is not repeated in the meta line. */
  hideRegion?: boolean;
  exercise: Exercise;
  inventory: Inventory;
  experience?: TrainingPreferences['experience'];
}

function CompactRow({ exercise, inventory, experience, hideRegion }: RowProps) {
  const missing = missingEquipment(exercise.id, inventory);
  const meta = [
    hideRegion ? '' : regionLabel(exercise),
    missing.length
      ? `Saknar ${missing.join(', ').toLowerCase()}`
      : equipment(exercise),
    levels(exercise),
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <li className="flex items-center gap-3 border-t-2 border-edge py-2">
      <Thumb exercise={exercise} size="small" />
      <Link
        href={`/ovning/${exercise.id}`}
        aria-label={exercise.name}
        aria-describedby={`meta-${exercise.id}`}
        className="flex min-h-12 min-w-0 flex-1 flex-col justify-center text-ink"
      >
        <span className="line-clamp-2 break-words text-base leading-snug font-bold">
          {exercise.name}
        </span>
        <span
          id={`meta-${exercise.id}`}
          className="truncate text-base text-ink-soft"
        >
          {meta}
        </span>
        {experience && requiresGoodTechnique(exercise.id, experience) ? (
          <span className="text-base font-bold">
            Kräver god teknik. Börja med lätt vikt.
          </span>
        ) : null}
        <SelectionNote exercise={exercise} />
      </Link>
      <PickToggle exercise={exercise} />
    </li>
  );
}

function DetailedRow({ exercise, inventory, experience }: RowProps) {
  const missing = missingEquipment(exercise.id, inventory);
  const membership = Object.values(templates).filter((template) =>
    template.items.some((item) => item.exerciseId === exercise.id),
  );
  return (
    <li className="grid grid-cols-[7rem_minmax(0,1fr)] items-start gap-4 border-t-2 border-edge py-4">
      <div className="flex flex-col items-start gap-2">
        <Thumb exercise={exercise} size="large" />
        <PickToggle exercise={exercise} wide />
      </div>
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
        {experience && requiresGoodTechnique(exercise.id, experience) ? (
          <p className="m-0 mt-1 text-base font-bold">
            Kräver god teknik. Börja med lätt vikt.
          </p>
        ) : null}
        <SelectionNote exercise={exercise} />
        <p className="m-0 mt-1 text-base text-ink-soft">
          Teknisk svårighetsgrad: {levels(exercise)} ·{' '}
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

export function ResultList({
  title,
  items,
  id,
  inventory,
  experience,
  groupByRegion = false,
}: {
  title: string;
  items: readonly Exercise[];
  id: string;
  inventory: Inventory;
  experience?: TrainingPreferences['experience'];
  /** Region headers between the rows (compact view, no search text). */
  groupByRegion?: boolean;
}) {
  const [view] = useResultView();
  if (!items.length) return null;
  const Row = view === 'compact' ? CompactRow : DetailedRow;
  const grouped = groupByRegion && view === 'compact';
  const row = (exercise: Exercise) => (
    <Row
      key={exercise.id}
      hideRegion={grouped}
      exercise={exercise}
      inventory={inventory}
      experience={experience}
    />
  );
  let body: ReactNode;
  if (grouped) {
    const groups: { key: string; label: string; items: Exercise[] }[] = [
      ...bodyRegions.map((region) => ({
        key: region.id as string,
        label: region.label,
        items: [] as Exercise[],
      })),
      { key: 'other', label: 'Rörlighet och position', items: [] },
    ];
    for (const exercise of items) {
      const key = regionOfExercise(exercise.id) ?? 'other';
      groups.find((group) => group.key === key)?.items.push(exercise);
    }
    body = groups
      .filter((group) => group.items.length)
      .map((group) => (
        <li key={group.key} className="list-none">
          <h3 className="sticky top-0 z-[1] m-0 bg-surface py-2 text-xl font-bold">
            {group.label}
          </h3>
          <ul className="m-0 list-none p-0">{group.items.map(row)}</ul>
        </li>
      ));
  } else body = items.map(row);
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="m-0 mb-3 text-3xl font-bold">
        {title}
      </h2>
      <ul className="m-0 list-none p-0">{body}</ul>
    </section>
  );
}
