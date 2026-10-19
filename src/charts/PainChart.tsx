import type { PainLog } from '../domain/types';
import { daysBetween, formatShortDate } from '../lib/dates';
import { type PainPoint, painSeries } from '../rules/stats';
import { ChartShell } from './ChartShell';
import { linearScale } from './scales';

const W = 320;
const LANE_STEP = 100;
const LANE_PLOT = 56;
const H = LANE_STEP * 3 + 24;
const LEFT = 36;
const RIGHT = 304;

type Timing = PainLog['timing'];

const TIMINGS: Timing[] = ['before', 'after', 'dayAfter'];
const LABEL: Record<Timing, string> = {
  before: 'Före',
  after: 'Efter',
  dayAfter: 'Dagen efter',
};
const TONE: Record<Timing, { fill: string; stroke: string }> = {
  before: { fill: 'fill-paper', stroke: 'stroke-ink' },
  after: { fill: 'fill-blue', stroke: 'stroke-blue' },
  dayAfter: { fill: 'fill-edge', stroke: 'stroke-ink-soft' },
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
  const x = linearScale([0, span], [LEFT + 10, RIGHT - 10]);
  const px = (p: PainPoint) => x(daysBetween(first, p.date));

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
        {TIMINGS.map((t, i) => {
          const top = i * LANE_STEP + 30;
          const y = linearScale([0, 10], [top + LANE_PLOT, top]);
          return (
            <g key={t}>
              <text
                x={0}
                y={top - 6}
                fontSize={16}
                className="font-bold fill-ink"
              >
                {LABEL[t]}
              </text>
              <rect
                x={LEFT}
                y={y(3)}
                width={RIGHT - LEFT + 8}
                height={y(0) - y(3)}
                className="fill-upcoming"
              />
              <line
                x1={LEFT}
                x2={RIGHT + 8}
                y1={y(0)}
                y2={y(0)}
                className="stroke-edge"
                strokeWidth={1}
              />
              {[0, 10].map((v) => (
                <text
                  key={v}
                  x={LEFT - 8}
                  y={y(v) + 5}
                  textAnchor="end"
                  fontSize={16}
                  className="count fill-ink-soft"
                >
                  {v}
                </text>
              ))}
              <polyline
                fill="none"
                className={TONE[t].stroke}
                strokeWidth={1.5}
                points={series[t]
                  .map((p) => `${px(p)},${y(p.score)}`)
                  .join(' ')}
              />
              {series[t].map((p) => (
                <Marker
                  key={p.sessionId}
                  timing={t}
                  cx={px(p)}
                  cy={y(p.score)}
                  size={4}
                />
              ))}
            </g>
          );
        })}
        <text x={LEFT} y={H - 4} fontSize={16} className="fill-ink-soft">
          {formatShortDate(first)}
        </text>
        {span > 1 ? (
          <text
            x={RIGHT + 4}
            y={H - 4}
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
