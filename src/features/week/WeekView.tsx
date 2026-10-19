import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'wouter';
import { templates } from '../../content/templates';
import { getDb } from '../../db/db';
import { listSessions } from '../../db/repo';
import type { Session, TemplateId } from '../../domain/types';
import { formatShortDate, formatWeekday, toLocalDate } from '../../lib/dates';
import { restStatus, weekSummary } from '../../rules/schedule';
import { buttonClass } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { PencilTick } from '../../ui/PencilTick';
import { Tally, type TallyItem } from '../../ui/Tally';
import { careState } from '../pain/careState';
import { DayAfterNotices, StopBanner } from '../pain/PainNotices';
import {
  isoWeekNumber,
  type PassState,
  passStates,
  STATE_LABEL,
} from './passState';

const DAY_NAMES = ['mån', 'tis', 'ons', 'tors', 'fre', 'lör', 'sön'];
const IDS: TemplateId[] = ['A', 'B'];

function setTotal(id: TemplateId): number {
  return templates[id].items.reduce((n, i) => n + i.sets, 0);
}

/** One tally item per exercise; sets done come from the pass's in-progress session logs. */
function tallyItems(
  id: TemplateId,
  complete: boolean,
  doneByExercise: Map<string, number>,
): TallyItem[] {
  return templates[id].items.map((it) => ({
    id: it.exerciseId,
    remaining: complete
      ? 0
      : Math.max(0, it.sets - (doneByExercise.get(it.exerciseId) ?? 0)),
  }));
}

function restText(sessions: Session[], now: Date): string | null {
  const { ok, earliestNext } = restStatus(sessions, now);
  if (earliestNext === null) return null;
  if (ok) return 'Vila: klar. Du kan köra när du vill.';
  const day = formatWeekday(toLocalDate(earliestNext));
  const time = earliestNext.toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `Vila – tidigast ${day} ${time}`;
}

const chipStyle: Record<PassState, string> = {
  done: 'border-2 border-red text-red',
  today: 'bg-amber text-amber-ink',
  upcoming: 'bg-upcoming text-upcoming-ink',
};

function StateChip({ state }: { state: PassState }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-base font-bold ${chipStyle[state]}`}
    >
      <Icon
        name={state === 'done' ? 'check' : state === 'today' ? 'sun' : 'clock'}
        size={18}
      />
      {STATE_LABEL[state]}
    </span>
  );
}

export function WeekView({ now: nowProp }: { now?: Date }) {
  const sessions = useLiveQuery(() => listSessions(getDb()), []);
  const logs = useLiveQuery(() => getDb().setLogs.toArray(), []);
  const painLogs = useLiveQuery(() => getDb().painLogs.toArray(), []);
  if (sessions === undefined || logs === undefined || painLogs === undefined)
    return null;

  const now = nowProp ?? new Date();
  const today = toLocalDate(now);
  const summary = weekSummary(sessions, today);
  const { states, next } = passStates(sessions, today);
  const rest = restText(sessions, now);
  const care = careState(sessions, painLogs, today);
  const active = sessions.find((s) => s.status === 'in_progress');
  const doneDates = new Set(summary.completed.map((s) => s.date));
  const first = summary.days[0] ?? today;
  const last = summary.days[6] ?? today;

  const doneFor = (id: TemplateId): Map<string, number> => {
    const open = sessions.find(
      (s) => s.status === 'in_progress' && s.templateId === id,
    );
    const m = new Map<string, number>();
    if (!open) return m;
    for (const l of logs) {
      if (l.sessionId === open.id)
        m.set(l.exerciseId, (m.get(l.exerciseId) ?? 0) + 1);
    }
    return m;
  };

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4.5rem)] max-w-md flex-col gap-5 px-5 pt-5 pb-28">
      <header>
        <h1 className="m-0 text-5xl leading-none font-extrabold">
          Vecka {isoWeekNumber(today)}
        </h1>
        <p className="m-0 mt-2 text-base text-ink-soft">
          {formatShortDate(first)} – {formatShortDate(last)}
        </p>
      </header>

      {care.stopBanner ? <StopBanner /> : null}
      <DayAfterNotices care={care} today={today} />

      <ol
        className="m-0 flex list-none justify-between p-0"
        aria-label="Veckans dagar"
      >
        {summary.days.map((d, i) => {
          const isToday = d === today;
          const isDone = doneDates.has(d);
          return (
            <li
              key={d}
              aria-current={isToday ? 'date' : undefined}
              aria-label={`${DAY_NAMES[i]} ${Number(d.slice(8))}${isDone ? ', pass klart' : ''}${isToday ? ', idag' : ''}`}
              className={`relative flex size-11 flex-col items-center justify-center rounded-sm border-2 text-base leading-none ${
                isToday
                  ? 'border-ink bg-amber font-bold text-amber-ink'
                  : 'border-edge bg-paper text-ink'
              }`}
            >
              <span>{DAY_NAMES[i]}</span>
              <span className="count mt-0.5 text-xl leading-none">
                {Number(d.slice(8))}
              </span>
              {isDone ? (
                <PencilTick
                  size={24}
                  variant={i}
                  className="absolute -top-3.5 -right-3"
                />
              ) : null}
            </li>
          );
        })}
      </ol>

      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {IDS.map((id) => {
          const state = states[id];
          const total = setTotal(id);
          const items = tallyItems(id, state === 'done', doneFor(id));
          const left = items.reduce((n, i) => n + i.remaining, 0);
          const done = total - left;
          const lead = id === next && state !== 'done';
          const label = `${templates[id].name}: ${done} av ${total} set klara`;
          return (
            <li
              key={id}
              data-state={state}
              className={`flex flex-col rounded-md border-[3px] bg-paper ${
                lead ? 'gap-4 border-ink p-5' : 'gap-3 border-edge p-4'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2
                    className={`m-0 leading-none font-bold ${lead ? 'text-6xl' : 'text-4xl'}`}
                  >
                    {templates[id].name}
                  </h2>
                  {lead ? (
                    <p className="m-0 mt-2 text-lg font-bold text-blue">
                      Nästa pass
                    </p>
                  ) : null}
                </div>
                <StateChip state={state} />
              </div>
              {lead ? (
                <p className="count m-0 mt-auto text-7xl leading-none">
                  {done}
                  <span className="text-4xl text-ink-soft">/{total} set</span>
                </p>
              ) : null}
              <Tally
                items={items}
                label={label}
                size={lead ? 48 : 36}
                tone={lead ? 'ink' : 'edge'}
              />
            </li>
          );
        })}
      </ul>

      <div className="sticky bottom-[5.25rem] mt-auto flex flex-col gap-2">
        {rest ? <p className="m-0 text-base text-ink-soft">{rest}</p> : null}
        {active ? (
          <Link
            href={`/session/${active.id}`}
            className={buttonClass('primary')}
          >
            Fortsätt passet
          </Link>
        ) : (
          <Link href={`/pass/${next}`} className={buttonClass('primary')}>
            Starta pass
          </Link>
        )}
      </div>
    </div>
  );
}
