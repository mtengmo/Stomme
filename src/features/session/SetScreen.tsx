import { useState } from 'react';
import { AMOUNT_LABEL, sideLabel, UNIT_WORD } from '../../content/copy';
import { exerciseMetadata } from '../../content/exerciseMetadata';
import { loadPresentation } from '../../content/loadPresentation';
import type { Exercise } from '../../domain/types';
import { useCountdown } from '../../lib/useCountdown';
import type { SetStep } from '../../rules/sessionPlan';
import { Button } from '../../ui/Button';
import { Stepper } from '../../ui/Stepper';
import { ExerciseSheet } from '../exercise/ExerciseCard';
import { FigureSlot } from './FigureSlot';
import { SessionFrame, type SessionFrameProps } from './SessionFrame';

interface SetScreenProps {
  frame: Omit<SessionFrameProps, 'children' | 'actions'>;
  exercise: Exercise;
  step: SetStep;
  totalSets: number;
  initialAmount: number;
  initialLoadIndex: number;
  initialWeightKg?: number;
  variantId?: string;
  singleSide?: boolean;
  onReportSymptoms?(): void;
  symptomReported?: boolean;
  busy: boolean;
  onDone(amount: number, loadIndex: number, weightKg?: number): void;
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
  initialWeightKg,
  variantId,
  singleSide,
  onReportSymptoms,
  symptomReported,
  busy,
  onDone,
  onSkip,
}: SetScreenProps) {
  const [amount, setAmount] = useState(initialAmount);
  const [loadIndex, setLoadIndex] = useState(initialLoadIndex);
  const [weightKg, setWeightKg] = useState(initialWeightKg);
  const [holdDone, setHoldDone] = useState(false);
  const hold = useCountdown(() => setHoldDone(true));
  const [cardOpen, setCardOpen] = useState(false);
  const { range, unit, loadLadder } = exercise;
  const side = sideLabel(exercise, step.side);
  const load = loadLadder[loadIndex];
  const presentation = loadPresentation(exercise, loadIndex, variantId);
  const nextCue =
    step.side === 'right' && !singleSide
      ? `Sedan: byt till vänster ${exercise.sideKind === 'ben' ? 'ben' : exercise.sideKind === 'hand' ? 'hand' : 'sida'}, utan vila. Tryck Klar set när höger är klar.`
      : step.setNumber < totalSets
        ? 'Sedan: vila före nästa set. Tryck Klar set när du är klar.'
        : 'Sedan: ange hur övningen kändes. Tryck Klar set när du är klar.';
  const quantity =
    unit === 'seconds'
      ? 'hela hålltiden'
      : unit === 'meters'
        ? 'hela sträckan'
        : 'hela antalet';
  const cue =
    step.side === 'left'
      ? singleSide
        ? `Vänster sida arbetar. Gör ${quantity} på denna sida.`
        : `Byt nu till vänster. Samma ${unit === 'seconds' ? 'hålltid' : unit === 'meters' ? 'sträcka' : 'antal'} på denna sida.`
      : step.side === 'right'
        ? `Börja med höger. Gör ${quantity} på denna sida.`
        : `Gör ${quantity} med båda sidor samtidigt.`;
  const changeAmount = (value: number) => {
    hold.stop();
    setHoldDone(false);
    setAmount(value);
  };
  return (
    <SessionFrame
      {...frame}
      actions={
        <>
          <Button
            disabled={
              busy ||
              (weightKg !== undefined &&
                (!Number.isFinite(weightKg) ||
                  weightKg < 0 ||
                  weightKg > 500 ||
                  (presentation.equipment === 'dumbbell' ||
                  presentation.equipment === 'kettlebell'
                    ? weightKg <= 0
                    : weightKg !== 0)))
            }
            onClick={() => onDone(amount, loadIndex, weightKg)}
          >
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
      <h1 className="m-0 text-3xl leading-tight font-bold">{exercise.name}</h1>
      <div className="flex items-center gap-4">
        <FigureSlot
          exerciseId={exercise.id}
          side={step.side}
          loadIndex={loadIndex}
          variantId={variantId}
        />
        <div className="min-w-0">
          <p className="m-0 text-xl font-bold">
            Set {step.setNumber} av {totalSets}
            {side ? (
              <>
                {' · '}
                <span className="text-blue">{side}</span>
              </>
            ) : null}
          </p>
          {cue ? <p className="m-0 text-base text-ink-soft">{cue}</p> : null}
          <button
            type="button"
            onClick={() => setCardOpen(true)}
            className="-ml-2 min-h-12 px-2 text-base font-bold underline decoration-2 underline-offset-4"
          >
            Hur gör man?
          </button>
        </div>
      </div>
      {cardOpen ? (
        <ExerciseSheet
          exercise={exercise}
          side={step.side === 'left' ? 'left' : 'right'}
          loadIndex={loadIndex}
          variantId={variantId}
          weightKg={weightKg}
          onClose={() => setCardOpen(false)}
        />
      ) : null}
      {onReportSymptoms ? (
        <button
          type="button"
          onClick={onReportSymptoms}
          className="min-h-12 self-start px-2 text-base font-bold underline"
        >
          {symptomReported
            ? 'Besvär sparade · ändra rapport'
            : 'Rapportera smärta eller besvär'}
        </button>
      ) : null}
      {exerciseMetadata[exercise.id].holdSeconds ? (
        <p className="m-0 text-base font-bold">
          Håll varje repetition i {exerciseMetadata[exercise.id].holdSeconds}{' '}
          sekunder.
          {exerciseMetadata[exercise.id].relaxSeconds
            ? ` Slappna av i ${exerciseMetadata[exercise.id].relaxSeconds} sekunder mellan repetitionerna.`
            : ''}{' '}
          Räkna sedan nästa repetition.
        </p>
      ) : null}
      <p className="m-0 text-base font-bold" aria-live="polite">
        {nextCue}
      </p>
      <p className="m-0 text-base text-ink-soft" aria-live="polite">
        {presentation.cue}
      </p>
      <div className="mt-auto flex flex-col gap-4">
        <Stepper
          label={AMOUNT_LABEL[unit]}
          value={String(amount)}
          unit={UNIT_WORD[unit]}
          onDec={() => changeAmount(Math.max(range.step, amount - range.step))}
          onInc={() => changeAmount(amount + range.step)}
          decDisabled={amount <= range.step}
        />
        {weightKg !== undefined ? (
          <label className="flex flex-col gap-2 text-lg font-bold">
            Total vikt (kg)
            <input
              type="number"
              min="0"
              max="500"
              step="0.5"
              value={weightKg}
              onChange={(event) => setWeightKg(Number(event.target.value))}
              className="min-h-12 rounded-sm border-2 border-edge bg-paper px-3 text-xl text-ink"
            />
            <span className="text-base font-normal text-ink-soft">
              {presentation.variant.label} · samma redskap som i passplanen
            </span>
          </label>
        ) : loadLadder.length > 1 && load ? (
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
          <section aria-label="Hålltid" className="flex flex-col gap-2">
            <p className="m-0 text-base">
              Håll positionen i {amount} sekunder
              {exercise.perSide ? ' på denna sida' : ''}. Starta när du är på
              plats.
            </p>
            {hold.running ? (
              <p
                role="timer"
                aria-label={`${hold.seconds} sekunder hålltid kvar`}
                className="count m-0 text-5xl"
              >
                {hold.seconds} s kvar
              </p>
            ) : null}
            <p role="status" className="m-0 text-base font-bold">
              {holdDone
                ? 'Hålltiden är klar. Tryck Klar set för att fortsätta.'
                : hold.running
                  ? 'Håll positionen. Detta är din träningstid.'
                  : 'Timern är ett stöd. Setet sparas med Klar set.'}
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                setHoldDone(false);
                if (hold.running) hold.stop();
                else hold.start(amount);
              }}
            >
              {hold.running
                ? 'Avbryt hålltid'
                : holdDone
                  ? `Starta om hålltid (${amount} s)`
                  : `Starta hålltid (${amount} s)`}
            </Button>
          </section>
        ) : (
          <p className="m-0 text-base text-ink-soft">
            {unit === 'reps'
              ? 'Räkna repetitionerna själv. Tryck Klar set när hela antalet är gjort.'
              : 'Gå den angivna sträckan och tryck Klar set.'}
          </p>
        )}
      </div>
    </SessionFrame>
  );
}
