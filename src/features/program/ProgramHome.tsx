import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { beginnerExerciseIds } from '../../content/beginnerSet';
import { exercises } from '../../content/exercises';
import { focusLabel } from '../../content/focusPresets';
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
import { buildProgram, weekdaysFor } from '../../rules/programPlan';
import { BLOCK_WEEKS, programProgress } from '../../rules/programProgress';
import { recentMuscles, recoveryNote } from '../../rules/recovery';
import { Button, buttonClass } from '../../ui/Button';
import { linkClass } from '../../ui/link';
import { programPassLabel } from '../history/labels';
import { CustomWorkoutList } from '../library/CustomWorkoutList';
import { TimeoutNotice } from '../session/TimeoutNotice';
import { customWorkoutPlan } from '../training/defaultPlan';
import { NextLevelSuggestions } from '../training/NextLevelSuggestions';
import { BlockProgress } from './BlockProgress';
import { PauseFiguresButton } from './ExerciseThumb';
import { PassCard } from './PassCard';
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
  onChangeDirection(): void;
}

type View = 'home' | 'redo' | 'end';

const stickyBar =
  'sticky bottom-[var(--app-nav-height)] z-10 -mx-5 border-t-[3px] border-ink bg-surface-tint px-5 py-3';
const menuItem = 'flex min-h-12 items-center text-base';

function Confirm({
  title,
  children,
  keepLabel,
  confirmLabel,
  busy,
  error,
  onKeep,
  onConfirm,
}: {
  title: string;
  children: ReactNode;
  keepLabel: string;
  confirmLabel: string;
  busy: boolean;
  error: string;
  onKeep(): void;
  onConfirm(): void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const keep = useRef(onKeep);
  keep.current = onKeep;
  useEffect(() => {
    heading.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') keep.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 px-5 pt-6 pb-[var(--app-nav-clear)]">
      <h1 ref={heading} tabIndex={-1} className="m-0 text-5xl font-extrabold">
        {title}
      </h1>
      {children}
      <div className="flex flex-col gap-3">
        <Button variant="secondary" disabled={busy} onClick={onKeep}>
          {keepLabel}
        </Button>
        {error ? (
          <p role="alert" className="m-0 text-base font-bold">
            {error}
          </p>
        ) : null}
        <Button disabled={busy} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}

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
  onChangeDirection,
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

  const rebuild = async () => {
    setBusy(true);
    setError('');
    try {
      const next = buildProgram({
        preferences,
        daysPerWeek: program.daysPerWeek,
        emphasis: program.emphasis,
        startDate: today,
        now: new Date().toISOString(),
        id: crypto.randomUUID(),
        block: program.block,
        ...(program.curated ? { pool: beginnerExerciseIds } : {}),
      });
      if (!next) {
        setError('Det gick inte att bygga ett program med din utrustning.');
        return;
      }
      await saveTrainingProgram(getDb(), next);
      setView('home');
    } catch {
      setError('Kunde inte spara. Försök igen.');
    } finally {
      setBusy(false);
    }
  };

  const endProgram = async () => {
    setBusy(true);
    setError('');
    try {
      await getDb().meta.delete('trainingProgram');
    } catch {
      setError('Kunde inte avsluta programmet. Försök igen.');
      setBusy(false);
    }
  };

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
      <Confirm
        title="Göra om programmet?"
        keepLabel="Behåll programmet"
        confirmLabel="Gör om programmet nu"
        busy={busy}
        error={error}
        onKeep={() => {
          setError('');
          setView('home');
        }}
        onConfirm={() => void rebuild()}
      >
        <p className="m-0 text-xl">
          Du får ett nytt block med samma antal pass och tyngdpunkt, byggt på
          din utrustning nu. Blockets räknare börjar om. Sparade pass i
          historiken finns kvar.
        </p>
      </Confirm>
    );
  if (view === 'end')
    return (
      <Confirm
        title="Avsluta programmet?"
        keepLabel="Behåll programmet"
        confirmLabel="Avsluta programmet nu"
        busy={busy}
        error={error}
        onKeep={() => {
          setError('');
          setView('home');
        }}
        onConfirm={() => void endProgram()}
      >
        <p className="m-0 text-xl">
          Programmet tas bort från hemskärmen. Sparade pass i historiken finns
          kvar, och du kan skapa ett nytt program senare.
        </p>
      </Confirm>
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

  const menu = (
    <details>
      <summary className="min-h-12 cursor-pointer py-3 text-base font-bold">
        Ändra
      </summary>
      <div className="flex flex-col">
        <Link
          href="/installningar/utrustning?tillbaka=traning"
          className={`${menuItem} ${linkClass}`}
        >
          Min utrustning
        </Link>
        <Link href="/nytt-pass" className={`${menuItem} ${linkClass}`}>
          Skapa eget pass
        </Link>
        <Link href="/fokus" className={`${menuItem} ${linkClass}`}>
          Träna något annat idag
        </Link>
        <button
          type="button"
          disabled={locked}
          onClick={() => setView('redo')}
          className={`${menuItem} ${linkClass} self-start disabled:opacity-50`}
        >
          Gör om programmet
        </button>
        <Link href="/ovningar" className={`${menuItem} ${linkClass}`}>
          Bläddra bland övningar
        </Link>
        <button
          type="button"
          disabled={locked}
          onClick={onChangeDirection}
          className={`${menuItem} ${linkClass} self-start disabled:opacity-50`}
        >
          Byt inriktning
        </button>
        <button
          type="button"
          disabled={locked}
          onClick={() => setView('end')}
          className={`${menuItem} ${linkClass} self-start disabled:opacity-50`}
        >
          Avsluta programmet
        </button>
        {locked ? (
          <p className="m-0 text-base text-ink-soft">
            Avsluta eller avbryt passet innan du ändrar programmet.
          </p>
        ) : null}
      </div>
    </details>
  );

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
      {menu}
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
        {tail}
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 px-5 pt-6 pb-[var(--app-nav-clear)]">
      <h1 className="count m-0 text-5xl leading-none">
        Vecka {progress.week} <span className="text-3xl">av {BLOCK_WEEKS}</span>
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
      {tail}
    </div>
  );
}
