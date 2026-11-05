import { useState } from 'react';
import { Link } from 'wouter';
import { exercises } from '../../content/exercises';
import { focusLabel } from '../../content/focusPresets';
import { programExcludedIds } from '../../content/programExclusions';
import { trainingName } from '../../content/programmes';
import { getDb } from '../../db/db';
import { saveTrainingProgram } from '../../db/program';
import type {
  ExerciseId,
  Session,
  SetLog,
  TrainingPreferences,
  TrainingProgram,
} from '../../domain/types';
import { toLocalDate, weekdayIndex } from '../../lib/dates';
import { weekdaysFor } from '../../rules/programPlan';
import { BLOCK_WEEKS, programProgress } from '../../rules/programProgress';
import { recentMuscles, recoveryNote } from '../../rules/recovery';
import { Button, buttonClass } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { linkClass } from '../../ui/link';
import { programPassLabel } from '../history/labels';
import { CustomWorkoutList } from '../library/CustomWorkoutList';
import { TimeoutNotice } from '../session/TimeoutNotice';
import { customWorkoutPlan } from '../training/defaultPlan';
import { NextLevelSuggestions } from '../training/NextLevelSuggestions';
import { BlockProgress } from './BlockProgress';
import { PauseFiguresButton } from './ExerciseThumb';
import { PassCard } from './PassCard';
import { ProgramRedoEnd } from './ProgramConfirm';
import { ProgramWeekStrip } from './ProgramWeekStrip';
import {
  cardExercises,
  MIN_USABLE_EXERCISES,
  passMinutes,
  passPlan,
  programDays,
  weekdayAbbr,
} from './programView';
import { WEEK_TICK_MS, WeekTick } from './WeekTick';

interface ProgramHomeProps {
  preferences: TrainingPreferences;
  program: TrainingProgram;
  sessions: Session[];
  logs: SetLog[];
  /** The in-progress session, if any. */
  active?: Session;
  /** The in-progress session is only a preparation (nothing logged yet). */
  prepared: boolean;
  /** Sessions awaiting the day-after check-in. */
  due: Session[];
  /** Finished or aborted general sessions, newest first. */
  recent: Session[];
}

type View = 'home' | 'redo';

const stickyBar =
  'sticky bottom-[var(--app-nav-height)] z-10 -mx-5 border-t-[3px] border-ink bg-surface-tint px-5 py-3';
const quietRow = `flex min-h-12 items-center text-base font-bold ${linkClass}`;

/** Home while a general programme exists: this week, the next pass, then the rest. */
export function ProgramHome({
  preferences,
  program,
  sessions,
  logs,
  active,
  prepared,
  due,
  recent,
}: ProgramHomeProps) {
  const [view, setView] = useState<View>('home');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tickAnimate, setTickAnimate] = useState(false);
  const locked = !!active && !prepared;
  const today = toLocalDate(new Date());
  const progress = programProgress(program, sessions);
  const n = program.daysPerWeek;
  const total = n * BLOCK_WEEKS;
  const completedWeeks = Math.min(BLOCK_WEEKS, Math.floor(progress.done / n));

  const nextBlock = async () => {
    setBusy(true);
    setError('');
    try {
      await saveTrainingProgram(getDb(), {
        ...program,
        id: crypto.randomUUID(),
        block: program.block + 1,
        createdAt: new Date().toISOString(),
        startDate: today,
        weekdays: weekdaysFor(today, program.daysPerWeek),
      });
    } catch {
      setError('Kunde inte starta blocket. Försök igen.');
    } finally {
      setBusy(false);
    }
  };

  const swapExercise = async (from: ExerciseId, to: ExerciseId) => {
    setError('');
    try {
      await saveTrainingProgram(getDb(), {
        ...program,
        passes: program.passes.map((pass) =>
          pass.exerciseIds.includes(from) && !pass.exerciseIds.includes(to)
            ? {
                ...pass,
                exerciseIds: pass.exerciseIds.map((id) =>
                  id === from ? to : id,
                ),
              }
            : pass,
        ),
      });
    } catch {
      setError('Kunde inte byta övningen. Försök igen.');
    }
  };

  if (view === 'redo')
    return (
      <ProgramRedoEnd
        mode="redo"
        preferences={preferences}
        program={program}
        onKeep={() => setView('home')}
        onRebuilt={() => setView('home')}
      />
    );

  const nextIndex = progress.nextPass - 1;
  const nextPass = program.passes[nextIndex];
  const { plan, removed } = passPlan(
    program,
    nextIndex,
    preferences,
    sessions,
    logs,
  );
  const equipmentChanged = plan.length < MIN_USABLE_EXERCISES;
  const days = programDays(program, sessions, today);
  const isTodayNext = days.nextDate === today;
  const dayLabel = days.nextDate
    ? isTodayNext
      ? 'Idag'
      : weekdayAbbr(weekdayIndex(days.nextDate) + 1)
    : undefined;
  const showReceding = n > 1 && progress.done + 1 < total;
  const afterIndex = progress.nextPass % n;
  const afterPass = program.passes[afterIndex];
  const afterPlan = afterPass
    ? passPlan(program, afterIndex, preferences, sessions, logs).plan
    : [];
  const restNote = nextPass
    ? recoveryNote(
        recentMuscles(sessions, new Date()),
        { id: nextPass.focus },
        new Date(),
      )
    : '';

  const startHref = active
    ? `/session/${active.id}`
    : `/traning/A?program=${progress.nextPass}`;

  const tail = (
    <>
      {due.map((session) => (
        <Link
          key={session.id}
          href={`/kansla/${session.id}/dayAfter`}
          className={buttonClass('secondary')}
        >
          Hur känns det dagen efter {trainingName(session)}?
        </Link>
      ))}
      <CustomWorkoutList
        headingId="home-own-workouts"
        variant="home"
        disabled={locked}
      />
      {recent.length ? (
        <section
          aria-labelledby="recent-training"
          className="flex flex-col gap-2 border-t-2 border-edge pt-5"
        >
          <h2 id="recent-training" className="m-0 text-2xl font-bold">
            Senaste pass
          </h2>
          {recent.slice(0, 3).map((session) => (
            <Link
              key={session.id}
              href={`/historik/${session.id}`}
              className="flex min-h-12 items-center border-b-2 border-edge text-base underline"
            >
              {session.date} ·{' '}
              {session.customWorkoutId
                ? (session.customWorkoutName ?? 'Eget pass')
                : (programPassLabel(session) ??
                  `${session.workoutMode === 'short' ? 'Kortpass' : 'Pass'} ${session.templateId}`)}{' '}
              · {session.status === 'completed' ? 'klart' : 'avbrutet'}
            </Link>
          ))}
        </section>
      ) : null}
    </>
  );

  if (progress.blockDone && !active) {
    const uniqueIds = [
      ...new Set(program.passes.flatMap((pass) => pass.exerciseIds)),
    ];
    const blockPlan = customWorkoutPlan(uniqueIds, preferences, sessions, logs);
    return (
      <div className="mx-auto flex max-w-md flex-col gap-5 px-5 pt-6 pb-[var(--app-nav-clear)]">
        <h1 className="count m-0 text-5xl leading-none">Blocket klart</h1>
        <BlockProgress
          done={total}
          total={total}
          currentWeek={BLOCK_WEEKS}
          completedWeeks={BLOCK_WEEKS}
        />
        <section
          aria-label="Nästa block"
          className="pass-card-lead flex flex-col gap-3 rounded-md border-[3px] border-ink bg-surface-tint p-5"
        >
          <p className="m-0 text-base font-bold text-accent">Nästa</p>
          <h2 className="count m-0 text-[3.75rem] leading-none">
            Block {program.block + 1}
          </h2>
          <p className="m-0 text-lg">
            Samma pass i fyra nya veckor. Du kan byta till svårare övningar
            först, eller behålla allt som det är.
          </p>
        </section>
        <NextLevelSuggestions
          plan={blockPlan}
          preferences={preferences}
          sessions={sessions}
          logs={logs}
          onChoose={(from, to) => void swapExercise(from, to)}
          exclude={programExcludedIds}
        />
        {error ? (
          <p role="alert" className="m-0 text-base font-bold">
            {error}
          </p>
        ) : null}
        <div className={stickyBar}>
          <Button disabled={busy} onClick={() => void nextBlock()}>
            Starta block {program.block + 1}
          </Button>
        </div>
        <Link href="/mitt-program" className={`${quietRow} -mt-3`}>
          Mitt program
        </Link>
        {tail}
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 px-5 pt-6 pb-[var(--app-nav-clear)]">
      <h1 className="count m-0 text-5xl leading-none">
        <Link
          href="/mitt-program"
          className="flex min-h-12 items-center justify-between gap-2 text-ink no-underline"
        >
          <span>
            Vecka {progress.week}{' '}
            <span className="text-3xl whitespace-nowrap">av {BLOCK_WEEKS}</span>
            <span className="sr-only"> – Mitt program</span>
          </span>
          <Icon name="back" size={28} className="shrink-0 rotate-180" />
        </Link>
      </h1>
      <BlockProgress
        done={progress.done}
        total={total}
        currentWeek={progress.week}
        completedWeeks={completedWeeks}
        newTickWeek={tickAnimate ? completedWeeks : undefined}
        tickDelayMs={WEEK_TICK_MS + 120}
      />
      <WeekTick
        flagKey={`${program.id}:${completedWeeks}`}
        week={completedWeeks}
        done={progress.weekJustDone}
        onAnimate={setTickAnimate}
      >
        <ProgramWeekStrip
          today={today}
          plannedDates={days.plannedDates}
          doneDates={days.doneDates}
          nextDate={days.nextDate}
          suggestedWeekdays={program.weekdays}
        />
      </WeekTick>
      <TimeoutNotice />
      {equipmentChanged ? (
        <section
          aria-labelledby="equipment-changed"
          className="flex flex-col gap-2 rounded-md border-[3px] border-ink bg-surface-tint p-5"
        >
          <h2 id="equipment-changed" className="m-0 text-2xl font-bold">
            Utrustningen har ändrats
          </h2>
          <p className="m-0 text-base">
            Passet har för få övningar som passar din utrustning nu. Gör om
            programmet så byggs det på det du har.
          </p>
        </section>
      ) : nextPass ? (
        <>
          <PassCard
            variant="lead"
            passNumber={progress.nextPass}
            focusLabel={focusLabel(nextPass.focus)}
            minutes={passMinutes(plan)}
            exercises={cardExercises(plan)}
            dayLabel={dayLabel}
            isToday={isTodayNext}
            showLegend={progress.done === 0}
            swapHref={
              active
                ? undefined
                : (id) => `/traning/A?program=${progress.nextPass}&byt=${id}`
            }
          />
          {removed.length ? (
            <p className="m-0 text-base text-ink-soft">
              Borttaget ur dagens pass eftersom utrustningen saknas:{' '}
              {removed
                .map((id) => exercises[id].name.toLocaleLowerCase('sv'))
                .join(', ')}
              .
            </p>
          ) : null}
          <PauseFiguresButton className="self-start" />
        </>
      ) : null}
      {!equipmentChanged && showReceding && afterPass ? (
        <PassCard
          variant="receding"
          passNumber={afterIndex + 1}
          focusLabel={focusLabel(afterPass.focus)}
          minutes={passMinutes(afterPlan)}
          exercises={cardExercises(afterPlan)}
          dayLabel={weekdayAbbr(program.weekdays[afterIndex] ?? 1)}
        />
      ) : null}
      {restNote && !equipmentChanged ? (
        <p className="m-0 text-base text-ink-soft">{restNote}</p>
      ) : null}
      <div className={stickyBar}>
        {equipmentChanged && !active ? (
          <Button onClick={() => setView('redo')}>Gör om programmet</Button>
        ) : (
          <Link href={startHref} className={buttonClass('primary')}>
            {prepared
              ? 'Fortsätt förberedelsen'
              : active
                ? 'Fortsätt passet'
                : 'Starta passet'}
          </Link>
        )}
      </div>
      {!active && !equipmentChanged && nextPass ? (
        <div className="-mt-3 flex flex-col">
          <Link href="/fokus" className={quietRow}>
            Träna något annat idag
          </Link>
          <Link href={`${startHref}&byt=alla`} className={quietRow}>
            Byt övning
          </Link>
        </div>
      ) : null}
      {tail}
    </div>
  );
}
