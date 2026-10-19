import { isoWeekNumber } from '../features/week/passState';
import { formatShortDate } from '../lib/dates';
import type { WeekVolume } from '../rules/stats';
import { ChartShell } from './ChartShell';
import { bandScale, linearScale } from './scales';

const W = 320;
const H = 200;
const TOP = 28;
const BASE = 168;

/** Sets per week as bars: graphite, the running week in blue ink. */
export function BarChart({ weeks }: { weeks: WeekVolume[] }) {
  const n = weeks.length;
  const max = Math.max(1, ...weeks.map((w) => w.sets));
  const x = bandScale(n, [4, W - 4], 0.25);
  const y = linearScale([0, max], [BASE, TOP]);
  const lastFour = weeks.slice(-4).reduce((sum, w) => sum + w.sets, 0);
  const running = weeks[n - 1];
  const summary = `Senaste 4 veckorna: ${lastFour} set. ${
    running && running.sets > 0
      ? 'Blå stapel är veckan som pågår.'
      : 'Veckan som pågår har inga set än.'
  }`;

  return (
    <ChartShell
      title="Set per vecka"
      summary={summary}
      table={{
        caption: `Set och lyft per vecka, senaste ${n} veckorna`,
        head: ['Vecka', 'Set', 'Lyft (kg)'],
        rows: weeks.map((w) => [
          `v${isoWeekNumber(w.weekStart)}, ${formatShortDate(w.weekStart)}`,
          String(w.sets),
          String(Math.round(w.tonnageKg)),
        ]),
      }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={`Stapeldiagram, set per vecka, senaste ${n} veckorna. ${summary}`}
        className="block"
      >
        <line
          x1={0}
          x2={W}
          y1={BASE}
          y2={BASE}
          className="stroke-ink"
          strokeWidth={2}
        />
        {weeks.map((w, i) => {
          const current = i === n - 1;
          const h = BASE - y(w.sets);
          const labelled = (n - 1 - i) % 4 === 0;
          return (
            <g key={w.weekStart}>
              {w.sets > 0 ? (
                <>
                  <rect
                    x={x(i)}
                    y={y(w.sets)}
                    width={x.bandwidth}
                    height={h}
                    rx={2}
                    className={current ? 'fill-blue' : 'fill-ink'}
                  />
                  <text
                    x={x.center(i)}
                    y={y(w.sets) - 6}
                    textAnchor="middle"
                    fontSize={18}
                    className="count fill-ink"
                  >
                    {w.sets}
                  </text>
                </>
              ) : null}
              {w.sets === 0 ? (
                <>
                  <rect
                    x={x(i)}
                    y={BASE - 3}
                    width={x.bandwidth}
                    height={3}
                    className={current ? 'fill-blue' : 'fill-ink'}
                  />
                  <text
                    x={x.center(i)}
                    y={BASE - 10}
                    textAnchor="middle"
                    fontSize={18}
                    className={`count ${current ? 'fill-blue' : 'fill-ink-soft'}`}
                  >
                    0
                  </text>
                </>
              ) : null}
              {labelled ? (
                <text
                  x={x.center(i)}
                  y={BASE + 24}
                  textAnchor="middle"
                  fontSize={16}
                  className={`count ${current ? 'fill-blue' : 'fill-ink-soft'}`}
                >
                  v{isoWeekNumber(w.weekStart)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </ChartShell>
  );
}
