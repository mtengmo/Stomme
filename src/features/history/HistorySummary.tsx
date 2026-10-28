import { Link } from 'wouter';
import type { PainLog, Session } from '../../domain/types';
import { formatShortDate, formatWeekday } from '../../lib/dates';
import { historySummary } from '../../rules/history';

function passText(count: number): string {
  return `${count} pass`;
}

/** Four plain facts about the user's own sessions, read before any list or chart. */
export function HistorySummary({
  sessions,
  painLogs,
  today,
}: {
  sessions: readonly Session[];
  painLogs: readonly PainLog[];
  today: string;
}) {
  const s = historySummary(sessions, painLogs, today);
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: 'Den här veckan', value: passText(s.weekCompleted) },
    {
      label: 'Senaste 4 veckorna',
      value: `${passText(s.fourWeeksCompleted)}${
        s.fourWeeksAborted > 0 ? ` · ${s.fourWeeksAborted} avbrutet` : ''
      }`,
    },
  ];
  if (s.last)
    rows.push({
      label: 'Senaste passet',
      value: (
        <Link
          href={`/historik/${s.last.id}`}
          className="inline-flex min-h-12 items-center font-bold text-ink underline"
        >
          {s.last.customWorkoutName ??
            `${s.last.workoutMode === 'short' ? 'Kortpass' : 'Pass'} ${s.last.templateId}`}{' '}
          · {formatWeekday(s.last.date)} {formatShortDate(s.last.date)}
        </Link>
      ),
    });
  if (s.lastPainAfter !== undefined)
    rows.push({
      label: 'Smärta efter senaste passet',
      value: `${s.lastPainAfter} av 10`,
    });
  return (
    <section aria-label="Sammanfattning" className="flex flex-col gap-1">
      <dl className="m-0 flex flex-col">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex flex-wrap items-baseline justify-between gap-x-4 border-t-2 border-edge py-3"
          >
            <dt className="text-base text-ink-soft">{row.label}</dt>
            <dd className="count m-0 text-2xl">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
