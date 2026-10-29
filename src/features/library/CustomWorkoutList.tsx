import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { Link } from 'wouter';
import { isTrainingPreferences } from '../../content/programmes';
import {
  type CustomWorkout,
  deleteCustomWorkout,
  readCustomWorkouts,
} from '../../db/customWorkouts';
import { getDb } from '../../db/db';
import { getMeta, listSessions } from '../../db/repo';
import type { TrainingPreferences } from '../../domain/types';
import { estimateWorkoutMinutes } from '../../rules/shortWorkout';
import { buttonClass } from '../../ui/Button';
import { customWorkoutPlan, painLogsShowPain } from '../training/defaultPlan';

/** Delete with an inline confirmation; focus goes to the safe choice first. */
export function DeleteWorkoutButton({
  workout,
  onDeleted,
  label = 'Ta bort',
}: {
  workout: Pick<CustomWorkout, 'id' | 'name'>;
  onDeleted?(): void;
  label?: string;
}) {
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  if (!asking)
    return (
      <>
        <button
          type="button"
          ref={triggerRef}
          aria-label={`${label}: ${workout.name}`}
          className="flex min-h-12 items-center self-start text-left text-base underline"
          onClick={() => {
            setAsking(true);
            setError('');
            requestAnimationFrame(() => cancelRef.current?.focus());
          }}
        >
          {label}
        </button>
        {error ? (
          <p role="alert" className="m-0 text-base font-bold">
            {error}
          </p>
        ) : null}
      </>
    );
  return (
    <fieldset className="m-0 flex w-full min-w-0 flex-col gap-2 border-2 border-ink p-3">
      <legend className="sr-only">Ta bort {workout.name}</legend>
      <p className="m-0 text-base font-bold">
        Ta bort passet? Sparade pass i historiken finns kvar.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          ref={cancelRef}
          className="min-h-12 rounded-md border-[3px] border-ink bg-surface px-4 text-base font-bold"
          onClick={() => {
            setAsking(false);
            requestAnimationFrame(() => triggerRef.current?.focus());
          }}
        >
          Behåll passet
        </button>
        <button
          type="button"
          className="min-h-12 rounded-md border-[3px] border-ink px-4 text-base font-bold underline"
          onClick={async () => {
            try {
              await deleteCustomWorkout(workout.id);
              onDeleted?.();
            } catch {
              setAsking(false);
              setError('Kunde inte ta bort passet. Försök igen.');
            }
          }}
        >
          Ta bort passet
        </button>
      </div>
    </fieldset>
  );
}

function minutesFor(
  workout: CustomWorkout,
  preferences: TrainingPreferences | undefined,
  data: NonNullable<ReturnType<typeof useData>>,
): number | undefined {
  if (!preferences || preferences.programId === 'rehab') return undefined;
  const plan =
    workout.plan ??
    customWorkoutPlan(
      workout.exerciseIds,
      preferences,
      data.sessions,
      data.logs,
      data.painReported,
    );
  return estimateWorkoutMinutes(plan);
}

function useData() {
  return useLiveQuery(async () => {
    const db = getDb();
    return {
      training: await getMeta(db, 'training'),
      saved: readCustomWorkouts(await getMeta(db, 'customWorkouts')),
      sessions: await listSessions(db),
      logs: await db.setLogs.toArray(),
      painReported: painLogsShowPain(await db.painLogs.toArray()),
    };
  }, []);
}

export function CustomWorkoutList({
  headingId,
  alwaysShow = false,
  title = 'Mina pass',
  primaryCreate = false,
  disabled = false,
}: {
  headingId: string;
  /** Heading text. */
  title?: string;
  /** Setup panel: "Skapa nytt pass" as a full primary button link. */
  primaryCreate?: boolean;
  /** Home: heading, empty text and the link to create one, even without passes. */
  alwaysShow?: boolean;
  /** A session is running: the list stays visible but cannot start anything. */
  disabled?: boolean;
}) {
  const data = useData();
  if (!data || (!data.saved.length && !alwaysShow)) return null;
  const preferences = isTrainingPreferences(data.training)
    ? data.training
    : undefined;
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-1 border-t-[3px] border-ink pt-4"
    >
      <h2
        id={headingId}
        className="m-0 font-display text-3xl font-bold leading-none"
      >
        {title}
      </h2>
      {disabled ? (
        <p className="m-0 mt-2 text-base font-bold">Avsluta passet först.</p>
      ) : null}
      {data.saved.length ? null : (
        <p className="m-0 mt-2 text-base">Inga egna pass än.</p>
      )}
      <ul className="m-0 mt-2 flex list-none flex-col p-0">
        {data.saved.map((workout) => {
          const minutes = minutesFor(workout, preferences, data);
          return (
            <li
              key={workout.id}
              className="flex flex-col gap-1 border-t-2 border-edge py-2 first:border-t-0"
            >
              <p className="m-0 break-words text-lg font-bold">
                {workout.name}
              </p>
              <p className="m-0 text-base text-ink-soft">
                {workout.exerciseIds.length} övn
                {minutes !== undefined ? ` · ca ${minutes} min` : ''}
              </p>
              <div className="flex flex-wrap items-center gap-x-4">
                {disabled ? (
                  <span
                    aria-disabled="true"
                    className="flex min-h-12 items-center text-base font-bold opacity-50"
                  >
                    Visa och starta
                  </span>
                ) : (
                  <>
                    <Link
                      href={`/traning/A?workout=${workout.id}`}
                      aria-label={`Visa och starta: ${workout.name}`}
                      className="flex min-h-12 items-center text-base font-bold text-accent underline underline-offset-4"
                    >
                      Visa och starta
                    </Link>
                    <DeleteWorkoutButton workout={workout} />
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {alwaysShow ? (
        <Link
          href="/nytt-pass"
          className={
            primaryCreate
              ? `${buttonClass('primary')} mt-3`
              : 'flex min-h-12 items-center self-start text-base font-bold text-accent underline underline-offset-4'
          }
        >
          {primaryCreate ? 'Skapa nytt pass' : 'Skapa eget pass'}
        </Link>
      ) : null}
    </section>
  );
}
