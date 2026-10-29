import { useLiveQuery } from 'dexie-react-hooks';
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Link, useLocation } from 'wouter';
import { exercises } from '../../content/exercises';
import { kneeRehabExercises } from '../../content/kneeRehab';
import { isTrainingPreferences, rehabGroup } from '../../content/programmes';
import {
  appendToCustomWorkout,
  createCustomWorkout,
  maxCustomWorkouts,
  maxWorkoutExercises,
  readCustomWorkouts,
} from '../../db/customWorkouts';
import { getDb } from '../../db/db';
import { getMeta, listSessions } from '../../db/repo';
import type {
  ExerciseId,
  PlannedExercise,
  TrainingPreferences,
} from '../../domain/types';
import { useHashSearch } from '../../lib/hashLocation';
import {
  type SelectionSummary,
  selectionSummary,
  selectionSummaryText,
} from '../../rules/selectionSummary';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { customWorkoutPlan, painLogsShowPain } from '../training/defaultPlan';
import { CustomWorkoutList } from './CustomWorkoutList';

/**
 * The preview keeps an unsaved draft per tab and prefers it over the saved
 * workout. Added exercises must reach that draft too, or they would not show.
 */
function addToPreviewDraft(workoutId: string, added: PlannedExercise[]) {
  try {
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (
        !key?.startsWith('stomme.training-draft.') ||
        !key.endsWith(`.${workoutId}`)
      )
        continue;
      const draft: unknown = JSON.parse(sessionStorage.getItem(key) ?? 'null');
      if (!Array.isArray(draft)) continue;
      const present = new Set(draft.map((item) => item?.exerciseId));
      sessionStorage.setItem(
        key,
        JSON.stringify(
          [
            ...draft,
            ...added.filter((item) => !present.has(item.exerciseId)),
          ].slice(0, maxWorkoutExercises),
        ),
      );
    }
  } catch {
    /* Without the draft the saved workout is shown. */
  }
}

interface SelectionValue {
  ids: ExerciseId[];
  toggle(id: ExerciseId): void;
  /** Why an exercise cannot be picked, if it cannot. */
  reason(id: ExerciseId): string | undefined;
  max: number;
  playing: ExerciseId | null;
  play(id: ExerciseId | null): void;
  summary: SelectionSummary;
  announcement: string;
  alwaysShowBar: boolean;
}

const Selection = createContext<SelectionValue>({
  ids: [],
  toggle: () => {},
  reason: () => undefined,
  max: maxWorkoutExercises,
  playing: null,
  play: () => {},
  summary: { count: 0, regions: [] },
  announcement: '',
  alwaysShowBar: false,
});

export function useSelection(): SelectionValue {
  return useContext(Selection);
}

/**
 * The one live status region: count, split per region and time estimate while
 * picking, otherwise the host's result text.
 */
export function SelectionStatus({ resultText }: { resultText: string }) {
  const { summary, max, announcement, alwaysShowBar, ids } =
    useContext(Selection);
  if (!ids.length && !alwaysShowBar)
    return (
      <p role="status" className="m-0 text-base text-ink-soft">
        {resultText}
      </p>
    );
  const text = selectionSummaryText(summary, max);
  return (
    <div
      role="status"
      className="m-0 flex flex-col gap-1 border-t-[3px] border-ink pt-2 text-base"
    >
      <p className="m-0 text-xl font-bold">
        <span>{text.head}</span>
        {text.minutes ? (
          <>
            {' · '}
            <span className="count">{text.minutes}</span>
          </>
        ) : null}
      </p>
      {text.regions ? <p className="m-0 count">{text.regions}</p> : null}
      <p className="m-0 text-ink-soft">{resultText}</p>
      {announcement ? <span className="sr-only">{announcement}</span> : null}
    </div>
  );
}

export interface WorkoutBuilderProps {
  children: ReactNode;
  /** Used instead of the saved setup (start flow, before anything is saved). */
  preferences?: TrainingPreferences;
  /** sessionStorage key for the picks; one per host. */
  storageKey?: string;
  /** Show the saved passes above the list. Default true. */
  showSaved?: boolean;
  /** Keep the bar visible with a disabled "Skapa pass" when nothing is picked. */
  alwaysShowBar?: boolean;
  /** Replaces the default "create a custom workout" action. */
  onCreate?(
    ids: ExerciseId[],
    plan: PlannedExercise[] | undefined,
  ): Promise<void> | void;
}

export function WorkoutBuilder({
  children,
  preferences: preferencesProp,
  storageKey = 'stomme.library-selection',
  showSaved = true,
  alwaysShowBar = false,
  onCreate,
}: WorkoutBuilderProps) {
  const [, navigate] = useLocation();
  const till = new URLSearchParams(useHashSearch()).get('till');
  const [ids, setIds] = useState<ExerciseId[]>(() => {
    try {
      const value = JSON.parse(sessionStorage.getItem(storageKey) ?? '[]');
      return Array.isArray(value)
        ? [
            ...new Set<ExerciseId>(
              value.filter((id) => Object.hasOwn(exercises, id)),
            ),
          ].slice(0, maxWorkoutExercises)
        : [];
    } catch {
      return [];
    }
  });
  const [playing, play] = useState<ExerciseId | null>(null);
  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const data = useLiveQuery(async () => {
    const db = getDb();
    return {
      training: await getMeta(db, 'training'),
      saved: readCustomWorkouts(await getMeta(db, 'customWorkouts')),
      sessions: await listSessions(db),
      logs: await db.setLogs.toArray(),
      painReported: painLogsShowPain(await db.painLogs.toArray()),
    };
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(ids));
    } catch {
      /* Selection still works in memory. */
    }
  }, [ids, storageKey]);

  const preferences =
    preferencesProp ??
    (isTrainingPreferences(data?.training) ? data.training : undefined);
  const saved = data?.saved ?? [];
  const target = till ? saved.find((item) => item.id === till) : undefined;
  const existing = target?.exerciseIds ?? [];
  const max = maxWorkoutExercises - existing.length;
  const rehab = preferences?.programId === 'rehab';
  const kneeOnly = rehab && preferences && rehabGroup(preferences) === 'aaos';
  const reason = (id: ExerciseId) =>
    existing.includes(id)
      ? 'Redan i passet'
      : kneeOnly && !kneeRehabExercises.some((knee) => knee.id === id)
        ? 'Ingår inte i knäprogrammet'
        : undefined;
  const full = saved.length >= maxCustomWorkouts && !target;

  const planFor = (list: readonly ExerciseId[]) =>
    preferences && (data || preferencesProp)
      ? customWorkoutPlan(
          list,
          preferences,
          data?.sessions ?? [],
          data?.logs ?? [],
          data?.painReported ?? false,
        )
      : undefined;
  const summary = selectionSummary(ids, preferences, planFor);

  const move = (index: number, delta: -1 | 1) => {
    const to = index + delta;
    if (to < 0 || to >= ids.length) return;
    const next = [...ids];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(to, 0, item);
    setIds(next);
    setAnnouncement(`${exercises[item].name} flyttad till plats ${to + 1}.`);
  };

  const submit = async () => {
    if (!preferences || !ids.length) return;
    setBusy(true);
    setError('');
    try {
      const plan = planFor(ids);
      const finish = () => {
        setIds([]);
        try {
          sessionStorage.setItem(storageKey, '[]');
        } catch {
          /* Selection still clears in memory. */
        }
      };
      if (onCreate) {
        await onCreate(ids, plan);
      } else if (target) {
        await appendToCustomWorkout(target.id, ids, plan);
        if (plan) addToPreviewDraft(target.id, plan);
        finish();
        navigate(`/traning/A?workout=${target.id}`);
      } else {
        const id = await createCustomWorkout(ids, plan);
        finish();
        navigate(`/traning/A?workout=${id}`);
      }
    } catch {
      setError('Kunde inte spara passet. Försök igen.');
      setBusy(false);
    }
  };

  return (
    <Selection.Provider
      value={{
        ids,
        reason,
        max,
        toggle: (id) => {
          const name = exercises[id].name;
          setIds((current) => {
            if (current.includes(id)) return current.filter((i) => i !== id);
            return current.length < max ? [...current, id] : current;
          });
          setAnnouncement(
            ids.includes(id)
              ? `${name} borttagen.`
              : ids.length + 1 >= max
                ? `Högst ${maxWorkoutExercises} övningar.`
                : '',
          );
        },
        playing,
        play,
        summary,
        announcement,
        alwaysShowBar,
      }}
    >
      {till || !showSaved ? null : (
        <CustomWorkoutList headingId="own-workout" />
      )}
      {till && target ? (
        <p className="m-0 text-base font-bold">
          Du lägger till övningar i {target.name}.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="m-0 text-base font-bold">
          {error}
        </p>
      ) : null}
      {children}
      {ids.length || alwaysShowBar ? (
        <section
          aria-label="Valda övningar"
          className="sticky bottom-[var(--app-nav-height)] z-10 -mx-5 flex flex-col gap-2 border-t-[3px] border-ink bg-surface-tint px-5 py-3"
        >
          {open ? (
            <ol className="m-0 flex max-h-[28dvh] list-none flex-col overflow-y-auto p-0">
              {ids.map((id, index) => (
                <li
                  key={id}
                  className="border-t-2 border-edge first:border-t-0"
                >
                  <p className="m-0 break-words pt-2 text-base font-bold">
                    {index + 1}. {exercises[id].name}
                  </p>
                  <div className="flex items-center">
                    <button
                      type="button"
                      aria-label={`Flytta upp: ${exercises[id].name}`}
                      aria-disabled={index === 0}
                      onClick={() => move(index, -1)}
                      className="flex h-12 w-12 items-center justify-center aria-disabled:opacity-40"
                    >
                      <Icon name="back" className="rotate-90" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Flytta ned: ${exercises[id].name}`}
                      aria-disabled={index === ids.length - 1}
                      onClick={() => move(index, 1)}
                      className="flex h-12 w-12 items-center justify-center aria-disabled:opacity-40"
                    >
                      <Icon name="back" className="-rotate-90" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Ta bort: ${exercises[id].name}`}
                      onClick={() => {
                        setIds(ids.filter((item) => item !== id));
                        setAnnouncement(`${exercises[id].name} borttagen.`);
                        toggleRef.current?.focus();
                      }}
                      className="min-h-12 px-3 text-base underline"
                    >
                      Ta bort
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          ) : null}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              ref={toggleRef}
              aria-expanded={open}
              onClick={() => setOpen(!open)}
              disabled={!ids.length}
              className="min-h-12 shrink-0 px-2 text-base font-bold text-accent underline underline-offset-4 disabled:opacity-50"
            >
              {open ? 'Dölj valda' : 'Visa valda'}
            </button>
          </div>
          {ids.length >= max ? (
            <p className="m-0 text-base">
              Högst {maxWorkoutExercises} övningar.
            </p>
          ) : null}
          {!preferences && data ? (
            <Link
              href="/"
              className="flex min-h-12 items-center text-base font-bold text-accent underline underline-offset-4"
            >
              Välj träningsinriktning för att skapa pass
            </Link>
          ) : (
            <Button
              className="min-h-14"
              disabled={busy || full || !preferences || !ids.length}
              aria-describedby={ids.length ? undefined : 'builder-empty-hint'}
              onClick={submit}
            >
              {target ? 'Lägg till i passet' : 'Skapa pass'}
            </Button>
          )}
          {ids.length ? null : (
            <p id="builder-empty-hint" className="m-0 text-base">
              Välj minst en övning.
            </p>
          )}
          {full ? (
            <p className="m-0 text-base">
              Du kan spara {maxCustomWorkouts} pass. Ta bort ett för att skapa
              ett nytt.
            </p>
          ) : null}
        </section>
      ) : null}
    </Selection.Provider>
  );
}
