import { Link } from 'wouter';
import type { ExerciseId } from '../../domain/types';
import { linkClass } from '../../ui/link';
import { Tally } from '../../ui/Tally';
import { ExerciseThumb } from './ExerciseThumb';

export interface PassCardExercise {
  exerciseId: ExerciseId;
  /** Display name without the E-code. */
  name: string;
  sets: number;
  /** Reps, or seconds when `timed`. */
  target: number;
  timed?: boolean;
  perSide?: boolean;
  /** Rest between sets, for the "2 × 10 =" explanation. */
  restSec?: number;
}

interface CommonProps {
  /** 1-based pass number in the week. */
  passNumber: number;
  /** E.g. "Överkropp & bål". */
  focusLabel: string;
  /** Estimated minutes. */
  minutes: number;
  exercises: readonly PassCardExercise[];
  /** "Idag" or a short weekday such as "lör". */
  dayLabel?: string;
  isToday?: boolean;
}

export type PassCardProps =
  | (CommonProps & {
      variant: 'lead';
      /** Show the "2 × 10 = ..." explanation until the first pass is done. */
      showLegend?: boolean;
      /** Optional block-week hint, e.g. "Vecka 2 av 4". */
      weekLabel?: string;
      /** Where a row's "Byt" goes; omitted while a session is running. */
      swapHref?(exerciseId: ExerciseId): string;
    })
  | (CommonProps & { variant: 'receding' });

function setsText(e: PassCardExercise): string {
  const base = `${e.sets} × ${e.target}${e.timed ? ' s' : ''}`;
  return e.perSide ? `${base} per sida` : base;
}

function legend(e: PassCardExercise): string {
  const what = e.timed
    ? `${e.sets} set på ${e.target} sekunder`
    : `${e.sets} set med ${e.target} repetitioner`;
  const rest = e.restSec ? ` ${e.restSec} s vila mellan seten.` : '';
  return `${e.sets} × ${e.target} = ${what}.${rest}`;
}

function DayChip({
  dayLabel,
  isToday,
}: {
  dayLabel?: string;
  isToday?: boolean;
}) {
  if (!dayLabel) return null;
  return (
    <span
      className={`inline-block rounded-sm px-2.5 py-1 text-base font-bold ${
        isToday ? 'bg-today text-today-ink' : 'bg-upcoming text-upcoming-ink'
      }`}
    >
      {dayLabel}
    </span>
  );
}

/** The lead card is the pass to do next; the receding card is the one after. */
export function PassCard(props: PassCardProps) {
  const { passNumber, focusLabel, minutes, exercises, dayLabel, isToday } =
    props;
  const first = exercises[0];

  if (props.variant === 'receding') {
    return (
      <section
        aria-label={`Därefter: Pass ${passNumber}, ${focusLabel}`}
        className="pass-card-receding flex flex-col gap-2 rounded-md border-2 border-edge bg-surface p-4"
      >
        <p className="m-0 flex flex-wrap items-center gap-2 text-base font-bold">
          <span>Därefter · Pass {passNumber}</span>
          <DayChip dayLabel={dayLabel} isToday={isToday} />
        </p>
        <p className="m-0 text-lg">{focusLabel}</p>
        <p className="count m-0 text-xl leading-none">
          ≈ {minutes} min · {exercises.length} övningar
        </p>
        <Tally
          size={36}
          tone="edge"
          label={`Pass ${passNumber}: ${exercises.length} övningar`}
          items={exercises.map((e) => ({
            id: e.exerciseId,
            remaining: e.sets,
          }))}
        />
      </section>
    );
  }

  return (
    <section
      aria-label={`Nästa pass: Pass ${passNumber}, ${focusLabel}`}
      className="pass-card-lead flex flex-col gap-3 rounded-md border-[3px] border-ink bg-surface-tint p-5"
    >
      <p className="m-0 flex flex-wrap items-center gap-2 text-base font-bold">
        <span className="text-accent">Nästa pass</span>
        <DayChip dayLabel={dayLabel} isToday={isToday} />
        {props.weekLabel ? (
          <span className="text-ink-soft">{props.weekLabel}</span>
        ) : null}
      </p>
      <h2 className="count m-0 text-[3.75rem] leading-none">
        Pass {passNumber}
      </h2>
      <p className="count m-0 text-[1.875rem] leading-none">{focusLabel}</p>
      <p className="count m-0 text-2xl leading-none">
        ≈ {minutes} min · {exercises.length} övningar
      </p>
      <Tally
        size={48}
        label={`Pass ${passNumber}: ${exercises.length} övningar`}
        items={exercises.map((e) => ({
          id: e.exerciseId,
          remaining: e.sets,
        }))}
      />
      {props.showLegend && first ? (
        <p className="m-0 text-base text-ink-soft">{legend(first)}</p>
      ) : null}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {exercises.map((e) => (
          <li key={e.exerciseId} className="flex items-center gap-1">
            <Link
              href={`/ovning/${e.exerciseId}`}
              className={`${linkClass} flex min-h-16 min-w-0 flex-1 items-center gap-3 no-underline`}
            >
              <ExerciseThumb exerciseId={e.exerciseId} />
              <span className="flex min-w-0 flex-col">
                <span className="text-lg underline decoration-2 underline-offset-4">
                  {e.name}
                </span>
                <span className="count text-xl leading-tight font-bold">
                  {setsText(e)}
                </span>
              </span>
            </Link>
            {props.swapHref ? (
              <Link
                href={props.swapHref(e.exerciseId)}
                aria-label={`Byt ${e.name}`}
                className={`${linkClass} flex min-h-12 min-w-12 shrink-0 items-center justify-center px-1 text-base font-bold`}
              >
                Byt
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
