import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'wouter';
import { templates } from '../../content/templates';
import { getDb } from '../../db/db';
import { listSessions } from '../../db/repo';
import type { Session, TemplateId } from '../../domain/types';
import { formatShortDate, formatWeekday, toLocalDate } from '../../lib/dates';
import { shouldRemindBackup } from '../../lib/storage';
import { restStatus, weekSummary } from '../../rules/schedule';
import { buttonClass } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { PencilTick } from '../../ui/PencilTick';
import { Tally } from '../../ui/Tally';
import { careState } from '../pain/careState';
import { DayAfterNotices, StopBanner } from '../pain/PainNotices';
import { BackupReminder, readBackupMeta } from './BackupReminder';
import {
  isoWeekNumber,
  type PassState,
  passStates,
  STATE_LABEL,
} from './passState';
import { StaleSession } from './StaleSession';
import { weekTally } from './weekTally';

const DAY_NAMES = ['mån', 'tis', 'ons', 'tors', 'fre', 'lör', 'sön'];
const IDS: TemplateId[] = ['A', 'B'];
const PASS_PURPOSE: Record<TemplateId, string> = {
  A: 'Knäböj, steg och höftfällning · bål',
  B: 'Utfall, bäckenlyft och vader · bål',
};

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
  done: 'border-2 border-(--done-chip-border) bg-(--done-fill) text-(--done-fill-ink)',
  today: 'bg-today text-today-ink',
  upcoming: 'bg-upcoming text-upcoming-ink',
};

function StateChip({
  state,
  active = false,
}: {
  state: PassState;
  active?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-base font-bold ${active ? 'border-2 border-accent text-accent' : chipStyle[state]}`}
    >
      {!active && state === 'done' ? (
        <PencilTick size={22} fill="var(--done-fill-ink)" />
      ) : (
        <Icon
          name={active ? 'clock' : state === 'today' ? 'sun' : 'clock'}
          size={18}
        />
      )}
      {active ? 'Pågår' : STATE_LABEL[state]}
    </span>
  );
}

export function WeekView({ now: nowProp }: { now?: Date }) {
  const sessions = useLiveQuery(() => listSessions(getDb()), []);
  const logs = useLiveQuery(() => getDb().setLogs.toArray(), []);
  const painLogs = useLiveQuery(() => getDb().painLogs.toArray(), []);
  const backupMeta = useLiveQuery(
    async () => ({
      value: await readBackupMeta(),
    }),
    [],
  );
  if (
    sessions === undefined ||
    logs === undefined ||
    painLogs === undefined ||
    backupMeta === undefined
  )
    return null;

  const now = nowProp ?? new Date();
  const today = toLocalDate(now);
  const summary = weekSummary(sessions, today);
  const { states, next } = passStates(sessions, today);
  const rest = restText(sessions, now);
  const care = careState(sessions, painLogs, today);
  const completedTimes = sessions
    .filter((s) => s.status === 'completed')
    .map((s) => s.startedAt);
  const snoozed =
    backupMeta.value?.snoozedUntil !== undefined &&
    now.toISOString() < backupMeta.value.snoozedUntil;
  // Pain notices outrank the backup reminder.
  const remindBackup =
    !snoozed &&
    !care.stopBanner &&
    !care.dayAfterWorse &&
    !care.dayAfterDue &&
    shouldRemindBackup({
      lastExportAt: backupMeta.value?.lastExportAt,
      completedSessionTimes: completedTimes,
      now,
    });
  const active = sessions.find((s) => s.status === 'in_progress');
  const stale = sessions.find(
    (s) => s.status === 'in_progress' && s.date < today,
  );
  const doneDates = new Set(summary.completed.map((s) => s.date));
  const first = summary.days[0] ?? today;
  const last = summary.days[6] ?? today;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 pt-5 pb-[var(--app-nav-height)]">
      <header>
        <h1 className="m-0 text-5xl leading-none font-extrabold">
          Vecka {isoWeekNumber(today)}
        </h1>
        <p className="m-0 mt-2 text-base text-ink-soft">
          {formatShortDate(first)} – {formatShortDate(last)}
        </p>
        <p className="m-0 mt-3 text-base text-ink-soft">
          Två styrkepass för ben, höft och bål som stöd till löpningen.
        </p>
        <Link
          href="/ovningar"
          className="mt-1 inline-flex min-h-12 items-center gap-2 text-base font-bold underline decoration-2 underline-offset-4"
        >
          Övningar
          <Icon name="back" size={20} className="rotate-180" />
        </Link>
      </header>

      {care.stopBanner ? <StopBanner /> : null}
      <DayAfterNotices care={care} today={today} />
      {stale ? <StaleSession session={stale} /> : null}

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
                  ? 'border-ink bg-today font-bold text-today-ink'
                  : 'border-edge bg-surface text-ink'
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
          const open = sessions.find(
            (s) => s.templateId === id && s.status === 'in_progress',
          );
          const snapshot =
            open ??
            summary.completed
              .filter((s) => s.templateId === id)
              .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
          const { total, done, items } = weekTally(id, snapshot, logs);
          const lead = open !== undefined || (id === next && state !== 'done');
          const label = `${templates[id].name}: ${done} av ${total} set klara`;
          return (
            <li
              key={id}
              data-state={state}
              className={`flex flex-col rounded-md border-[3px] ${
                lead
                  ? 'gap-4 border-ink bg-surface-tint p-5'
                  : 'gap-3 border-edge bg-surface p-4'
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
                    <p className="m-0 mt-2 text-lg font-bold text-accent">
                      Nästa pass
                    </p>
                  ) : null}
                </div>
                <StateChip state={state} active={open !== undefined} />
              </div>
              <p className="m-0 text-base text-ink-soft">{PASS_PURPOSE[id]}</p>
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

      {remindBackup ? (
        <BackupReminder
          meta={backupMeta.value}
          completedTimes={completedTimes}
          now={now}
        />
      ) : null}

      <div className="sticky bottom-[var(--app-nav-height)] -mx-5 mt-auto flex flex-col gap-2 border-t-[3px] border-ink bg-surface-tint px-5 py-3">
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
