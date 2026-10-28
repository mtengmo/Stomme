import { useEffect, useRef, useState } from 'react';
import { AMOUNT_LABEL, sideLabel, UNIT_WORD } from '../../content/copy';
import { exerciseMetadata } from '../../content/exerciseMetadata';
import { loadPresentation } from '../../content/loadPresentation';
import type { Exercise } from '../../domain/types';
import { BalanceClockDiagram } from '../../figures/BalanceClockDiagram';
import { formatClock } from '../../lib/format';
import { isManual, paceFor, saveManual, savePace } from '../../lib/repPrefs';
import { useRepCounter } from '../../lib/useRepCounter';
import { useTimedHold } from '../../lib/useTimedHold';
import {
  PACE_FACTORS,
  repSeconds,
  repTempo,
  scaleTempo,
} from '../../rules/repTempo';
import type { SetStep } from '../../rules/sessionPlan';
import { weightLabel as describeWeight } from '../../rules/weightInventory';
import { Button } from '../../ui/Button';
import { Stepper } from '../../ui/Stepper';
import { ExerciseDifficulty } from '../exercise/ExerciseDifficulty';
import { ExerciseMuscles } from '../exercise/ExerciseMuscles';
import { KettlebellRackGrip } from '../exercise/KettlebellRackGrip';
import { FigureSlot } from './FigureSlot';
import { SessionFrame, type SessionFrameProps } from './SessionFrame';

const SEEN_KEY = 'stomme.repCount.seen';

function readFlag(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}
function writeFlag(key: string, on: boolean): void {
  try {
    if (on) window.localStorage.setItem(key, '1');
    else window.localStorage.removeItem(key);
  } catch {
    // The choice still applies for this screen.
  }
}

/** Extra facts about how the reps were counted, saved with the set. */
export interface CountInfo {
  counting?: 'auto' | 'manual';
  endedEarly?: boolean;
}

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
  autoStartTimer?: boolean;
  onStartTimer?(): void;
  onCancelTimer?(): void;
  onReportSymptoms?(): void;
  symptomReported?: boolean;
  busy: boolean;
  onDone(
    amount: number,
    loadIndex: number,
    weightKg?: number,
    info?: CountInfo,
  ): void;
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
  autoStartTimer = false,
  onStartTimer,
  onCancelTimer,
  onReportSymptoms,
  symptomReported,
  busy,
  onDone,
  onSkip,
}: SetScreenProps) {
  const [amount, setAmount] = useState(initialAmount);
  const [loadIndex, setLoadIndex] = useState(initialLoadIndex);
  const [weightKg, setWeightKg] = useState(initialWeightKg);
  const { range, unit, loadLadder } = exercise;
  const side = sideLabel(exercise, step.side);
  const load = loadLadder[loadIndex];
  const presentation = loadPresentation(exercise, loadIndex, variantId);
  const invalidWeight =
    weightKg !== undefined &&
    (!Number.isFinite(weightKg) ||
      weightKg < 0 ||
      weightKg > 500 ||
      (presentation.equipment === 'dumbbell' ||
      presentation.equipment === 'kettlebell'
        ? weightKg <= 0
        : weightKg !== 0));
  const movingTimed =
    exercise.id === 'heel-slide' || exercise.id === 'mountain-climber';
  const hold = useTimedHold({
    moving: movingTimed,
    seconds: amount,
    side,
    autoStart: unit === 'seconds' && autoStartTimer,
    onDone: () => {
      if (!busy && !invalidWeight) onDone(amount, loadIndex, weightKg);
    },
  });
  const [pace, setPace] = useState(() => paceFor(exercise.id));
  const baseTempo = unit === 'reps' ? repTempo(exercise.id) : null;
  const tempo = baseTempo
    ? scaleTempo(baseTempo, PACE_FACTORS[pace] ?? 1)
    : null;
  const changePace = (next: number) => {
    setPace(next);
    savePace(exercise.id, next);
  };
  const [manual, setManual] = useState(() => isManual(exercise.id));
  const [seenIntro] = useState(() => readFlag(SEEN_KEY));
  const autoCount = tempo !== null && !manual;
  const unsaved = useRef<{ count: number; early: boolean } | null>(null);
  const counter = useRepCounter({
    reps: amount,
    tempo,
    side,
    autoStart: autoCount && autoStartTimer,
    onCancel: onCancelTimer,
    onDone: (count, early) => {
      unsaved.current = { count, early };
      if (!busy && !invalidWeight)
        onDone(count, loadIndex, weightKg, {
          counting: 'auto',
          endedEarly: early,
        });
    },
  });
  const counterRunning =
    counter.phase === 'prepare' ||
    counter.phase === 'active' ||
    counter.phase === 'resuming';
  const counterLive = counterRunning || counter.phase === 'paused';
  // The beat changes before starting or while paused, never mid-rep.
  const canChangePace =
    counter.phase === 'idle' ||
    counter.phase === 'prepare' ||
    counter.phase === 'paused';
  const toggleCounter = () => {
    if (counterRunning) counter.pause();
    else if (counter.phase === 'paused') counter.resume();
  };
  const toggleRef = useRef(toggleCounter);
  toggleRef.current = toggleCounter;
  const liveRef = useRef(counterLive);
  liveRef.current = counterLive;
  useEffect(() => {
    if (!autoCount) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat || !liveRef.current) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('input, button, summary, select, textarea, a'))
        return;
      event.preventDefault();
      toggleRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [autoCount]);
  const timerActive = hold.phase === 'prepare' || hold.phase === 'hold';
  const nextCue =
    step.side === 'right' && !singleSide
      ? `Sedan: ${sideLabel(exercise, 'left')}.${unit === 'seconds' ? ' Du får 5 sekunder att byta.' : ' Byt utan vila.'}`
      : step.setNumber < totalSets
        ? 'Sedan: vila före nästa set.'
        : 'Sedan: bedöm hur ansträngande övningen var.';
  const metadata = exerciseMetadata[exercise.id];
  const weightLabel =
    weightKg !== undefined
      ? describeWeight(weightKg, presentation.variant)
      : load?.kg === 0
        ? 'Kroppsvikt'
        : load?.label;
  const changeAmount = (value: number) => {
    hold.reset();
    counter.reset();
    setAmount(value);
  };
  const remaining = hold.phase === 'idle' ? amount : hold.remaining;
  return (
    <SessionFrame
      {...frame}
      actions={
        <div className="session-set-actions flex items-center gap-3">
          <Button
            disabled={busy || invalidWeight}
            onClick={() => {
              if (autoCount) {
                if (counter.phase === 'idle') {
                  writeFlag(SEEN_KEY, true);
                  onStartTimer?.();
                  counter.start();
                } else if (counter.phase === 'done') {
                  const last = unsaved.current;
                  onDone(last?.count ?? amount, loadIndex, weightKg, {
                    counting: 'auto',
                    endedEarly: last?.early ?? false,
                  });
                } else toggleCounter();
              } else if (unit !== 'seconds' || hold.phase === 'done')
                onDone(
                  amount,
                  loadIndex,
                  weightKg,
                  tempo ? { counting: 'manual' } : undefined,
                );
              else if (timerActive) hold.pause();
              else if (hold.phase === 'paused') hold.resume();
              else {
                onStartTimer?.();
                hold.start();
              }
            }}
          >
            {autoCount
              ? counter.phase === 'idle'
                ? 'Starta – 5 s förberedelse'
                : counter.phase === 'paused'
                  ? 'Fortsätt'
                  : counter.phase === 'done'
                    ? 'Spara set igen'
                    : 'Pausa'
              : unit !== 'seconds'
                ? 'Klar set'
                : timerActive
                  ? 'Pausa timer'
                  : hold.phase === 'paused'
                    ? 'Fortsätt timer'
                    : hold.phase === 'done'
                      ? 'Spara set igen'
                      : 'Starta – 5 s förberedelse'}
          </Button>
          <button
            type="button"
            onClick={onSkip}
            className="min-h-16 w-24 shrink-0 text-base font-bold text-ink-soft underline decoration-2 underline-offset-4"
          >
            Hoppa över övningen
          </button>
        </div>
      }
    >
      <div>
        <h1 className="m-0 break-words text-3xl leading-tight font-bold">
          {exercise.name}
        </h1>
        <p className="m-0 text-lg font-bold">
          Set {step.setNumber} av {totalSets}
          {side ? (
            <>
              {' '}
              · <span className="text-accent">{side}</span>
            </>
          ) : null}
        </p>
        {exercise.id === 'band-hip-extension' ||
        exercise.id === 'balance-clock' ? (
          <p className="m-0 text-base">
            {exercise.id === 'band-hip-extension'
              ? 'Den valda sidan är det ben som rör sig.'
              : 'Den valda sidan är foten som nuddar. Du står på det andra benet.'}
          </p>
        ) : null}
        {exercise.id === 'balance-clock' && step.side !== 'both' ? (
          <p className="m-0 text-sm text-ink-soft">
            Ändrat: tidigare betydde vald sida benet du står på. Kontrollera mot
            ditt papper.
          </p>
        ) : null}
      </div>
      {unit === 'seconds' ? (
        <section
          aria-label={movingTimed ? 'Övningstid' : 'Hålltid'}
          className="rounded-md bg-accent px-3 py-2 text-paper"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="m-0 text-base font-bold">
                {hold.phase === 'prepare'
                  ? 'Gör dig redo'
                  : hold.phase === 'paused'
                    ? 'Pausad'
                    : movingTimed
                      ? 'Övningstid'
                      : 'Hålltid'}
                {side ? ` · ${side}` : ''}
              </p>
              <p
                role="timer"
                aria-label={`${remaining} sekunder ${hold.phase === 'prepare' ? 'förberedelse ' : hold.phase === 'paused' ? '' : movingTimed ? 'övningstid ' : 'hålltid '}kvar`}
                className="count m-0 text-[clamp(4.5rem,24vw,6rem)] leading-none"
              >
                {formatClock(remaining)}
              </p>
            </div>
          </div>
          <p role="status" className="m-0 text-base font-bold">
            {hold.phase === 'done'
              ? movingTimed
                ? 'Övningstiden är klar. Setet sparas automatiskt.'
                : 'Hålltiden är klar. Släpp positionen. Setet sparas automatiskt.'
              : hold.phase === 'hold'
                ? movingTimed
                  ? 'Växla ben lugnt tills signalen. Tiden gäller båda benen tillsammans. Setet sparas automatiskt.'
                  : 'Håll tills signalen. Setet sparas och nästa steg börjar automatiskt.'
                : hold.phase === 'prepare'
                  ? `Ta position${side ? ` · ${side}` : ''}. ${movingTimed ? 'Övningstiden' : 'Hålltiden'} börjar automatiskt.`
                  : hold.phase === 'paused'
                    ? 'Timern är pausad. Fortsätt när du är redo.'
                    : '5 s förberedelse. Sedan automatiska sidbyten och vila. Ljud om möjligt.'}
          </p>
          {hold.phase === 'paused' ? (
            <button
              type="button"
              onClick={hold.reset}
              className="min-h-12 text-base font-bold underline"
            >
              Nollställ till {amount} sekunder
            </button>
          ) : null}
        </section>
      ) : autoCount && tempo ? (
        <section
          aria-label="Repetitionsräknare"
          className="rounded-md bg-accent px-3 py-2 text-paper"
        >
          <p className="m-0 text-base font-bold">
            {counter.phase === 'prepare'
              ? 'Gör dig redo'
              : counter.phase === 'paused'
                ? 'Pausad'
                : counter.phase === 'resuming'
                  ? 'Fortsätter'
                  : counter.phase === 'done'
                    ? 'Klart'
                    : counter.phase === 'active'
                      ? 'Pågår'
                      : 'Redo'}
            {side ? ` · ${side}` : ''}
            {weightLabel ? ` · ${weightLabel}` : ''}
          </p>
          <button
            type="button"
            disabled={!counterLive}
            onClick={toggleCounter}
            aria-label={
              counter.phase === 'paused'
                ? 'Fortsätt räkningen'
                : 'Pausa räkningen'
            }
            className="block min-h-12 w-full text-left text-paper disabled:opacity-100"
          >
            <span
              aria-hidden="true"
              className="count block text-[clamp(4.5rem,24vw,6rem)] leading-none"
            >
              {counter.phase === 'prepare' || counter.phase === 'resuming'
                ? counter.leadSeconds
                : `${counter.completed} / ${amount}`}
            </span>
          </button>
          <p role="status" className="m-0 text-base font-bold">
            {counter.phase === 'prepare'
              ? `Ta position${side ? ` · ${side}` : ''}. Räkningen börjar automatiskt.`
              : counter.phase === 'active'
                ? 'Sparas automatiskt vid sista repetitionen.'
                : counter.phase === 'paused'
                  ? 'Pausad. Fortsätt när du är redo.'
                  : counter.phase === 'resuming'
                    ? 'Fortsätter strax.'
                    : counter.phase === 'done'
                      ? 'Setet är klart och sparas automatiskt.'
                      : `${amount} repetitioner${exercise.perSide ? ' på denna sida' : ''}. 5 s förberedelse, sedan räknar appen.`}
          </p>
          <div className="flex flex-wrap items-center gap-x-3">
            <p className="m-0 text-sm">
              Takt: ca {repSeconds(tempo)} s per repetition. Förslag på takt.
            </p>
            {canChangePace ? (
              <>
                <button
                  type="button"
                  disabled={pace === 0}
                  onClick={() => changePace(pace - 1)}
                  className="min-h-12 text-base font-bold underline disabled:no-underline disabled:opacity-60"
                >
                  Snabbare
                </button>
                <button
                  type="button"
                  disabled={pace === PACE_FACTORS.length - 1}
                  onClick={() => changePace(pace + 1)}
                  className="min-h-12 text-base font-bold underline disabled:no-underline disabled:opacity-60"
                >
                  Långsammare
                </button>
              </>
            ) : null}
          </div>
          {counterLive && counter.phase !== 'prepare' ? (
            <button
              type="button"
              onClick={counter.endEarly}
              className="min-h-12 text-base font-bold underline"
            >
              Avsluta setet
            </button>
          ) : null}
        </section>
      ) : (
        <div>
          <p className="m-0 text-xl font-bold">
            {amount} {UNIT_WORD[unit]}
            {exercise.perSide ? ' på denna sida' : ''}
            {weightLabel ? (
              <span className="font-normal"> · {weightLabel}</span>
            ) : null}
          </p>
          <p className="m-0 text-base text-ink-soft">
            {unit === 'reps'
              ? 'Räkna repetitionerna själv. Tryck Klar set när du är klar.'
              : unit === 'laps'
                ? 'Räkna varven själv. Tryck Klar set när du är klar.'
                : 'Tryck Klar set när du gått hela sträckan.'}
          </p>
        </div>
      )}
      {tempo ? (
        <div>
          {!seenIntro && counter.phase === 'idle' && autoCount ? (
            <p className="m-0 text-base">
              Nytt: appen räknar repetitionerna åt dig. Välj Räkna själv om du
              hellre räknar och trycker Klar set.
            </p>
          ) : null}
          {counter.phase === 'idle' || !autoCount ? (
            <button
              type="button"
              role="switch"
              aria-checked={manual}
              onClick={() => {
                saveManual(exercise.id, !manual);
                setManual(!manual);
              }}
              className="min-h-12 text-base font-bold underline"
            >
              Räkna själv: {manual ? 'på' : 'av'}
            </button>
          ) : null}
        </div>
      ) : null}
      <FigureSlot
        exerciseId={exercise.id}
        side={step.side}
        loadIndex={loadIndex}
        variantId={variantId}
        progress={autoCount && counterLive ? counter.progress : undefined}
      />
      <div>
        <p className="m-0 text-base font-bold">{presentation.cue}</p>
        {metadata.holdSeconds ? (
          <p className="m-0 text-base">
            Håll varje repetition i {metadata.holdSeconds} sekunder.
            {metadata.relaxSeconds
              ? ` Slappna av i ${metadata.relaxSeconds} sekunder mellan repetitionerna.`
              : ''}{' '}
            {autoCount
              ? 'Animationen följer samma takt som räkningen.'
              : 'Följ tiderna i texten. Animationen visar rörelsen i förenklat tempo.'}
          </p>
        ) : null}
        <p className="m-0 text-base text-ink-soft" aria-live="polite">
          {nextCue}
        </p>
      </div>
      <section className="session-extras" aria-label="Inställningar och teknik">
        <details name="workout-options">
          <summary className="min-h-12 cursor-pointer py-3 text-base font-bold underline">
            Ändra set
          </summary>
          <section
            className="session-extra-scroll flex flex-col gap-4"
            aria-label="Ändra antal och vikt"
          >
            <Stepper
              label={AMOUNT_LABEL[unit]}
              value={String(amount)}
              unit={UNIT_WORD[unit]}
              onDec={() =>
                changeAmount(Math.max(range.step, amount - range.step))
              }
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
                  className="min-h-12 rounded-sm border-2 border-edge bg-surface px-3 text-xl text-ink"
                />
                <span className="text-base font-normal text-ink-soft">
                  {presentation.variant.label} · samma redskap som i passplanen
                  {' · '}
                  {describeWeight(weightKg, presentation.variant)}
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
          </section>
        </details>
        <details name="workout-options">
          <summary className="min-h-12 cursor-pointer py-3 text-base font-bold underline">
            Hur gör man?
          </summary>
          <section
            className="session-extra-scroll flex flex-col gap-3"
            aria-label="Teknik"
          >
            <p className="m-0 text-base font-bold">
              {weightLabel}
              {presentation.variant.label !== weightLabel
                ? ` · ${presentation.variant.label}`
                : ''}
            </p>
            {exercise.id === 'balance-clock' ? (
              <BalanceClockDiagram
                working={step.side === 'both' ? null : step.side}
                paused
              />
            ) : null}
            <ExerciseMuscles exerciseId={exercise.id} />
            <h2 className="m-0 text-2xl font-bold">Så gör du</h2>
            <ExerciseDifficulty
              exerciseId={exercise.id}
              variantId={variantId}
              loadIndex={loadIndex}
            />
            {exercise.id === 'kettlebell-rack-carry' ? (
              <KettlebellRackGrip
                side={step.side === 'left' ? 'left' : 'right'}
              />
            ) : null}
            <ol className="m-0 list-decimal space-y-2 pl-6 text-base">
              {presentation.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ol>
            <h2 className="m-0 text-2xl font-bold">Vanligt fel</h2>
            <p className="m-0 text-base">{exercise.commonMistake}</p>
            <h2 className="m-0 text-2xl font-bold">Enklare variant</h2>
            <p className="m-0 text-base">{exercise.easierVariant}</p>
            <p className="m-0 text-base text-ink-soft">
              {unit === 'reps'
                ? 'Animationen visar tekniken. Räkna repetitionerna själv och tryck Klar set när du är klar.'
                : unit === 'laps'
                  ? 'Animationen visar tekniken. Räkna varven själv och tryck Klar set när du är klar.'
                  : unit === 'seconds'
                    ? movingTimed
                      ? 'Starta och gör dig redo under 5 sekunder. Växla ben lugnt under hela tiden och vila vid signalen. Appen sparar automatiskt. Timern pausas om du lämnar appen.'
                      : 'Starta och ta position under 5 sekunder. Släpp vid signalen. Appen sparar och fortsätter automatiskt. Pausa om du behöver mer tid. Håll appen öppen; timern pausas om du lämnar den.'
                    : 'Animationen visar tekniken. Gå den angivna sträckan och tryck Klar set för att spara.'}
            </p>
            {['step-up', 'split-squat'].includes(exercise.id) ? (
              <p className="m-0 text-base">
                Fråga fysioterapeuten vilken höjd eller vilket rörelseomfång som
                passar dig.
              </p>
            ) : null}
          </section>
        </details>
      </section>
      {onReportSymptoms ? (
        <button
          type="button"
          onClick={onReportSymptoms}
          className="min-h-12 self-start text-base font-bold underline"
        >
          {symptomReported
            ? 'Besvär sparade · ändra rapport'
            : 'Rapportera smärta eller besvär'}
        </button>
      ) : null}
    </SessionFrame>
  );
}
