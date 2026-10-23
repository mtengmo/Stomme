import { useState } from 'react';
import { exercises } from '../content/exercises';
import type { ExerciseId, SetLog, Unit } from '../domain/types';
import { formatShortDate } from '../lib/dates';
import { type LoadPoint, loadPerExercise } from '../rules/stats';
import { ChartShell } from './ChartShell';
import { linearScale, niceTicks } from './scales';

const W = 320;
const H = 220;
const LEFT = 40;
const RIGHT = 304;
const TOP = 32;
const BASE = 176;

const UNIT_WORD: Record<Unit, string> = {
  reps: 'rep.',
  seconds: 's',
  meters: 'm',
  laps: 'varv',
};

/** Short label for a chip: the name without the parenthesis. */
export function chipName(id: ExerciseId): string {
  if (id === 'goblet-chair-squat') return 'Sitta och resa sig';
  return exercises[id].name.split(' (')[0] ?? exercises[id].name;
}

function kgText(kg: number): string {
  return kg > 0 ? `${kg} kg` : 'kroppsvikt';
}

interface StepLineChartProps {
  logs: readonly SetLog[];
  exerciseIds: ExerciseId[];
}

/** Heaviest weight per session for one exercise as a step line; chips pick the exercise. */
export function StepLineChart({ logs, exerciseIds }: StepLineChartProps) {
  const [picked, setPicked] = useState<ExerciseId | undefined>();
  const id = picked && exerciseIds.includes(picked) ? picked : exerciseIds[0];
  if (!id) return null;
  const ex = exercises[id];
  const pts: LoadPoint[] = loadPerExercise(logs, id);
  const n = pts.length;
  const last = pts[n - 1];

  const maxKg = Math.max(...pts.map((p) => p.weightKg), 0);
  const base = niceTicks(0, maxKg, 5);
  // Keep the top label off the last gridline: add a step when the max is close to it.
  const ticks =
    maxKg > base.max * 0.9 ? niceTicks(0, base.max + base.step, 5) : base;
  const y = linearScale([ticks.min, ticks.max], [BASE, TOP]);
  const x = (i: number) =>
    n === 1 ? (LEFT + RIGHT) / 2 : LEFT + ((RIGHT - LEFT) * i) / (n - 1);
  const labelAll = n <= 10;

  let path = '';
  pts.forEach((p, i) => {
    path += i === 0 ? `M${x(0)} ${y(p.weightKg)}` : `H${x(i)}V${y(p.weightKg)}`;
  });

  const unit = UNIT_WORD[ex.unit];
  const summary = last
    ? `${chipName(id)}: senast ${kgText(last.weightKg)}, ${last.amount} ${unit} (${n} pass). Siffran vid punkten är antal ${unit.replace(/\.$/, '')}.`
    : 'Inget loggat än.';

  const chips = (
    <fieldset className="m-0 min-w-0 -mx-5 flex snap-x gap-2 overflow-x-auto px-5 pb-2 border-0">
      <legend className="sr-only">Välj övning</legend>
      {exerciseIds.map((e) => {
        const on = e === id;
        return (
          <button
            key={e}
            type="button"
            aria-pressed={on}
            onClick={() => setPicked(e)}
            className={`min-h-12 shrink-0 snap-start whitespace-nowrap rounded-sm border-2 px-3 text-base font-bold ${
              on
                ? 'border-action bg-action text-action-ink'
                : 'border-edge bg-surface text-ink'
            }`}
          >
            {chipName(e)}
          </button>
        );
      })}
    </fieldset>
  );

  return (
    <ChartShell
      title="Belastning"
      summary={summary}
      controls={chips}
      table={{
        caption: `${ex.name}: tyngsta vikt och största antal per pass`,
        head: ['Datum', 'Vikt (kg)', `Antal (${unit})`],
        rows: [...pts]
          .reverse()
          .map((p) => [
            formatShortDate(p.date),
            String(p.weightKg),
            String(p.amount),
          ]),
      }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={`Stegdiagram, vikt per pass för ${ex.name}. ${summary}`}
        className="block"
      >
        <text x={0} y={16} fontSize={16} className="fill-ink-soft">
          kg
        </text>
        {ticks.ticks.map((t) => (
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
        <path
          d={path}
          fill="none"
          className="stroke-ink"
          strokeWidth={3}
          strokeLinejoin="round"
        />
        {pts.map((p, i) => {
          const isLast = i === n - 1;
          return (
            <g key={p.sessionId}>
              <circle
                cx={x(i)}
                cy={y(p.weightKg)}
                r={isLast ? 6 : 4.5}
                className={
                  isLast ? 'fill-accent stroke-paper' : 'fill-ink stroke-paper'
                }
                strokeWidth={2}
              />
              {labelAll || isLast ? (
                <text
                  x={x(i)}
                  y={y(p.weightKg) - 12}
                  textAnchor="middle"
                  fontSize={18}
                  className={`count ${isLast ? 'fill-accent' : 'fill-ink'}`}
                >
                  {p.amount}
                </text>
              ) : null}
            </g>
          );
        })}
        {pts[0] ? (
          <text
            x={n === 1 ? x(0) : LEFT}
            y={H - 6}
            textAnchor={n === 1 ? 'middle' : 'start'}
            fontSize={16}
            className="fill-ink-soft"
          >
            {formatShortDate(pts[0].date)}
          </text>
        ) : null}
        {last && n > 1 ? (
          <text
            x={RIGHT}
            y={H - 6}
            textAnchor="end"
            fontSize={16}
            className="fill-ink-soft"
          >
            {formatShortDate(last.date)}
          </text>
        ) : null}
      </svg>
    </ChartShell>
  );
}
