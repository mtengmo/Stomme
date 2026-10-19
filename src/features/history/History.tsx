import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'wouter';
import { BarChart } from '../../charts/BarChart';
import { PainChart } from '../../charts/PainChart';
import { StepLineChart } from '../../charts/StepLineChart';
import { getDb } from '../../db/db';
import { listSessions } from '../../db/repo';
import type { PainLog, Session, SetLog } from '../../domain/types';
import {
  addDays,
  formatShortDate,
  formatWeekday,
  toLocalDate,
  weekStart,
} from '../../lib/dates';
import { loggedExerciseIds, weeklyVolume } from '../../rules/stats';
import { buttonClass } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { isoWeekNumber } from '../week/passState';
import { StatusChip } from './labels';

interface HistoryData {
  sessions: Session[];
  setLogs: SetLog[];
  painLogs: PainLog[];
}

async function load(): Promise<HistoryData> {
  const db = getDb();
  return {
    sessions: await listSessions(db),
    setLogs: await db.setLogs.toArray(),
    painLogs: await db.painLogs.toArray(),
  };
}

interface WeekGroup {
  weekStart: string;
  sessions: Session[];
}

/** Newest week first; sessions inside a week newest first. Input is newest first. */
export function groupByWeek(sessions: readonly Session[]): WeekGroup[] {
  const groups: WeekGroup[] = [];
  for (const s of sessions) {
    const ws = weekStart(s.date);
    const g = groups.find((x) => x.weekStart === ws);
    if (g) g.sessions.push(s);
    else groups.push({ weekStart: ws, sessions: [s] });
  }
  return groups.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}

export function History() {
  const data = useLiveQuery(load, []);
  if (!data) return null;
  const { sessions, setLogs, painLogs } = data;

  if (sessions.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-5 px-5 pt-6 pb-28">
        <h1 className="m-0 text-5xl font-extrabold">Historik</h1>
        <p className="m-0 text-xl">
          Sidan är blank än. Det första passet skrivs upp här, set för set, så
          fort du har kört det.
        </p>
        <Link href="/" className={buttonClass('secondary')}>
          Till veckan
        </Link>
      </div>
    );
  }

  const today = toLocalDate(new Date());
  const weeks = weeklyVolume(sessions, setLogs, { through: today, weeks: 12 });
  const setsBySession = new Map<string, Set<string>>();
  for (const l of setLogs) {
    const set = setsBySession.get(l.sessionId) ?? new Set<string>();
    set.add(`${l.exerciseId}|${l.setNumber}`);
    setsBySession.set(l.sessionId, set);
  }
  const hasPain = painLogs.length > 0;
  const exerciseIds = loggedExerciseIds(setLogs);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-8 px-5 pt-6 pb-28">
      <h1 className="m-0 text-5xl font-extrabold">Historik</h1>
      <BarChart weeks={weeks} />
      {exerciseIds.length > 0 ? (
        <StepLineChart logs={setLogs} exerciseIds={exerciseIds} />
      ) : null}
      {hasPain ? <PainChart painLogs={painLogs} /> : null}

      <section className="flex flex-col gap-5" aria-label="Alla pass">
        <h2 className="m-0 text-3xl font-bold">Alla pass</h2>
        {groupByWeek(sessions).map((g) => {
          const total = g.sessions.reduce(
            (n, s) => n + (setsBySession.get(s.id)?.size ?? 0),
            0,
          );
          return (
            <div key={g.weekStart} className="flex flex-col gap-3">
              <h3 className="m-0 flex flex-wrap items-baseline justify-between gap-x-3 text-2xl font-bold">
                <span className="count">
                  Vecka {isoWeekNumber(g.weekStart)}
                </span>
                <span className="text-base font-normal text-ink-soft">
                  {formatShortDate(g.weekStart)} –{' '}
                  {formatShortDate(addDays(g.weekStart, 6))} · {total} set
                </span>
              </h3>
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {g.sessions.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/historik/${s.id}`}
                      className="flex min-h-16 items-center justify-between gap-3 rounded-md border-2 border-edge bg-paper p-4 text-ink no-underline"
                    >
                      <span className="flex flex-col">
                        <span className="count text-3xl leading-none">
                          Pass {s.templateId}
                        </span>
                        <span className="text-base text-ink-soft">
                          {formatWeekday(s.date)} {formatShortDate(s.date)} ·{' '}
                          {setsBySession.get(s.id)?.size ?? 0} set
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <StatusChip session={s} />
                        <Icon
                          name="back"
                          className="rotate-180 text-ink-soft"
                        />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}
