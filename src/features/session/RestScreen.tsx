import { useEffect, useRef, useState } from 'react';
import { EFFORT_LABEL, sideLabel } from '../../content/copy';
import type { Effort, Exercise } from '../../domain/types';
import { formatClock } from '../../lib/format';
import { stopTimerVoice, timerVoice } from '../../lib/timerVoice';
import { useCountdown } from '../../lib/useCountdown';
import type { SetStep } from '../../rules/sessionPlan';
import { Button } from '../../ui/Button';
import { PencilTick } from '../../ui/PencilTick';
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
  /** True when the rest follows a set (not an effort answer): draws the tick. */
  afterSet: boolean;
  autoContinue?: boolean;
  effortExercise?: Exercise;
  effort?: Effort;
  onEffort?(effort: Effort): void;
}
/** Huge countdown on timestamps, +15 s, skip; "Nästa" tells what comes after. */
export function RestScreen({
  frame,
  restSec,
  nextExercise,
  nextStep,
  nextTotalSets,
  onContinue,
  afterSet,
  autoContinue = false,
  effortExercise,
  effort,
  onEffort,
}: RestScreenProps) {
  const total = useRef(restSec);
  const [paused, setPaused] = useState(false);
  const savedSeconds = useRef(restSec);
  const timer = useCountdown(() => {
    if (autoContinue && !document.hidden) onContinue();
  });
  const { start } = timer;
  useEffect(() => {
    total.current = restSec;
    start(restSec);
    if (autoContinue) timerVoice(`Vila. ${restSec} sekunder.`);
  }, [restSec, start, autoContinue]);
  const pause = () => {
    if (paused || !timer.running) return;
    savedSeconds.current = timer.seconds;
    timer.stop();
    stopTimerVoice();
    setPaused(true);
  };
  const pauseRef = useRef(pause);
  pauseRef.current = pause;
  useEffect(() => {
    const hide = () => {
      if (document.hidden && autoContinue) pauseRef.current();
    };
    document.addEventListener('visibilitychange', hide, true);
    return () => document.removeEventListener('visibilitychange', hide, true);
  }, [autoContinue]);
  const over = !timer.running;
  const fraction = over ? 0 : Math.min(1, timer.seconds / total.current);
  const side =
    nextExercise && nextStep ? sideLabel(nextExercise, nextStep.side) : '';
  return (
    <SessionFrame
      {...frame}
      actions={
        <>
          {autoContinue ? (
            <Button
              variant="secondary"
              onClick={() => {
                if (paused) {
                  setPaused(false);
                  start(savedSeconds.current);
                } else pause();
              }}
            >
              {paused ? 'Fortsätt vila' : 'Pausa vila'}
            </Button>
          ) : null}
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
      <div className="flex items-center justify-between">
        <h1 className="m-0 text-3xl leading-none font-bold">Vila</h1>
        {afterSet ? <PencilTick size={48} animate variant={1} /> : null}
      </div>
      <div
        className={`relative mx-auto grid place-items-center ${effortExercise && onEffort ? 'size-[clamp(3.75rem,11dvh,10rem)]' : 'size-[clamp(5rem,24dvh,15rem)]'}`}
      >
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
          className={`count m-0 leading-none ${effortExercise && onEffort ? 'text-[clamp(1.5rem,5.5dvh,3.75rem)]' : 'text-[clamp(1.75rem,8.5dvh,6rem)]'}`}
          role="timer"
          aria-label={`${paused ? savedSeconds.current : timer.seconds} sekunder kvar`}
        >
          {paused
            ? formatClock(savedSeconds.current)
            : over
              ? 'Nu'
              : formatClock(timer.seconds)}
        </p>
      </div>
      {effortExercise && onEffort ? (
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="text-lg font-bold">
            Hur ansträngande var {effortExercise.name}?
          </legend>
          <p className="m-0 text-base text-ink-soft [@media(max-height:740px)]:hidden">
            Bedöm ansträngningen, inte smärta. Du kan hoppa över frågan.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(['easy', 'ok', 'hard'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={effort === value}
                className={`min-h-12 rounded-sm border-2 px-2 text-base font-bold ${effort === value ? 'border-accent text-accent' : 'border-edge text-ink'}`}
                onClick={() => onEffort(value)}
              >
                {EFFORT_LABEL[value]}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}
      <p
        role="status"
        className="m-0 text-base [@media(max-height:740px)]:text-sm [@media(max-height:740px)]:leading-snug"
      >
        {paused
          ? 'Vilan är pausad. Fortsätt när du är redo.'
          : autoContinue
            ? nextExercise?.unit === 'reps'
              ? 'Nästa set börjar automatiskt efter vilan och 5 sekunders förberedelse.'
              : 'Nästa hållning börjar automatiskt efter vilan och 5 sekunders förberedelse.'
            : over
              ? 'Vilan är klar. Tryck Nästa set när du är redo.'
              : 'Detta är vilotid. Nästa set börjar när du trycker på knappen.'}
      </p>
      {nextExercise && nextStep ? (
        <div>
          <p className="m-0 text-2xl leading-tight font-bold">
            {nextExercise.name}
          </p>
          <p className="m-0 text-xl">
            Nästa · Set {nextStep.setNumber} av {nextTotalSets}
            {side ? ` · ${side}` : ''}
          </p>
        </div>
      ) : null}
    </SessionFrame>
  );
}
