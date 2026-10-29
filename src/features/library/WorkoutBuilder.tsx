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
import type { Exercise, ExerciseId, PlannedExercise } from '../../domain/types';
import { Figure, FigureFrame, movementPose } from '../../figures/Figure';
import { useHashSearch } from '../../lib/hashLocation';
import { estimateWorkoutMinutes } from '../../rules/shortWorkout';
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
}

const Selection = createContext<SelectionValue>({
  ids: [],
  toggle: () => {},
  reason: () => undefined,
  max: maxWorkoutExercises,
  playing: null,
  play: () => {},
});

export function SelectionNote({ exercise }: { exercise: Exercise }) {
  const { reason, ids } = useContext(Selection);
  const text = reason(exercise.id);
  if (!text || ids.includes(exercise.id)) return null;
  return <p className="m-0 mt-1 text-base font-bold">{text}</p>;
}

export function ExerciseChoice({ exercise }: { exercise: Exercise }) {
  const { ids, toggle, reason, max, playing, play } = useContext(Selection);
  const ref = useRef<HTMLDivElement>(null);
  const active = playing === exercise.id;
  const picked = ids.includes(exercise.id);
  useEffect(() => {
    if (!active || !ref.current || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) play(null);
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [active, play]);
  return (
    <div className="flex flex-col items-start gap-2" ref={ref}>
      <button
        type="button"
        aria-label={`${active ? 'Pausa' : 'Visa'} rörelsen: ${exercise.name}`}
        aria-pressed={active}
        onClick={() => play(active ? null : exercise.id)}
        className="flex w-28 shrink-0 flex-col items-center rounded-sm border-2 border-edge p-1 text-base font-bold"
      >
        <span className="block h-24 w-full" aria-hidden="true">
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
        {active ? 'Pausa' : 'Visa rörelse'}
      </button>
      <button
        type="button"
        aria-label={`Välj: ${exercise.name}`}
        aria-pressed={picked}
        disabled={
          !picked && (ids.length >= max || Boolean(reason(exercise.id)))
        }
        onClick={() => toggle(exercise.id)}
        className={`flex min-h-12 w-28 items-center justify-center gap-2 rounded-md border-[3px] px-3 text-base font-bold disabled:opacity-50 ${picked ? 'border-accent bg-surface-tint text-accent' : 'border-edge bg-surface text-ink'}`}
      >
        <Icon name={picked ? 'check' : 'plus'} size={18} className="shrink-0" />
        {picked ? 'Vald' : 'Välj'}
      </button>
    </div>
  );
}

export function WorkoutBuilder({ children }: { children: ReactNode }) {
  const [, navigate] = useLocation();
  const till = new URLSearchParams(useHashSearch()).get('till');
  const [ids, setIds] = useState<ExerciseId[]>(() => {
    try {
      const value = JSON.parse(
        sessionStorage.getItem('stomme.library-selection') ?? '[]',
      );
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
      sessionStorage.setItem('stomme.library-selection', JSON.stringify(ids));
    } catch {
      /* Selection still works in memory. */
    }
  }, [ids]);

  const preferences = isTrainingPreferences(data?.training)
    ? data.training
    : undefined;
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

  const planFor = (list: ExerciseId[]) =>
    preferences && data
      ? customWorkoutPlan(
          list,
          preferences,
          data.sessions,
          data.logs,
          data.painReported,
        )
      : undefined;
  const minutes =
    !rehab && ids.length
      ? (() => {
          const plan = planFor(ids);
          return plan ? estimateWorkoutMinutes(plan) : undefined;
        })()
      : undefined;

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
          sessionStorage.setItem('stomme.library-selection', '[]');
        } catch {
          /* Selection still clears in memory. */
        }
      };
      if (target) {
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
      }}
    >
      {till ? null : <CustomWorkoutList headingId="own-workout" />}
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
      {ids.length ? (
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
          <div className="flex items-center justify-between gap-3">
            <p role="status" className="m-0 min-w-0 text-base font-bold">
              {ids.length} valda
              {minutes !== undefined ? ` · ca ${minutes} min` : ''}
              {announcement ? (
                <span className="sr-only">. {announcement}</span>
              ) : null}
            </p>
            <button
              type="button"
              ref={toggleRef}
              aria-expanded={open}
              onClick={() => setOpen(!open)}
              className="min-h-12 shrink-0 px-2 text-base font-bold text-accent underline underline-offset-4"
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
              disabled={busy || full || !preferences}
              onClick={submit}
            >
              {target ? 'Lägg till i passet' : 'Skapa pass'}
            </Button>
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
