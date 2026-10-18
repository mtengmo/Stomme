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
import { Ring } from '../../ui/Ring';
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
  if (sessions === undefined) return null;

  const now = nowProp ?? new Date();
  const today = toLocalDate(now);
  const summary = weekSummary(sessions, today);
  const { states, next } = passStates(sessions, today);
  const rest = restText(sessions, now);
  const doneDates = new Set(summary.completed.map((s) => s.date));
  const first = summary.days[0] ?? today;
  const last = summary.days[6] ?? today;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4.5rem)] max-w-md flex-col gap-6 px-5 pt-6 pb-28">
      <header>
        <h1 className="m-0 text-3xl leading-tight font-bold text-balance">
          Vecka <span className="count text-4xl">{isoWeekNumber(today)}</span>
        </h1>
        <p className="m-0 mt-1 text-base text-ink-soft">
          {formatShortDate(first)} – {formatShortDate(last)}
        </p>
      </header>

      <ol
        className="m-0 grid list-none grid-cols-7 gap-1.5 p-0"
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
              className={`flex aspect-square flex-col items-center justify-center rounded-sm border-2 text-sm ${
                isToday
                  ? 'border-ink bg-amber text-amber-ink font-bold'
                  : 'border-ink-soft/50 bg-paper text-ink'
              }`}
            >
              <span>{DAY_NAMES[i]}</span>
              <span className="count text-xl leading-none">
                {Number(d.slice(8))}
              </span>
              <span className="h-[18px]">
                {isDone ? (
                  <Icon name="check" size={18} className="text-red" />
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>

      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {IDS.map((id) => {
          const state = states[id];
          const total = setTotal(id);
          const done = state === 'done' ? total : 0;
          const isNext = id === next && state !== 'done';
          return (
            <li
              key={id}
              data-state={state}
              className={`flex items-center gap-4 rounded-md border-[3px] bg-paper p-4 ${
                isNext ? 'border-ink' : 'border-ink-soft/50'
              }`}
            >
              <Ring
                done={done}
                total={total}
                label={`${templates[id].name}: ${done} av ${total} set klara`}
              />
              <div className="flex min-w-0 flex-col items-start gap-2">
                <h2 className="m-0 text-2xl leading-none font-bold">
                  {templates[id].name}
                </h2>
                <StateChip state={state} />
                {isNext ? (
                  <p className="m-0 text-base font-bold text-blue">
                    Nästa pass
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto flex flex-col gap-3">
        {rest ? <p className="m-0 text-base text-ink-soft">{rest}</p> : null}
        <Link href={`/pass/${next}`} className={buttonClass('primary')}>
          Starta pass
        </Link>
      </div>
    </div>
  );
}
