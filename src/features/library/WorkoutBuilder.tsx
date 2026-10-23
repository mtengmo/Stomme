import { useLiveQuery } from 'dexie-react-hooks';
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Link } from 'wouter';
import { exercises } from '../../content/exercises';
import { readCustomWorkouts } from '../../db/customWorkouts';
import { getDb } from '../../db/db';
import type { Exercise, ExerciseId } from '../../domain/types';
import { Figure, FigureFrame, movementPose } from '../../figures/Figure';
import { Button, buttonClass } from '../../ui/Button';

const Selection = createContext<{
  ids: ExerciseId[];
  toggle(id: ExerciseId): void;
  playing: ExerciseId | null;
  play(id: ExerciseId | null): void;
}>({ ids: [], toggle: () => {}, playing: null, play: () => {} });

export function ExerciseChoice({ exercise }: { exercise: Exercise }) {
  const { ids, toggle, playing, play } = useContext(Selection);
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
        aria-pressed={ids.includes(exercise.id)}
        disabled={!ids.includes(exercise.id) && ids.length >= 12}
        onClick={() => toggle(exercise.id)}
        className="min-h-12 text-left text-base font-bold underline"
      >
        {ids.includes(exercise.id)
          ? 'Ta bort ur eget pass'
          : 'Välj till eget pass'}
        <span className="sr-only">: {exercise.name}</span>
      </button>
    </div>
  );
}

export function WorkoutBuilder({ children }: { children: ReactNode }) {
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
          ].slice(0, 12)
        : [];
    } catch {
      return [];
    }
  });
  const [playing, play] = useState<ExerciseId | null>(null);
  const [name, setName] = useState('');
  const builderRef = useRef<HTMLElement>(null);
  const [showShortcut, setShowShortcut] = useState(false);
  useEffect(() => {
    if (!builderRef.current || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver(([entry]) =>
      setShowShortcut(!entry?.isIntersecting),
    );
    observer.observe(builderRef.current);
    return () => observer.disconnect();
  }, []);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const saved = useLiveQuery(
    async () =>
      readCustomWorkouts((await getDb().meta.get('customWorkouts'))?.value),
    [],
  );
  useEffect(() => {
    try {
      sessionStorage.setItem('stomme.library-selection', JSON.stringify(ids));
    } catch {
      /* Selection still works in memory. */
    }
  }, [ids]);
  return (
    <Selection.Provider
      value={{
        ids,
        toggle: (id) =>
          setIds((current) =>
            current.includes(id)
              ? current.filter((item) => item !== id)
              : current.length < 12
                ? [...current, id]
                : current,
          ),
        playing,
        play,
      }}
    >
      <section
        ref={builderRef}
        aria-labelledby="own-workout"
        className="flex flex-col gap-3 border-y-2 border-ink py-4"
      >
        <h2 id="own-workout" tabIndex={-1} className="m-0 text-3xl font-bold">
          Mina egna pass
        </h2>
        <p className="m-0 text-base">
          Välj upp till 12 övningar i listan. De sparas i den ordning du väljer
          dem. Anpassa antal, vikt och vila innan du börjar.
        </p>
        {saved?.map((workout) => (
          <div
            key={workout.id}
            className="flex items-center justify-between gap-3 border-t-2 border-edge pt-2"
          >
            <Link
              href={`/traning/A?workout=${workout.id}`}
              className="flex min-h-12 min-w-0 items-center break-words text-lg font-bold underline"
            >
              {workout.name} · {workout.exerciseIds.length} övningar
            </Link>
            <button
              type="button"
              className="min-h-12 px-2 text-base underline"
              onClick={async () => {
                try {
                  await getDb().transaction('rw', getDb().meta, async () => {
                    const current = readCustomWorkouts(
                      (await getDb().meta.get('customWorkouts'))?.value,
                    );
                    await getDb().meta.put({
                      key: 'customWorkouts',
                      value: current.filter((item) => item.id !== workout.id),
                    });
                  });
                } catch {
                  setError('Kunde inte ta bort passet. Försök igen.');
                }
              }}
            >
              Ta bort<span className="sr-only"> {workout.name}</span>
            </button>
          </div>
        ))}
        {ids.length ? (
          <>
            <h3 className="m-0 text-xl font-bold">
              Valda övningar · {ids.length} av 12
            </h3>
            <ol className="m-0 pl-6 text-base">
              {ids.map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    className="min-h-12 text-left underline"
                    onClick={() =>
                      setIds((current) => current.filter((item) => item !== id))
                    }
                  >
                    {exercises[id].name} · ta bort
                  </button>
                </li>
              ))}
            </ol>
            <label className="flex flex-col gap-2 text-base font-bold">
              Namn på passet
              <input
                value={name}
                maxLength={60}
                onChange={(event) => setName(event.target.value)}
                className="min-h-12 min-w-0 rounded-sm border-2 border-edge bg-surface px-3 text-ink"
              />
            </label>
            <Button
              disabled={busy || !name.trim() || (saved?.length ?? 0) >= 30}
              onClick={async () => {
                setBusy(true);
                setError('');
                try {
                  await getDb().transaction('rw', getDb().meta, async () => {
                    const current = readCustomWorkouts(
                      (await getDb().meta.get('customWorkouts'))?.value,
                    );
                    if (current.length >= 30) throw new Error();
                    await getDb().meta.put({
                      key: 'customWorkouts',
                      value: [
                        ...current,
                        {
                          id: crypto.randomUUID(),
                          name: name.trim(),
                          exerciseIds: ids,
                        },
                      ],
                    });
                  });
                  setIds([]);
                  setName('');
                } catch {
                  setError('Kunde inte spara passet. Försök igen.');
                } finally {
                  setBusy(false);
                }
              }}
            >
              Spara eget pass
            </Button>
            {(saved?.length ?? 0) >= 30 ? (
              <p className="m-0 text-base">
                Du kan spara 30 pass. Ta bort ett för att skapa ett nytt.
              </p>
            ) : null}
          </>
        ) : null}
        <p className="m-0 text-base text-ink-soft">
          Sparas på den här enheten och ingår i säkerhetskopian.
        </p>
        {error ? (
          <p role="alert" className="m-0 text-base font-bold">
            {error}
          </p>
        ) : null}
      </section>
      {children}
      {ids.length && showShortcut ? (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            document
              .getElementById('own-workout')
              ?.scrollIntoView({ block: 'start' });
            document
              .getElementById('own-workout')
              ?.focus({ preventScroll: true });
          }}
          className={`${buttonClass('primary')} fixed inset-x-5 bottom-24 z-10 mx-auto max-w-sm`}
        >
          Visa eget pass · {ids.length} valda
        </button>
      ) : null}
    </Selection.Provider>
  );
}
