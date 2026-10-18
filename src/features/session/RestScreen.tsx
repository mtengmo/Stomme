import { useEffect, useRef } from 'react';
import { sideLabel } from '../../content/copy';
import type { Exercise } from '../../domain/types';
import { formatClock } from '../../lib/format';
import { useCountdown } from '../../lib/useCountdown';
import type { SetStep } from '../../rules/sessionPlan';
import { Button } from '../../ui/Button';
import { SessionFrame, type SessionFrameProps } from './SessionFrame';

const RADIUS = 124;
const CIRC = 2 * Math.PI * RADIUS;

interface RestScreenProps {
  frame: Omit<SessionFrameProps, 'children' | 'actions'>;
  restSec: number;
  nextExercise: Exercise | undefined;
  nextStep: SetStep | undefined;
  nextTotalSets: number;
  onContinue(): void;
}

/** Huge countdown on timestamps, +15 s, skip; "Nästa" tells what comes after. */
export function RestScreen({
  frame,
  restSec,
  nextExercise,
  nextStep,
  nextTotalSets,
  onContinue,
}: RestScreenProps) {
  const total = useRef(restSec);
  const timer = useCountdown();
  const { start } = timer;

  // biome-ignore lint/correctness/useExhaustiveDependencies: start once per rest screen
  useEffect(() => {
    total.current = restSec;
    start(restSec);
  }, []);

  const over = !timer.running;
  const fraction = over ? 0 : Math.min(1, timer.seconds / total.current);
  const side =
    nextExercise && nextStep ? sideLabel(nextExercise, nextStep.side) : '';

  return (
    <SessionFrame
      {...frame}
      actions={
        <>
          <Button
            variant="secondary"
            disabled={over}
            onClick={() => {
              total.current += 15;
              timer.add(15);
            }}
          >
            +15 s
          </Button>
          <Button onClick={onContinue}>
            {over ? 'Nästa set' : 'Hoppa över vila'}
          </Button>
        </>
      }
    >
      <h1 className="m-0 text-4xl leading-none font-bold">Vila</h1>
      <div className="relative mx-auto grid size-72 place-items-center">
        <svg
          viewBox="0 0 280 280"
          className="absolute inset-0 size-full -rotate-90"
          aria-hidden="true"
          focusable="false"
        >
          <circle
            cx="140"
            cy="140"
            r={RADIUS}
            fill="none"
            stroke="var(--edge)"
            strokeWidth="3"
          />
          <circle
            cx="140"
            cy="140"
            r={RADIUS}
            fill="none"
            stroke="var(--ink)"
            strokeWidth="12"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - fraction)}
          />
        </svg>
        <p
          className="count m-0 text-[6.5rem] leading-none"
          role="timer"
          aria-label={`${timer.seconds} sekunder kvar`}
        >
          {over ? 'Nu' : formatClock(timer.seconds)}
        </p>
      </div>
      {nextExercise && nextStep ? (
        <div>
          <p className="m-0 text-base font-bold text-ink-soft">Nästa</p>
          <p className="m-0 text-2xl leading-tight font-bold">
            {nextExercise.name}
          </p>
          <p className="m-0 text-xl">
            Set {nextStep.setNumber} av {nextTotalSets}
            {side ? ` · ${side}` : ''}
          </p>
        </div>
      ) : null}
    </SessionFrame>
  );
}
