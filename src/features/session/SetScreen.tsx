import { useState } from 'react';
import {
  AMOUNT_LABEL,
  sideLabel,
  sideLetter,
  UNIT_WORD,
} from '../../content/copy';
import type { Exercise } from '../../domain/types';
import { useCountdown } from '../../lib/useCountdown';
import type { SetStep } from '../../rules/sessionPlan';
import { Button } from '../../ui/Button';
import { Stepper } from '../../ui/Stepper';
import { FigureSlot } from './FigureSlot';
import { SessionFrame, type SessionFrameProps } from './SessionFrame';

interface SetScreenProps {
  frame: Omit<SessionFrameProps, 'children' | 'actions'>;
  exercise: Exercise;
  step: SetStep;
  totalSets: number;
  initialAmount: number;
  initialLoadIndex: number;
  busy: boolean;
  onDone(amount: number, loadIndex: number): void;
  onSkip(): void;
}

/** One set: name, side, big steppers prefilled, and a single "Klar set". */
export function SetScreen({
  frame,
  exercise,
  step,
  totalSets,
  initialAmount,
  initialLoadIndex,
  busy,
  onDone,
  onSkip,
}: SetScreenProps) {
  const [amount, setAmount] = useState(initialAmount);
  const [loadIndex, setLoadIndex] = useState(initialLoadIndex);
  const hold = useCountdown();
  const { range, unit, loadLadder } = exercise;
  const side = sideLabel(exercise, step.side);
  const load = loadLadder[loadIndex];

  const cue =
    step.side === 'right' && step.setNumber === 1
      ? 'Börja med höger.'
      : unit === 'reps'
        ? 'Sänk på 3 sekunder.'
        : '';

  return (
    <SessionFrame
      {...frame}
      actions={
        <>
          <Button disabled={busy} onClick={() => onDone(amount, loadIndex)}>
            Klar set
          </Button>
          <button
            type="button"
            onClick={onSkip}
            className="min-h-12 text-base font-bold text-ink-soft underline decoration-2 underline-offset-4"
          >
            Hoppa över övningen
          </button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <FigureSlot letter={sideLetter(step.side)} />
        <div className="min-w-0">
          <h1 className="m-0 text-3xl leading-tight font-bold">
            {exercise.name}
          </h1>
          <p className="m-0 mt-1 text-xl font-bold">
            Set {step.setNumber} av {totalSets}
            {side ? (
              <>
                {' · '}
                <span className="text-blue">{side}</span>
              </>
            ) : null}
          </p>
          {cue ? <p className="m-0 text-base text-ink-soft">{cue}</p> : null}
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-4">
        <Stepper
          label={AMOUNT_LABEL[unit]}
          value={String(amount)}
          unit={UNIT_WORD[unit]}
          onDec={() => setAmount(Math.max(range.step, amount - range.step))}
          onInc={() => setAmount(amount + range.step)}
          decDisabled={amount <= range.step}
        />

        {loadLadder.length > 1 && load ? (
          <Stepper
            size={load.kg === 0 ? 'sm' : 'md'}
            label="Vikt"
            value={load.kg === 0 ? 'Kroppsvikt' : `${load.kg} kg`}
            note={load.kg === 0 ? undefined : load.label}
            onDec={() => setLoadIndex(Math.max(0, loadIndex - 1))}
            onInc={() =>
              setLoadIndex(Math.min(loadLadder.length - 1, loadIndex + 1))
            }
            decDisabled={loadIndex <= 0}
            incDisabled={loadIndex >= loadLadder.length - 1}
          />
        ) : load ? (
          <p className="m-0 text-xl">
            <span className="font-bold">Vikt: </span>
            {load.kg === 0 ? 'Kroppsvikt' : load.label}
          </p>
        ) : null}

        {unit === 'seconds' ? (
          <Button
            variant="secondary"
            onClick={() => (hold.running ? hold.stop() : hold.start(amount))}
          >
            {hold.running
              ? `Håll: ${hold.seconds} s · Stoppa`
              : `Starta nedräkning (${amount} s)`}
          </Button>
        ) : null}
      </div>
    </SessionFrame>
  );
}
