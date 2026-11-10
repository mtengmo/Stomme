import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { experienceLabels } from '../../content/programmes';
import { readyWorkouts } from '../../content/readyWorkouts';
import { isCuratedLevel, programPool } from '../../content/widePool';
import { saveStartWithCustomWorkout } from '../../db/customWorkouts';
import { getDb } from '../../db/db';
import { saveTrainingProgram } from '../../db/program';
import {
  redoTrainingProgram,
  saveTrainingPreferences,
} from '../../db/training';
import type {
  ExerciseId,
  TrainingPreferences,
  TrainingProgram,
} from '../../domain/types';
import { toLocalDate } from '../../lib/dates';
import { randomSeed } from '../../lib/seed';
import { buildProgram } from '../../rules/programPlan';
import { readyProgramPass } from '../../rules/readyProgramPass';
import { Button } from '../../ui/Button';
import { ChoiceCard } from '../../ui/ChoiceCard';
import { linkClass } from '../../ui/link';
import { DisclaimerText } from '../onboarding/Onboarding';
import { emphasisLabels } from '../program/programView';
import { CustomPicker } from './CustomPicker';
import { customWorkoutPlan } from './defaultPlan';
import {
  EquipmentInventory,
  type PendingWeight,
  WeightFields,
} from './EquipmentInventory';
import {
  allowedEquipment,
  DAY_OPTIONS,
  type Draft,
  type Goal,
  isRehabGoal,
  levelHints,
  preferencesFromDraft,
  readDraft,
  type Step,
  showsWeights,
  stepsFor,
} from './quickStartModel';
import { StartEquipment } from './StartEquipment';

const fieldClass =
  'min-h-12 w-full rounded-sm border-2 border-edge bg-surface px-3 text-base text-ink';

/** Answers survive leaving the flow (kept per tab, cleared on save). */
const DRAFT_KEY = 'stomme.quickstart.draft';
function loadDraft(): Draft {
  try {
    return readDraft(sessionStorage.getItem(DRAFT_KEY));
  } catch {
    return readDraft(null);
  }
}
/** Picks of the pick step; own key so the builder and the draft never fight over one. */
const SELECTION_KEY = 'stomme.quickstart.selection';
function clearSelection(): void {
  try {
    sessionStorage.removeItem(SELECTION_KEY);
  } catch {
    /* No picks to clear. */
  }
}
function clearDraft(): void {
  clearSelection();
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* No draft to clear. */
  }
}

const headings: Record<Step, string> = {
  goal: 'Vad vill du träna?',
  rehab: 'Vilket knäprogram följer du?',
  days: 'Hur många dagar i veckan?',
  emphasis: 'Vad vill du få ut mest av?',
  plan: 'Hur vill du lägga upp passen?',
  equipment: 'Vad tränar du med?',
  weights: 'Vilka vikter har du?',
  level: 'Hur van är du vid styrketräning?',
  pick: 'Välj dina övningar',
};

const dayHints: Record<(typeof DAY_OPTIONS)[number], string> = {
  1: 'Ett pass i veckan är en bra start.',
  2: 'Två pass med minst två dagars mellanrum. Passar bra bredvid löpning.',
  3: 'Tre pass med vilodagar emellan. Ett jämnt och vanligt upplägg.',
  4: 'Fyra pass i veckan. Passen delas upp så att samma muskler får vila.',
  5: 'Fem pass ger mycket träning. Välj det om det passar din vecka.',
};

const emphasisCards = [
  { id: 'full', label: emphasisLabels.full, hint: 'Ben, press, drag och bål.' },
  {
    id: 'run',
    label: emphasisLabels.run,
    hint: 'Mer för ben och bål, för dig som springer.',
  },
  {
    id: 'upper',
    label: emphasisLabels.upper,
    hint: 'Extra för rygg, bröst och armar.',
  },
] as const;

/** A big tappable choice that moves on: a button, not a tick. */
function StepCard({
  label,
  hint,
  onClick,
}: {
  label: string;
  hint: string;
  onClick(): void;
}) {
  const hintId = useId();
  const labelId = useId();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-labelledby={labelId}
      aria-describedby={hintId}
      className="flex min-h-16 w-full flex-col items-start rounded-md border-[3px] border-ink bg-surface px-4 py-3 text-left text-xl font-bold"
    >
      <span id={labelId}>{label}</span>
      <span id={hintId} className="text-base font-normal text-ink-soft">
        {hint}
      </span>
    </button>
  );
}

/** The summaries of the ready workouts end with a how-to-use sentence that does not apply here. */
function firstSentence(text: string): string {
  const end = text.indexOf('. ');
  return end === -1 ? text : text.slice(0, end + 1);
}

/** What "Gör om programmet" starts from: the saved preferences and programme. */
export interface RedoStart {
  preferences: TrainingPreferences;
  program: TrainingProgram | null;
}

export function QuickStart({ redo }: { redo?: RedoStart }) {
  const [, navigate] = useLocation();
  const [draft, setDraft] = useState<Draft>(() =>
    redo
      ? {
          ...readDraft(null),
          goal: 'general',
          step: 'days',
          days: redo.program?.daysPerWeek ?? readDraft(null).days,
          emphasis: redo.program?.emphasis ?? 'full',
          experience: redo.preferences.experience,
        }
      : loadDraft(),
  );
  const {
    goal,
    step,
    equipment,
    experience,
    weights,
    adjustableWeights,
    side,
    days,
    emphasis,
    plan,
    weightKinds,
  } = draft;
  const update = (patch: Partial<Draft>) =>
    setDraft((current) => ({ ...current, ...patch }));
  useEffect(() => {
    if (redo) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* Draft is a convenience only. */
    }
  }, [draft, redo]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [adjustableValid, setAdjustableValid] = useState(true);
  const [pending, setPending] = useState<PendingWeight | null>(null);
  // "Vet inte" is the same programme as "Hela kroppen"; only the card differs.
  const [unsure, setUnsure] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(step !== 'goal');
  useEffect(() => {
    if (moved.current || step !== 'goal') {
      moved.current = true;
      heading.current?.focus();
    }
  }, [step]);

  const steps: Step[] = redo
    ? [
        'days',
        'emphasis',
        ...(emphasis === 'run' ? (['plan'] as const) : []),
        'level',
      ]
    : stepsFor(goal, draft);
  const position = Math.max(0, steps.indexOf(step));
  const last = position === steps.length - 1;
  const rehab = isRehabGoal(goal);
  const hasTools = showsWeights(goal);
  const allowed = allowedEquipment(goal);
  const strength = goal === 'general';
  // The step that hosts the adjustable-weight fields.
  const weightHost: Step = strength ? 'weights' : 'equipment';

  const goTo = (next: Step) => {
    setError('');
    update({ step: next });
  };
  const choose = (next: Goal) => {
    if (next !== goal) clearSelection();
    update({ goal: next, step: next === 'general' ? 'days' : 'equipment' });
  };
  const sideField = (
    <label className="flex flex-col gap-2 text-base font-bold">
      Arbetande sida
      <select
        className={fieldClass}
        value={side}
        onChange={(event) =>
          update({ side: event.target.value as Draft['side'] })
        }
      >
        <option value="both">Höger och vänster</option>
        <option value="right">Endast höger</option>
        <option value="left">Endast vänster</option>
      </select>
      {goal === 'physio' ? (
        <span className="font-normal text-ink-soft">
          Antalen gäller varje sida. För balansklockan är det foten som rör sig;
          benet du står på tränar balansen.
        </span>
      ) : null}
    </label>
  );

  /** The ready workout chosen on the plan step, only while the emphasis is running. */
  function chosenReady(preferences: TrainingPreferences) {
    return emphasis === 'run' && plan !== 'auto'
      ? readyProgramPass(plan, preferences)
      : null;
  }

  async function save() {
    if (hasTools && !adjustableValid) {
      setError('Kontrollera de justerbara vikterna innan du fortsätter.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (redo) {
        // A new programme is a new variation: always a fresh seed.
        const preferences = { ...redo.preferences, experience };
        const ready = chosenReady(preferences);
        const next = buildProgram({
          preferences,
          daysPerWeek: days,
          emphasis,
          startDate: toLocalDate(new Date()),
          now: new Date().toISOString(),
          id: crypto.randomUUID(),
          block: redo.program?.block ?? 1,
          ...(ready ? { ready } : {}),
          pool: programPool(experience, emphasis),
          curated: isCuratedLevel(experience),
          seed: randomSeed(),
        });
        if (!next) {
          setError('Det gick inte att bygga ett program med din utrustning.');
          setBusy(false);
          return;
        }
        await redoTrainingProgram(getDb(), redo.preferences, experience, next);
        navigate('/program?ny=1');
        return;
      }
      const preferences = preferencesFromDraft(draft);
      // Strength users get a four-week programme saved with their answers, in one transaction.
      const ready = chosenReady(preferences);
      const program =
        goal === 'general'
          ? buildProgram({
              preferences,
              ...(ready ? { ready } : {}),
              daysPerWeek: days,
              emphasis,
              startDate: toLocalDate(new Date()),
              now: new Date().toISOString(),
              id: crypto.randomUUID(),
              pool: programPool('new', emphasis),
              curated: true,
              seed: randomSeed(),
            })
          : null;
      await saveTrainingPreferences(
        getDb(),
        preferences,
        program ? () => saveTrainingProgram(getDb(), program) : undefined,
      );
      clearDraft();
      navigate(program ? '/program?ny=1' : '/traning/A');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Kunde inte spara. Försök igen.',
      );
      setBusy(false);
    }
  }

  const draftPrefs = useMemo(() => preferencesFromDraft(draft), [draft]);
  const planPrefs = redo ? { ...redo.preferences, experience } : draftPrefs;
  async function createPass(ids: ExerciseId[]) {
    const id = await saveStartWithCustomWorkout(
      draftPrefs,
      ids,
      customWorkoutPlan(ids, draftPrefs, [], []),
    );
    clearDraft();
    navigate(`/traning/A?workout=${id}`);
  }

  const lastLabel = redo
    ? 'Gör om programmet'
    : goal === 'custom'
      ? 'Öppna mitt rehabprogram'
      : goal === 'physio'
        ? 'Visa mitt program'
        : goal === 'general'
          ? 'Visa mitt program'
          : goal === 'build'
            ? 'Visa mitt pass'
            : 'Visa mitt pass';
  const showFooter = step !== 'goal' && step !== 'rehab' && step !== 'pick';

  return (
    <div
      className={`mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5 ${step === 'pick' ? 'pt-8 pb-[var(--app-nav-clear)]' : 'pt-5'}`}
    >
      {step === 'pick' ? (
        <div className="sticky top-0 z-10 -mx-5 -mt-8 flex items-center justify-between bg-surface px-5">
          <button
            type="button"
            onClick={() => goTo(steps[position - 1] ?? 'goal')}
            className={`min-h-12 text-base ${linkClass}`}
          >
            Tillbaka
          </button>
          <p className="m-0 text-base text-ink-soft">
            Steg {position + 1} av {steps.length}
          </p>
        </div>
      ) : null}
      <h1
        ref={heading}
        tabIndex={-1}
        className={`m-0 font-extrabold ${step === 'goal' ? 'text-5xl' : 'text-3xl'}`}
      >
        {step === 'equipment' && !hasTools
          ? 'Vad har du hemma?'
          : headings[step]}
      </h1>
      {step === 'goal' ? (
        <>
          <p className="m-0 text-lg">
            Vi bygger ett program som passar din vecka och din utrustning.
          </p>
          <div className="flex flex-col gap-3">
            <StepCard
              label="Bli starkare"
              hint="Ett färdigt program på 4 veckor"
              onClick={() => choose('general')}
            />
            <StepCard
              label="Knä- eller rehabprogram"
              hint="Har du ont eller en skada? Följ din vårdgivare."
              onClick={() => goTo('rehab')}
            />
          </div>
          <div className="flex flex-col pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={() => choose('build')}
              className={`min-h-12 self-start text-left text-base ${linkClass}`}
            >
              Skapa eget pass
            </button>
            <Link
              href="/installningar/sakerhetskopia"
              className={`flex min-h-12 items-center self-start text-base ${linkClass}`}
            >
              Har du en säkerhetskopia? Importera
            </Link>
          </div>
        </>
      ) : step === 'rehab' ? (
        <>
          <div className="flex flex-col gap-3">
            <StepCard
              label="Knärehab"
              hint="Byggt på AAOS:s knäprogram"
              onClick={() => choose('knee')}
            />
            <StepCard
              label="Fysioterapeutens knäprogram"
              hint="De 9 övningarna från din fysioterapeut"
              onClick={() => choose('physio')}
            />
            <StepCard
              label="Eget rehabprogram"
              hint="Du lägger in övningarna själv"
              onClick={() => choose('custom')}
            />
          </div>
          <DisclaimerText className="m-0 text-base" />
          <button
            type="button"
            onClick={() => goTo('goal')}
            className={`min-h-12 self-start pb-[max(1rem,env(safe-area-inset-bottom))] text-base ${linkClass}`}
          >
            Tillbaka
          </button>
        </>
      ) : (
        <>
          {step === 'days' ? (
            <>
              <div
                role="radiogroup"
                aria-labelledby="days-label"
                className="flex justify-between gap-2"
              >
                <span id="days-label" className="sr-only">
                  Dagar i veckan
                </span>
                {DAY_OPTIONS.map((count) => (
                  <label
                    key={count}
                    className={`relative flex h-14 min-w-0 max-w-14 flex-1 cursor-pointer flex-col items-center justify-center rounded-md border-[3px] bg-surface has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-(--focus-outline) ${days === count ? 'border-accent' : 'border-edge'}`}
                  >
                    <input
                      type="radio"
                      name="days"
                      value={count}
                      checked={days === count}
                      aria-label={count === 1 ? '1 dag' : `${count} dagar`}
                      onChange={() => update({ days: count })}
                      className="absolute inset-0 size-full cursor-pointer opacity-0"
                    />
                    <span
                      aria-hidden="true"
                      className="count text-4xl leading-none"
                    >
                      {count}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`mt-1 h-1 w-6 ${days === count ? 'bg-accent' : 'bg-transparent'}`}
                    />
                  </label>
                ))}
              </div>
              <p className="m-0 text-lg" aria-live="polite">
                {dayHints[days]}
              </p>
              <p className="m-0 text-base text-ink-soft">
                Dagarna är förslag. Du tränar när det passar.
              </p>
            </>
          ) : null}
          {step === 'emphasis' ? (
            <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
              <legend className="sr-only">Tyngdpunkt</legend>
              {emphasisCards.map((card) => (
                <ChoiceCard
                  key={card.id}
                  type="radio"
                  name="emphasis"
                  value={card.id}
                  label={card.label}
                  hint={card.hint}
                  checked={emphasis === card.id && !unsure}
                  onChange={() => {
                    setUnsure(false);
                    update({ emphasis: card.id });
                  }}
                />
              ))}
              <ChoiceCard
                type="radio"
                name="emphasis"
                value="unsure"
                label="Vet inte – välj åt mig"
                hint="Vi väljer Hela kroppen."
                checked={unsure}
                onChange={() => {
                  setUnsure(true);
                  update({ emphasis: 'full' });
                }}
              />
            </fieldset>
          ) : null}
          {step === 'plan' ? (
            <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
              <legend className="sr-only">Upplägg</legend>
              <ChoiceCard
                type="radio"
                name="plan"
                value="auto"
                label="Automatiskt program"
                hint="Vi bygger alla pass åt dig."
                checked={plan === 'auto'}
                onChange={() => update({ plan: 'auto' })}
              />
              {readyWorkouts.map((workout) => {
                const count =
                  readyProgramPass(workout.id, planPrefs)?.exerciseIds.length ??
                  workout.exerciseIds.length;
                return (
                  <ChoiceCard
                    key={workout.id}
                    type="radio"
                    name="plan"
                    value={workout.id}
                    label={workout.name}
                    hint={
                      <>
                        <span className="block">
                          {firstSentence(workout.summary)}
                        </span>
                        <span className="block">
                          {count} övningar. Blir ditt första pass.
                        </span>
                        <span className="block">{workout.caution}</span>
                      </>
                    }
                    checked={plan === workout.id}
                    onChange={() => update({ plan: workout.id })}
                  />
                );
              })}
            </fieldset>
          ) : null}
          {step === 'equipment' ? (
            <>
              {strength ? (
                <StartEquipment
                  value={{ equipment, weightKinds, weights }}
                  onChange={(next) =>
                    update({
                      equipment: next.equipment,
                      weightKinds: next.weightKinds,
                      weights: next.weights,
                    })
                  }
                />
              ) : (
                <EquipmentInventory
                  idPrefix="start"
                  value={{ equipment, weights, adjustableWeights }}
                  onChange={(next) =>
                    update({
                      equipment: next.equipment,
                      weights: next.weights ?? [],
                      adjustableWeights: next.adjustableWeights ?? [],
                    })
                  }
                  onValidityChange={setAdjustableValid}
                  onPendingChange={setPending}
                  inlineAdd={false}
                  supportItems={allowed}
                  showWeights={hasTools}
                />
              )}
              {rehab ? sideField : null}
              <p className="m-0 text-base text-ink-soft">
                Du kan ändra det här senare i Inställningar › Min utrustning.
              </p>
            </>
          ) : null}
          {step === 'weights' ? (
            <>
              <WeightFields
                idPrefix="start"
                weights={weights}
                adjustableWeights={adjustableWeights}
                onWeightsChange={(next) => update({ weights: next })}
                onAdjustableChange={(next) =>
                  update({ adjustableWeights: next })
                }
                kinds={weightKinds}
                onValidityChange={setAdjustableValid}
                onPendingChange={setPending}
                inlineAdd={false}
                buildValue={(next) => ({
                  equipment,
                  weights: next,
                  adjustableWeights,
                })}
              />
              <p className="m-0 text-base text-ink-soft">
                Du kan ändra det här senare i Inställningar › Min utrustning.
              </p>
            </>
          ) : null}
          {step === 'level' ? (
            <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
              <legend className="mb-2 text-base font-bold">Träningsvana</legend>
              {(
                Object.keys(
                  experienceLabels,
                ) as TrainingPreferences['experience'][]
              ).map((value) => (
                <ChoiceCard
                  key={value}
                  type="radio"
                  name="experience"
                  value={value}
                  label={experienceLabels[value]}
                  hint={levelHints[value]}
                  checked={experience === value}
                  onChange={() => update({ experience: value })}
                />
              ))}
              {goal === 'build' ? (
                <p className="m-0 text-base text-ink-soft">
                  Styr vilka övningar vi visar, antal set och startvikt.
                </p>
              ) : null}
              {redo ? (
                <p className="m-0 text-base text-ink-soft">
                  Nivån styr också din allmänna träningsvana: antal set och
                  startvikter i hela appen.
                </p>
              ) : null}
            </fieldset>
          ) : null}
          {step === 'pick' ? (
            <>
              <p className="m-0 text-lg">
                Välj upp till 12. Ordning, set och vikt ändrar du sedan.
              </p>
              {error ? (
                <p role="alert" className="m-0 text-base font-bold">
                  {error}
                </p>
              ) : null}
              <CustomPicker
                preferences={draftPrefs}
                storageKey={SELECTION_KEY}
                filters={draft.pickFilters}
                onFiltersChange={(next) => update({ pickFilters: next })}
                onCreate={createPass}
                idPrefix="pick"
              />
            </>
          ) : null}
          {showFooter ? (
            <div className="sticky bottom-0 z-10 -mx-5 mt-auto flex flex-col gap-2 border-t-[3px] border-ink bg-surface-tint px-5 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              <p className="m-0 text-base leading-none text-ink-soft">
                Steg {position + 1} av {steps.length}
              </p>
              {error ? (
                <p role="alert" className="m-0 text-base font-bold">
                  {error}
                </p>
              ) : null}
              {pending && !pending.canSubmit ? (
                <p id="weight-hint" className="m-0 text-base font-bold">
                  Skriv en vikt
                </p>
              ) : null}
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="w-auto! shrink-0 px-4!"
                  onClick={() => {
                    if (redo && position === 0) navigate('/program');
                    else goTo(steps[position - 1] ?? 'goal');
                  }}
                >
                  Tillbaka
                </Button>
                <Button
                  disabled={busy || (!!pending && !pending.canSubmit)}
                  aria-describedby={
                    pending && !pending.canSubmit ? 'weight-hint' : undefined
                  }
                  onClick={() => {
                    if (pending) return pending.submit();
                    const next = steps[position + 1];
                    if (
                      next &&
                      !last &&
                      hasTools &&
                      !adjustableValid &&
                      step === weightHost
                    )
                      setError(
                        'Kontrollera de justerbara vikterna innan du fortsätter.',
                      );
                    else if (next && !last) goTo(next);
                    else void save();
                  }}
                >
                  {pending ? pending.label : !last ? 'Nästa' : lastLabel}
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
