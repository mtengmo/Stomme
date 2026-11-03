import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, Redirect, useLocation } from 'wouter';
import {
  focusPresets,
  type RoutineFocus,
  workoutGroupLabels,
  workoutGroups,
} from '../../content/focusPresets';
import { isTrainingPreferences } from '../../content/programmes';
import {
  type CustomWorkout,
  readCustomWorkouts,
} from '../../db/customWorkouts';
import { getDb } from '../../db/db';
import { readTrainingProgram } from '../../db/program';
import { getMeta, listSessions } from '../../db/repo';
import type {
  Session,
  WeeklyDayPlan,
  WeeklySchedule,
} from '../../domain/types';
import { weekdayIndex } from '../../lib/dates';
import { recentMuscles } from '../../rules/recovery';
import { suggestWeek, weekConflicts } from '../../rules/weekSuggestion';
import { groupOf } from '../../rules/workoutGroups';
import { Button } from '../../ui/Button';
import { weekdayNames } from './planModel';
import {
  clearWeeklySchedule,
  loadWeeklySchedule,
  saveWeeklySchedule,
} from './WeeklyPlan';

export function WeekPlanner() {
  const data = useLiveQuery(
    async () => ({
      preferences: await getMeta(getDb(), 'training'),
      schedule: await loadWeeklySchedule(),
      workouts: readCustomWorkouts(await getMeta(getDb(), 'customWorkouts')),
      sessions: await listSessions(getDb()),
      program: await readTrainingProgram(getDb()),
    }),
    [],
  );
  if (!data) return null;
  // The programme owns the week; its strip lives on Home.
  if (data.program) return <Redirect to="/" />;
  if (
    !isTrainingPreferences(data.preferences) ||
    data.preferences.programId === 'rehab'
  )
    return <Redirect to="/" />;
  return (
    <Planner
      initial={data.schedule}
      workouts={data.workouts}
      sessions={data.sessions}
    />
  );
}
const selectClass =
  'min-h-12 w-0 min-w-0 flex-1 rounded-sm border-2 border-edge bg-surface px-2 text-base text-ink';
function selectedPlanValue(plan?: WeeklyDayPlan): string {
  return !plan
    ? 'rest'
    : plan.kind === 'standard'
      ? 'standard'
      : plan.kind === 'focus'
        ? `focus:${plan.focus}`
        : `workout:${plan.workoutId}`;
}
function Planner({
  initial,
  workouts,
  sessions,
}: {
  initial: WeeklySchedule | null;
  workouts: CustomWorkout[];
  sessions: Session[];
}) {
  const [, navigate] = useLocation();
  const [days, setDays] = useState<WeeklySchedule['days']>(initial?.days ?? []);
  const [count, setCount] = useState<2 | 3 | 4 | 5>(
    () => Math.max(2, initial?.days.length ?? 2) as 2 | 3 | 4 | 5,
  );
  const [notes, setNotes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Missing IDs can come from an import or deletion in another tab. Keep the
  // visible choice and the saved value identical while preserving this draft.
  const normalizedDays = days.map((item) => {
    const plan = item.plan;
    return plan.kind === 'workout' &&
      !workouts.some((workout) => workout.id === plan.workoutId)
      ? { ...item, plan: { kind: 'standard' as const } }
      : item;
  });
  const conflicts = weekConflicts({ days: normalizedDays }, workouts);
  function change(day: number, value: string) {
    const rest = days.filter((item) => item.day !== day);
    const plan: WeeklyDayPlan | undefined =
      value === 'rest'
        ? undefined
        : value === 'standard'
          ? { kind: 'standard' }
          : value.startsWith('focus:')
            ? { kind: 'focus', focus: value.slice(6) as RoutineFocus }
            : { kind: 'workout', workoutId: value.slice(8) };
    if (plan && rest.length >= 5) {
      setError(
        'Välj högst fem träningsdagar. Välj Vila på en annan dag först.',
      );
      return;
    }
    setDays(
      [...rest, ...(plan ? [{ day, plan }] : [])].sort((a, b) => a.day - b.day),
    );
    setError('');
    setNotes([]);
  }
  return (
    <div className="mx-auto max-w-md px-5 pt-5 pb-[var(--app-nav-height)]">
      <div className="flex flex-col gap-4 pb-28">
        <h1 className="m-0 text-4xl font-extrabold">Planera veckan</h1>
        <p className="m-0 text-base text-ink-soft">
          Ett förslag att anpassa efter hur du mår. Välj en till fem dagar;
          kontrollera alltid passet före start.
        </p>
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2 text-base font-bold">Dagar per vecka</legend>
          <div className="flex gap-2">
            {([2, 3, 4, 5] as const).map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={count === n}
                className={`min-h-12 flex-1 rounded-sm border-2 text-lg font-bold ${count === n ? 'border-accent bg-surface-tint' : 'border-edge bg-surface'}`}
                onClick={() => setCount(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </fieldset>
        <Button
          variant="secondary"
          onClick={() => {
            const now = new Date();
            const suggestion = suggestWeek({
              workouts,
              daysPerWeek: count,
              preferredDays: days.map((item) => item.day),
              recent: recentMuscles(sessions, now),
              now,
            });
            setDays(suggestion.schedule.days);
            setNotes([
              'Förslaget visas nedan. Spara när du är nöjd.',
              ...suggestion.notes,
            ]);
            setError('');
          }}
        >
          Föreslå vecka
        </Button>
        <fieldset className="m-0 flex min-w-0 flex-col border-0 p-0">
          <legend className="sr-only">Pass per veckodag</legend>
          {weekdayNames.map((name, index) => (
            <label
              key={name}
              className="flex min-h-14 w-full min-w-0 items-center gap-2 border-b-2 border-edge py-1"
            >
              <span className="w-20 shrink-0 text-base font-bold">{name}</span>
              <select
                aria-label={name}
                className={selectClass}
                value={selectedPlanValue(
                  normalizedDays.find((item) => item.day === index + 1)?.plan,
                )}
                onChange={(event) => change(index + 1, event.target.value)}
              >
                <option value="rest">Vila</option>
                <option value="standard">Nästa pass (A/B)</option>
                <optgroup label="Fokus">
                  {focusPresets
                    .filter((p) => p.id !== 'custom')
                    .map((p) => (
                      <option key={p.id} value={`focus:${p.id}`}>
                        {p.label}
                      </option>
                    ))}
                </optgroup>
                {workoutGroups.map((group) => {
                  const rows = workouts.filter((w) => groupOf(w) === group);
                  return rows.length ? (
                    <optgroup key={group} label={workoutGroupLabels[group]}>
                      {rows.map((w) => (
                        <option key={w.id} value={`workout:${w.id}`}>
                          {w.name}
                        </option>
                      ))}
                    </optgroup>
                  ) : null;
                })}
              </select>
            </label>
          ))}
        </fieldset>
        {conflicts.length ? (
          <p className="m-0 text-base" role="status">
            Förslag: {conflicts.join('. ')}. Anpassa dagar eller pass.
          </p>
        ) : null}
        {notes.length ? (
          <p className="m-0 text-base" role="status">
            {notes.join(' ')}
          </p>
        ) : null}
        {error ? (
          <p className="m-0 text-base font-bold" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <div className="fixed inset-x-0 bottom-[var(--app-nav-height)] z-10 border-t-2 border-ink bg-surface-tint px-5 py-2">
        <div className="mx-auto flex max-w-md gap-3">
          <Link
            href="/"
            className="flex min-h-14 items-center px-3 text-base font-bold underline"
          >
            Tillbaka
          </Link>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError('');
              try {
                if (normalizedDays.length)
                  await saveWeeklySchedule({
                    days: normalizedDays,
                    ...(initial?.moved &&
                    normalizedDays.some(
                      (item) =>
                        item.day ===
                        weekdayIndex(initial.moved?.from as string) + 1,
                    )
                      ? { moved: initial.moved }
                      : {}),
                  });
                else await clearWeeklySchedule();
                navigate('/');
              } catch {
                setError('Kunde inte spara veckoplanen. Försök igen.');
              } finally {
                setBusy(false);
              }
            }}
          >
            Spara
          </Button>
        </div>
      </div>
    </div>
  );
}
