import { useLiveQuery } from 'dexie-react-hooks';
import { Link, Redirect } from 'wouter';
import { focusLabel } from '../../content/focusPresets';
import { isTrainingPreferences } from '../../content/programmes';
import { getDb } from '../../db/db';
import { readTrainingProgram } from '../../db/program';
import { getMeta, listSessions } from '../../db/repo';
import { toLocalDate } from '../../lib/dates';
import { BLOCK_WEEKS, programProgress } from '../../rules/programProgress';
import { buttonClass } from '../../ui/Button';
import { linkClass } from '../../ui/link';
import { BlockProgress } from './BlockProgress';
import { PauseFiguresButton } from './ExerciseThumb';
import { PassCard } from './PassCard';
import { ProgramWeekStrip } from './ProgramWeekStrip';
import {
  cardExercises,
  emphasisLabels,
  passMinutes,
  passPlan,
  programDays,
  weekdayAbbr,
} from './programView';

/** Where "Ändra programmet" leads: the days step of the setup. */
export const CHANGE_PROGRAM_HREF = '/kom-igang?steg=days';

/** The first view of a new programme: facts and the pass to start, no warnings. */
export function ProgramReveal() {
  const data = useLiveQuery(async () => {
    const db = getDb();
    return {
      preferences: await getMeta(db, 'training'),
      program: await readTrainingProgram(db),
      sessions: await listSessions(db),
      logs: await db.setLogs.toArray(),
    };
  }, []);
  if (!data) return null;
  const { preferences, program } = data;
  if (
    !program ||
    !isTrainingPreferences(preferences) ||
    preferences.programId !== 'general'
  )
    return <Redirect to="/" />;
  const progress = programProgress(program, data.sessions);
  if (progress.done > 0) return <Redirect to="/" />;

  const today = toLocalDate(new Date());
  const days = programDays(program, data.sessions, today);
  const passes = program.passes.map((pass, index) => {
    const number = index + 1;
    const { plan } = passPlan(
      program,
      index,
      preferences,
      data.sessions,
      data.logs,
    );
    return { pass, plan, number };
  });
  const first = passes[0];
  const total = program.daysPerWeek * BLOCK_WEEKS;
  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 px-5 pt-6 pb-[var(--app-nav-clear)]">
      <header className="flex flex-col gap-2">
        <h1 className="m-0 text-5xl font-extrabold">Ditt program</h1>
        <p className="count m-0 text-2xl leading-tight">
          {BLOCK_WEEKS} veckor · {program.daysPerWeek} pass i veckan ·{' '}
          {emphasisLabels[program.emphasis]}
        </p>
      </header>
      <p className="count m-0 text-3xl leading-none">
        Vecka 1 <span className="text-2xl">av {BLOCK_WEEKS}</span>
      </p>
      <BlockProgress
        done={0}
        total={total}
        currentWeek={1}
        completedWeeks={0}
      />
      <ProgramWeekStrip
        today={today}
        plannedDates={days.plannedDates}
        doneDates={days.doneDates}
        nextDate={days.nextDate}
        suggestedWeekdays={program.weekdays}
      />
      <p className="m-0 text-lg">
        Samma pass varje vecka, så ser du att du blir starkare.
      </p>
      {first ? (
        <PassCard
          variant="lead"
          passNumber={1}
          focusLabel={focusLabel(first.pass.focus)}
          minutes={passMinutes(first.plan)}
          exercises={cardExercises(first.plan)}
          dayLabel={
            program.startDate === today
              ? 'Idag'
              : weekdayAbbr(program.weekdays[0] ?? 1)
          }
          isToday={program.startDate === today}
          showLegend
        />
      ) : null}
      <PauseFiguresButton className="self-start" />
      {passes.slice(1).map(({ pass, plan, number }) => (
        <PassCard
          key={`pass-${number}`}
          variant="receding"
          passNumber={number}
          focusLabel={focusLabel(pass.focus)}
          minutes={passMinutes(plan)}
          exercises={cardExercises(plan)}
          dayLabel={weekdayAbbr(program.weekdays[number - 1] ?? 1)}
        />
      ))}
      <Link href={CHANGE_PROGRAM_HREF} className={`${linkClass} min-h-12 py-3`}>
        Ändra programmet
      </Link>
      <div className="sticky bottom-[var(--app-nav-height)] z-10 -mx-5 border-t-[3px] border-ink bg-surface-tint px-5 py-3">
        <Link href="/traning/A?program=1" className={buttonClass('primary')}>
          Starta första passet
        </Link>
      </div>
    </div>
  );
}
