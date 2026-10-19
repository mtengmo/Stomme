import type { PainLog } from '../domain/types';
import { daysBetween, formatShortDate } from '../lib/dates';
import { type PainPoint, painSeries } from '../rules/stats';
import { ChartShell } from './ChartShell';
import { linearScale, niceTicks } from './scales';

const W = 320;
const H = 224;
const LEFT = 36;
const RIGHT = 304;
const TOP = 24;
const BASE = 184;

type Timing = PainLog['timing'];

const TIMINGS: Timing[] = ['before', 'after', 'dayAfter'];
/** dayAfter first so the diamonds sit behind the other two. */
const DRAW_ORDER: Timing[] = ['dayAfter', 'before', 'after'];
const LABEL: Record<Timing, string> = {
  before: 'Före',
  after: 'Efter',
  dayAfter: 'Dagen efter',
};
/** Horizontal nudge so same-day points do not hide each other. */
const NUDGE: Record<Timing, number> = { before: -8, after: 8, dayAfter: 0 };
const TONE: Record<Timing, { fill: string; stroke: string }> = {
  before: { fill: 'fill-paper', stroke: 'stroke-ink' },
  after: { fill: 'fill-blue', stroke: 'stroke-blue' },
  dayAfter: { fill: 'fill-edge', stroke: 'stroke-edge' },
};

/** The marker shape is the primary signal; colour only backs it up. */
function Marker({
  timing,
  cx,
  cy,
  size = 5,
}: {
  timing: Timing;
  cx: number;
  cy: number;
  size?: number;
}) {
  const cls = `${TONE[timing].fill} ${TONE[timing].stroke}`;
  if (timing === 'before')
    return <circle cx={cx} cy={cy} r={size} className={cls} strokeWidth={3} />;
  if (timing === 'after')
    return (
      <rect
        x={cx - size}
        y={cy - size}
        width={size * 2}
        height={size * 2}
        className={cls}
        strokeWidth={2}
      />
    );
  const d = size + 2;
  return (
    <path
      d={`M${cx} ${cy - d}L${cx + d} ${cy}L${cx} ${cy + d}L${cx - d} ${cy}Z`}
      className={cls}
      strokeWidth={2}
      strokeLinejoin="round"
    />
  );
}

function latest(points: PainPoint[]): string {
  const p = points[points.length - 1];
  return p ? String(p.score) : '–';
}

export function PainChart({ painLogs }: { painLogs: readonly PainLog[] }) {
  const series = painSeries(painLogs);
  const dates = TIMINGS.flatMap((t) => series[t].map((p) => p.date)).sort();
  const first = dates[0];
  const lastDate = dates[dates.length - 1];
  if (!first || !lastDate) return null;
  const span = Math.max(1, daysBetween(first, lastDate));
  const y = linearScale([0, 10], [BASE, TOP]);
  const x = linearScale([0, span], [LEFT + 10, RIGHT - 10]);
  const px = (t: Timing, p: PainPoint) =>
    x(daysBetween(first, p.date)) + NUDGE[t];
  const yTicks = niceTicks(0, 10, 6).ticks;

  const summary = `Senast: före ${latest(series.before)}, efter ${latest(series.after)}, dagen efter ${latest(series.dayAfter)}. Okej-zonen är 0 till 3.`;

  // One table row per session, with the three scores side by side.
  const rowMap = new Map<string, { date: string; v: Record<Timing, string> }>();
  for (const t of TIMINGS) {
    for (const p of series[t]) {
      const row = rowMap.get(p.sessionId) ?? {
        date: p.date,
        v: { before: '–', after: '–', dayAfter: '–' },
      };
      if (p.date < row.date) row.date = p.date;
      row.v[t] = String(p.score);
      rowMap.set(p.sessionId, row);
    }
  }
  const rows = [...rowMap.values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((r) => [formatShortDate(r.date), r.v.before, r.v.after, r.v.dayAfter]);

  return (
    <ChartShell
      title="Smärta i högerknäet"
      summary={summary}
      table={{
        caption: 'Smärta 0–10 före, efter och dagen efter varje pass',
        head: ['Pass', 'Före', 'Efter', 'Dagen efter'],
        rows,
      }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={`Punktdiagram, smärta 0 till 10 över tid. ${summary}`}
        className="block"
      >
        <rect
          x={LEFT}
          y={y(3)}
          width={RIGHT - LEFT + 8}
          height={y(0) - y(3)}
          className="fill-upcoming"
        />
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={LEFT}
              x2={RIGHT + 8}
              y1={y(t)}
              y2={y(t)}
              className="stroke-edge"
              strokeWidth={1}
              strokeDasharray="2 4"
            />
            <text
              x={LEFT - 8}
              y={y(t) + 5}
              textAnchor="end"
              fontSize={16}
              className="count fill-ink-soft"
            >
              {t}
            </text>
          </g>
        ))}
        {DRAW_ORDER.flatMap((t) =>
          series[t].map((p) => (
            <Marker
              key={`${t}-${p.sessionId}`}
              timing={t}
              cx={px(t, p)}
              cy={y(p.score)}
            />
          )),
        )}
        <text x={LEFT} y={H - 6} fontSize={16} className="fill-ink-soft">
          {formatShortDate(first)}
        </text>
        {span > 1 ? (
          <text
            x={RIGHT + 4}
            y={H - 6}
            textAnchor="end"
            fontSize={16}
            className="fill-ink-soft"
          >
            {formatShortDate(lastDate)}
          </text>
        ) : null}
      </svg>
      <ul className="m-0 mt-3 flex list-none flex-wrap gap-x-5 gap-y-1 p-0 text-base">
        {TIMINGS.map((t) => (
          <li key={t} className="flex items-center gap-2">
            <svg width={20} height={20} viewBox="0 0 20 20" aria-hidden="true">
              <Marker timing={t} cx={10} cy={10} size={5} />
            </svg>
            {LABEL[t]}
          </li>
        ))}
        <li className="flex items-center gap-2">
          <svg width={20} height={20} viewBox="0 0 20 20" aria-hidden="true">
            <rect
              x={1}
              y={4}
              width={18}
              height={12}
              className="fill-upcoming stroke-edge"
              strokeWidth={1}
            />
          </svg>
          Okej-zon 0–3
        </li>
      </ul>
    </ChartShell>
  );
}
