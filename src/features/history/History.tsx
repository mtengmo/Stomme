import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'wouter';
import { BarChart } from '../../charts/BarChart';
import { PainChart } from '../../charts/PainChart';
import { StepLineChart } from '../../charts/StepLineChart';
import { exercises } from '../../content/exercises';
import { trainingName } from '../../content/programmes';
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
import { sessionSetProgress, symptomSummary } from '../../rules/history';
import { loggedExerciseIds, weeklyVolume } from '../../rules/stats';
import { buttonClass } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { isoWeekNumber } from '../week/passState';
import { HistoryTrends } from './HistoryTrends';

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

  const [programme, setProgramme] = useState('all');

  const [status, setStatus] = useState('all');

  const [period, setPeriod] = useState('all');

  const [exercise, setExercise] = useState('');

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
          Till träningen
        </Link>
      </div>
    );
  }

  const today = toLocalDate(new Date());

  const filtered = sessions.filter(
    (s) =>
      (programme === 'all' ||
        (programme === 'legacy'
          ? !s.programId
          : programme === 'knee'
            ? s.programId === 'rehab' && s.rehabFocus === 'knee'
            : s.programId === programme &&
              (programme !== 'rehab' || s.rehabFocus !== 'knee'))) &&
      (status === 'all' || s.status === status) &&
      (period === 'all' || s.date >= addDays(today, -Number(period))),
  );

  const filteredIds = new Set(filtered.map((s) => s.id));

  const filteredLogs = setLogs.filter((l) => filteredIds.has(l.sessionId));

  const legacyIds = new Set(
    filtered.filter((s) => !s.programId).map((s) => s.id),
  );

  const legacyLogs = filteredLogs.filter((l) => legacyIds.has(l.sessionId));

  const legacyPain = painLogs.filter((p) => legacyIds.has(p.sessionId));

  const weeks = weeklyVolume(filtered, filteredLogs, {
    through: today,
    weeks: 12,
  });

  const setsBySession = new Map<string, Set<string>>();

  for (const l of setLogs) {
    const set = setsBySession.get(l.sessionId) ?? new Set<string>();

    set.add(`${l.exerciseId}|${l.setNumber}`);

    setsBySession.set(l.sessionId, set);
  }

  const hasPain = legacyPain.length > 0;

  const exerciseIds = loggedExerciseIds(legacyLogs);

  const allExercises = loggedExerciseIds(filteredLogs);

  const selectedExercise = allExercises.includes(
    exercise as (typeof allExercises)[number],
  )
    ? exercise
    : (allExercises[0] ?? '');

  const selectClass =
    'min-h-12 w-full rounded-sm border-2 border-edge bg-paper px-3 text-base text-ink';

  return (
    <div className="mx-auto flex max-w-md flex-col gap-8 px-5 pt-6 pb-28">
      <h1 className="m-0 text-5xl font-extrabold">Historik</h1>
      <p className="m-0 text-lg">Se vad du gjorde och hur kroppen kändes.</p>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-base font-bold">
          Träningsinriktning
          <select
            className={selectClass}
            value={programme}
            onChange={(e) => setProgramme(e.target.value)}
          >
            <option value="all">Alla inriktningar</option>
            <option value="general">Allmän styrka</option>
            <option value="running">Styrka för löpning</option>
            <option value="knee">Knärehab · AAOS</option>
            <option value="rehab">Mitt eget rehabprogram</option>
            <option value="legacy">Ursprungligt knä- och löpprogram</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-base font-bold">
            Status
            <select
              className={selectClass}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">Alla pass</option>
              <option value="completed">Klara</option>
              <option value="aborted">Avbrutna</option>
              <option value="in_progress">Pågående</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-base font-bold">
            Period
            <select
              className={selectClass}
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="all">Alla datum</option>
              <option value="28">Senaste 4 veckorna</option>
              <option value="84">Senaste 12 veckorna</option>
            </select>
          </label>
        </div>
        <p role="status" className="m-0 text-base text-ink-soft">
          {filtered.length} pass visas
        </p>
      </div>
      <section className="flex flex-col gap-5" aria-label="Alla pass">
        <h2 className="m-0 text-3xl font-bold">Alla pass</h2>
        {filtered.length === 0 ? (
          <p className="m-0 text-lg">
            Inga pass matchar dina filter. Välj en annan inriktning, status
            eller period.
          </p>
        ) : null}
        {groupByWeek(filtered).map((g) => {
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
                      className="flex min-h-16 flex-wrap items-center justify-between gap-3 rounded-md border-2 border-edge bg-paper p-4 text-ink no-underline"
                    >
                      <span className="flex flex-col">
                        <span className="count text-3xl leading-none">
                          Pass {s.templateId}
                        </span>
                        <span className="mt-1 text-base font-bold">
                          {trainingName(s)}
                        </span>
                        <span className="text-base text-ink-soft">
                          {formatWeekday(s.date)} {formatShortDate(s.date)} ·{' '}
                          {sessionSetProgress(s, setLogs).done}/
                          {sessionSetProgress(s, setLogs).total} hela set
                        </span>
                        <span className="mt-1 text-base text-ink-soft">
                          {symptomSummary(s, painLogs)}
                        </span>
                        {s.status === 'completed' &&
                        sessionSetProgress(s, setLogs).done <
                          sessionSetProgress(s, setLogs).total ? (
                          <span className="text-base font-bold">
                            Delvis genomfört
                          </span>
                        ) : null}
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
      {allExercises.length ? (
        <section
          aria-labelledby="exercise-history"
          className="flex flex-col gap-3 border-t-[3px] border-ink pt-5"
        >
          <h2 id="exercise-history" className="m-0 text-3xl font-bold">
            Jämför en övning
          </h2>
          <label className="flex flex-col gap-1 text-base font-bold">
            Övning
            <select
              className={selectClass}
              value={selectedExercise}
              onChange={(e) => setExercise(e.target.value)}
            >
              {allExercises.map((id) => (
                <option key={id} value={id}>
                  {exercises[id].name}
                </option>
              ))}
            </select>
          </label>
          <Link
            href={`/historik/ovning/${selectedExercise}`}
            className={buttonClass('secondary')}
          >
            Visa övningshistorik
          </Link>
          <p className="m-0 text-base text-ink-soft">
            Jämför faktiska set med samma utrustning och sida.
          </p>
        </section>
      ) : null}
      <HistoryTrends sessions={filtered} today={today} />
      <BarChart weeks={weeks} />
      {exerciseIds.length > 0 ? (
        <section aria-label="Ursprungliga programmets belastning">
          <p className="m-0 text-base text-ink-soft">
            Belastningen nedan gäller det ursprungliga knä- och löpprogrammet.
            För nya pass: använd Jämför en övning.
          </p>
          <StepLineChart logs={legacyLogs} exerciseIds={exerciseIds} />
        </section>
      ) : null}
      {hasPain ? <PainChart painLogs={legacyPain} /> : null}
    </div>
  );
}
