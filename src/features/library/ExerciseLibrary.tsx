import { useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { exerciseList } from '../../content/exercises';
import {
  exerciseMuscles,
  type MuscleGroupId,
  muscleFilterHref,
  muscleGroups,
  parseMuscleFilter,
  primaryMuscleLabel,
} from '../../content/muscles';
import { templates } from '../../content/templates';
import type { Exercise, ExerciseId } from '../../domain/types';
import { useHashSearch } from '../../lib/hashLocation';
import { Icon } from '../../ui/Icon';

const apparatus: Partial<Record<ExerciseId, string>> = {
  'goblet-chair-squat': 'Stol',
  'step-up': 'Steg 20–30 cm',
  'split-squat': 'Vägg eller stol som stöd',
  'single-leg-calf-raise': 'Vägg som stöd',
  'wall-sit': 'Vägg',
};

function equipment(exercise: Exercise): string {
  const loads = exercise.loadLadder.map((load) =>
    load.label.startsWith('2×') ? `${load.label} hantlar` : load.label,
  );
  return [apparatus[exercise.id], loads.join(' / ')]
    .filter(Boolean)
    .join(' · ');
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
        Tränar främst: {primaryMuscleLabel(exercise.id)}
      </p>
      <p className="m-0 mt-1 text-base text-ink-soft">
        Utrustning: {equipment(exercise)}
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
  const invalid = query.has('muskel') && selected === null;

  useEffect(() => {
    if (invalid) navigate('/ovningar', { replace: true });
  }, [invalid, navigate]);

  const primary = selected
    ? exerciseList.filter((exercise) =>
        exerciseMuscles[exercise.id].primary.includes(selected),
      )
    : exerciseList;
  const secondary = selected
    ? exerciseList.filter((exercise) =>
        exerciseMuscles[exercise.id].secondary.includes(selected),
      )
    : [];
  const count = primary.length + secondary.length;
  const filters: (MuscleGroupId | null)[] = [
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
          Ben, höft och bål för löpning. Här finns programmets alla övningar.
        </p>
      </header>
      <fieldset
        className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0"
        aria-label="Filtrera på muskelgrupp"
      >
        {filters.map((group) => {
          const active = group === selected;
          return (
            <button
              key={group ?? 'all'}
              type="button"
              aria-pressed={active}
              onClick={() =>
                navigate(group ? muscleFilterHref(group) : '/ovningar')
              }
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
          Inga övningar för den här muskelgruppen. Välj en annan eller Alla.
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
