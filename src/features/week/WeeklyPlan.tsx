import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { getDb, type StommeDB } from '../../db/db';
import type {
  Session,
  TrainingPreferences,
  WeeklySchedule,
} from '../../domain/types';
import {
  addDays,
  formatLongDate,
  toLocalDate,
  weekdayIndex,
  weekStart,
} from '../../lib/dates';
import { restStatus } from '../../rules/schedule';
import {
  completedTrainingDates,
  isWeeklySchedule,
  nextPlannedDate,
  readWeeklySchedule,
} from '../../rules/weeklySchedule';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';

const WEEKDAYS = [
  'Måndag',
  'Tisdag',
  'Onsdag',
  'Torsdag',
  'Fredag',
  'Lördag',
  'Söndag',
];

/** Persists only a user's preferred days and an explicit one-date move. */
export async function saveWeeklySchedule(
  value: unknown,
  db: StommeDB = getDb(),
): Promise<void> {
  if (!isWeeklySchedule(value)) throw new TypeError('Ogiltig veckoplan');
  await db.meta.put({ key: 'weeklySchedule', value });
}

export async function clearWeeklySchedule(
  db: StommeDB = getDb(),
): Promise<void> {
  await db.meta.delete('weeklySchedule');
}

export async function loadWeeklySchedule(
  db: StommeDB = getDb(),
): Promise<WeeklySchedule | null> {
  const entry = await db.meta.get('weeklySchedule');
  return readWeeklySchedule(entry?.value);
}

function sessionBelongsToProgramme(
  session: Session,
  programId: TrainingPreferences['programId'],
): boolean {
  return session.programId === programId;
}

/** Swedish rest advice line for a restStatus result. */
export function restAdviceText(rest: ReturnType<typeof restStatus>): string {
  return rest.earliestNext === null
    ? 'Råd om vila: inget tidigare pass i det här programmet.'
    : rest.ok
      ? 'Råd om vila: 48 timmar har gått sedan senaste passet.'
      : `Råd om vila: 48 timmar efter senaste passet är ${formatLongDate(toLocalDate(rest.earliestNext))} kl. ${rest.earliestNext.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}.`;
}

export interface WeeklyPlanProps {
  preferences: TrainingPreferences;
  sessions: Session[];
  today?: string;
  now?: Date;
}

export function WeeklyPlan({
  preferences,
  sessions,
  today: todayProp,
  now: nowProp,
}: WeeklyPlanProps) {
  const [saveError, setSaveError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [moveTarget, setMoveTarget] = useState<string | null>(null);
  const stored = useLiveQuery(loadWeeklySchedule, []);
  if (preferences.programId === 'rehab') return null;

  const now = nowProp ?? new Date();
  const today = todayProp ?? toLocalDate(now);
  const schedule = stored ?? null;
  const programmeSessions = sessions.filter((session) =>
    sessionBelongsToProgramme(session, preferences.programId),
  );
  const weekBeginning = weekStart(today);
  const weekEnding = addDays(weekBeginning, 6);
  const completedThisWeek = programmeSessions.filter(
    (session) =>
      session.status === 'completed' &&
      session.date >= weekBeginning &&
      session.date <= weekEnding,
  ).length;
  const completedStandardDates = completedTrainingDates(
    programmeSessions,
    preferences.programId,
  );
  const plannedDate = nextPlannedDate(schedule, today, completedStandardDates);
  const rest = restStatus(programmeSessions, now);
  const regularDate = schedule
    ? nextPlannedDate({ days: schedule.days }, today, completedStandardDates)
    : null;
  const moveFrom =
    schedule?.moved && schedule.moved.to === plannedDate
      ? schedule.moved.from
      : regularDate;
  const target =
    moveTarget ?? (schedule?.moved?.from === moveFrom ? schedule.moved.to : '');
  const busy = stored === undefined || saving;

  async function updateDays(day: number) {
    if (busy) return;
    setSaveError(false);
    const days = schedule?.days.includes(day)
      ? schedule.days.filter((item) => item !== day)
      : [...(schedule?.days ?? []), day].sort((a, b) => a - b);
    if (days.length > 3) return;
    setSaving(true);
    try {
      if (days.length === 0) {
        await clearWeeklySchedule();
      } else {
        const candidate: WeeklySchedule = {
          days,
          ...(schedule?.moved &&
          days.includes(weekdayIndex(schedule.moved.from) + 1)
            ? { moved: schedule.moved }
            : {}),
        };
        await saveWeeklySchedule(candidate);
      }
      setMoveTarget(null);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  async function moveNextOccurrence() {
    if (busy || !moveFrom || !target || target < today || target === moveFrom)
      return;
    setSaveError(false);
    setSaving(true);
    try {
      await saveWeeklySchedule({
        days: schedule?.days,
        moved: { from: moveFrom, to: target },
      });
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  async function resetMove() {
    if (busy || !schedule) return;
    setSaveError(false);
    setSaving(true);
    const { moved: _moved, ...daysOnly } = schedule;
    try {
      await saveWeeklySchedule(daysOnly);
      setMoveTarget(null);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      aria-labelledby="weekly-plan-heading"
      className="space-y-4 border-t-[3px] border-ink pt-4"
    >
      <h2
        id="weekly-plan-heading"
        className="m-0 font-display text-3xl font-bold leading-none"
      >
        Veckoplan
      </h2>
      {stored === undefined ? null : schedule ? (
        <div className="space-y-3">
          <p className="m-0 text-base">
            Nästa planerade pass:{' '}
            <strong>
              {plannedDate
                ? formatLongDate(plannedDate)
                : 'välj dagar för att skapa en plan'}
            </strong>
          </p>
          <p className="m-0 text-base">
            Klart den här veckan: <strong>{completedThisWeek}</strong>
          </p>
          <p className="m-0 text-base text-ink-soft">{restAdviceText(rest)}</p>
        </div>
      ) : completedThisWeek >= 1 ? (
        <p className="m-0 text-base">
          Klart den här veckan: <strong>{completedThisWeek}</strong>
        </p>
      ) : null}
      {stored !== undefined && (
        <details className="border-t-2 border-edge pt-2">
          <summary className="flex min-h-12 cursor-pointer items-center font-bold text-accent underline underline-offset-4">
            {schedule ? 'Ändra veckoplan' : 'Välj träningsdagar'}
          </summary>
          <div className="space-y-4 pt-3">
            <p className="m-0 text-base text-ink-soft">
              Välj en till tre dagar som brukar passa. Två dagar är en bra
              start.
            </p>
            <fieldset className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <legend className="sr-only">Välj träningsdagar</legend>
              {WEEKDAYS.map((name, index) => {
                const day = index + 1;
                const selected = schedule?.days.includes(day) ?? false;
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={selected}
                    disabled={
                      busy || (!selected && (schedule?.days.length ?? 0) >= 3)
                    }
                    onClick={() => void updateDays(day)}
                    className={`flex min-h-12 items-center justify-center gap-2 rounded-md border-[3px] px-3 text-base font-bold disabled:opacity-50 ${selected ? 'border-accent bg-surface-tint text-accent' : 'border-edge bg-surface text-ink'}`}
                  >
                    <Icon
                      name={selected ? 'check' : 'plus'}
                      size={18}
                      className="shrink-0"
                    />
                    {name}
                  </button>
                );
              })}
            </fieldset>
            {schedule && moveFrom && (
              <div className="space-y-2">
                <label
                  htmlFor="weekly-plan-move"
                  className="block text-base font-bold"
                >
                  Flytta nästa pass från {formatLongDate(moveFrom)}
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    id="weekly-plan-move"
                    type="date"
                    min={today}
                    value={target}
                    disabled={busy}
                    onChange={(event) => setMoveTarget(event.target.value)}
                    className="min-h-12 rounded-md border-[3px] border-edge bg-surface px-3 text-base text-ink disabled:opacity-50"
                  />
                  <Button
                    variant="secondary"
                    className="min-h-12 w-auto text-base"
                    onClick={() => void moveNextOccurrence()}
                    disabled={
                      busy || !target || target === moveFrom || target < today
                    }
                  >
                    Flytta pass
                  </Button>
                  {schedule.moved && (
                    <button
                      type="button"
                      onClick={() => void resetMove()}
                      disabled={busy}
                      className="min-h-12 px-2 text-base font-bold text-accent underline underline-offset-4 disabled:opacity-50"
                    >
                      Återställ flytt
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </details>
      )}
      {saveError && (
        <Banner tone="warn">
          <p className="m-0">Planen kunde inte sparas. Försök igen.</p>
        </Banner>
      )}
    </section>
  );
}
