import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { bodyRegions } from '../../content/muscles';
import { experienceLabels } from '../../content/programmes';
import { saveStartWithCustomWorkout } from '../../db/customWorkouts';
import { getDb } from '../../db/db';
import { saveTrainingPreferences } from '../../db/training';
import type { ExerciseId, TrainingPreferences } from '../../domain/types';
import { regionsAvailable } from '../../rules/programRosters';
import { Button } from '../../ui/Button';
import { CustomPicker } from './CustomPicker';
import { customWorkoutPlan } from './defaultPlan';
import { EquipmentInventory, type PendingWeight } from './EquipmentInventory';
import {
  allowedEquipment,
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

const fieldClass =
  'min-h-12 w-full rounded-sm border-2 border-edge bg-surface px-3 text-base text-ink';
const optionClass =
  'flex min-h-12 items-center gap-3 rounded-sm border-2 px-3 py-2 text-lg';
const goals: { id: Goal; label: string }[] = [
  { id: 'general', label: 'Bli starkare' },
  { id: 'running', label: 'Styrka för löpning' },
  { id: 'build', label: 'Skapa eget pass' },
  { id: 'knee', label: 'Knärehab' },
];

/** Answers survive leaving via the bottom nav (kept per tab, cleared on save). */
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
  equipment: 'Vad tränar du med?',
  level: 'Hur van är du vid styrketräning?',
  focus: 'Vad vill du träna först?',
  pick: 'Välj dina övningar',
};

export function QuickStart() {
  const [, navigate] = useLocation();
  const [draft, setDraft] = useState(loadDraft);
  const {
    goal,
    step,
    equipment,
    experience,
    weights,
    adjustableWeights,
    side,
    focus,
  } = draft;
  const update = (patch: Partial<Draft>) =>
    setDraft((current) => ({ ...current, ...patch }));
  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* Draft is a convenience only. */
    }
  }, [draft]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [adjustableValid, setAdjustableValid] = useState(true);
  const [pending, setPending] = useState<PendingWeight | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(step !== 'goal');
  useEffect(() => {
    if (moved.current || step !== 'goal') {
      moved.current = true;
      heading.current?.focus();
    }
  }, [step]);

  const steps = stepsFor(goal);
  const position = Math.max(0, steps.indexOf(step));
  const last = position === steps.length - 1;
  const rehab = isRehabGoal(goal);
  // Regions with no exercise for the chosen equipment and level are shown but disabled.
  const available = useMemo(
    () =>
      goal === 'general'
        ? regionsAvailable(preferencesFromDraft({ ...draft, focus: 'all' }))
        : [],
    [goal, draft],
  );
  const chosenParts = draft.bodyParts.filter((part) =>
    available.includes(part),
  );
  const needsParts =
    goal === 'general' && focus === 'select' && !chosenParts.length;

  const goTo = (next: Step) => {
    setError('');
    update({ step: next });
  };
  const choose = (next: Goal) => {
    if (next !== goal) clearSelection();
    update({ goal: next, step: 'equipment' });
  };
  const hasTools = showsWeights(goal);
  const allowed = allowedEquipment(goal);
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

  async function save() {
    if (hasTools && !adjustableValid) {
      setError('Kontrollera de justerbara vikterna innan du fortsätter.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await saveTrainingPreferences(
        getDb(),
        preferencesFromDraft(draft, available),
      );
      clearDraft();
      navigate('/traning/A');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Kunde inte spara. Försök igen.',
      );
      setBusy(false);
    }
  }

  const draftPrefs = useMemo(() => preferencesFromDraft(draft), [draft]);
  async function createPass(ids: ExerciseId[]) {
    const id = await saveStartWithCustomWorkout(
      draftPrefs,
      ids,
      customWorkoutPlan(ids, draftPrefs, [], [], false),
    );
    clearDraft();
    navigate(`/traning/A?workout=${id}`);
  }

  return (
    <div className="mx-auto flex min-h-[85dvh] max-w-md flex-col gap-6 px-5 pt-8 pb-[var(--app-nav-height)]">
      {step !== 'goal' ? (
        <div className="sticky top-0 z-10 -mx-5 -mt-8 flex items-center justify-between bg-surface px-5 pt-2">
          <button
            type="button"
            onClick={() => goTo(steps[position - 1] ?? 'goal')}
            className="min-h-12 text-base font-bold underline"
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
            Välj ett fokus så gör vi ett pass åt dig, eller välj övningarna
            själv.
          </p>
          <div className="flex flex-col gap-3">
            {goals.map((item) => (
              <Button
                key={item.id}
                variant="secondary"
                onClick={() => choose(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => choose('custom')}
              className="min-h-12 self-start text-left text-base underline"
            >
              Jag har ett eget rehabprogram
            </button>
            <button
              type="button"
              onClick={() => choose('physio')}
              className="min-h-12 self-start text-left text-base underline"
            >
              Jag har fysioterapeutens knäprogram (9 övningar)
            </button>
            <p className="m-0 text-base text-ink-soft">
              Annat papper? Välj eget rehabprogram ovan.
            </p>
          </div>
        </>
      ) : (
        <>
          {step === 'equipment' ? (
            <>
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
              {rehab ? sideField : null}
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
                <label
                  key={value}
                  className={`${optionClass} ${experience === value ? 'border-accent' : 'border-edge'}`}
                >
                  <input
                    className="size-6 shrink-0"
                    type="radio"
                    name="experience"
                    checked={experience === value}
                    aria-describedby={`level-${value}`}
                    onChange={() => update({ experience: value })}
                  />
                  <span className="flex flex-col">
                    <span className="font-bold">{experienceLabels[value]}</span>
                    <span
                      id={`level-${value}`}
                      className="text-base text-ink-soft"
                    >
                      {levelHints[value]}
                    </span>
                  </span>
                </label>
              ))}
              <p className="m-0 text-base text-ink-soft">
                {goal === 'build'
                  ? 'Styr vilka övningar vi visar, antal set och startvikt.'
                  : 'Gäller styrketräning. Din löpvana kan vara en annan.'}
              </p>
            </fieldset>
          ) : null}
          {step === 'focus' ? (
            <>
              <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
                <legend className="sr-only">Fokus</legend>
                {(
                  [
                    ['all', 'Hela kroppen'],
                    ['select', 'Välj kroppsdelar'],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className={`${optionClass} ${focus === value ? 'border-accent' : 'border-edge'}`}
                  >
                    <input
                      className="size-6 shrink-0"
                      type="radio"
                      name="focus"
                      checked={focus === value}
                      onChange={() => update({ focus: value })}
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
              {focus === 'select' ? (
                <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
                  <legend className="mb-1 text-base font-bold">
                    Kroppsdelar
                  </legend>
                  {bodyRegions.map((region) => {
                    const enabled = available.includes(region.id);
                    return (
                      <div key={region.id}>
                        <label
                          className={`flex min-h-12 items-center gap-3 text-lg ${enabled ? '' : 'text-ink-soft'}`}
                        >
                          <input
                            className="size-6"
                            type="checkbox"
                            disabled={!enabled}
                            aria-describedby={
                              enabled ? undefined : `region-${region.id}`
                            }
                            checked={
                              enabled && draft.bodyParts.includes(region.id)
                            }
                            onChange={(event) =>
                              update({
                                bodyParts: event.target.checked
                                  ? [
                                      ...new Set([
                                        ...draft.bodyParts,
                                        region.id,
                                      ]),
                                    ]
                                  : draft.bodyParts.filter(
                                      (part) => part !== region.id,
                                    ),
                              })
                            }
                          />
                          {region.label}
                        </label>
                        {enabled ? null : (
                          <p
                            id={`region-${region.id}`}
                            className="m-0 pl-9 text-base text-ink-soft"
                          >
                            Inga övningar med din utrustning och vana.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </fieldset>
              ) : null}
            </>
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
          ) : (
            <div className="sticky bottom-[var(--app-nav-height)] z-10 -mx-5 mt-auto flex flex-col gap-2 border-t-[3px] border-ink bg-surface-tint px-5 py-3">
              {error ? (
                <p role="alert" className="m-0 text-base font-bold">
                  {error}
                </p>
              ) : null}
              {last && needsParts ? (
                <p id="focus-blocked" className="m-0 text-base font-bold">
                  Välj minst en kroppsdel, eller välj Hela kroppen.
                </p>
              ) : null}
              {pending && !pending.canSubmit ? (
                <p id="weight-hint" className="m-0 text-base font-bold">
                  Skriv en vikt
                </p>
              ) : null}
              <Button
                disabled={
                  busy ||
                  (last && needsParts) ||
                  (!!pending && !pending.canSubmit)
                }
                aria-describedby={
                  pending && !pending.canSubmit
                    ? 'weight-hint'
                    : last && needsParts
                      ? 'focus-blocked'
                      : undefined
                }
                onClick={() => {
                  if (pending) return pending.submit();
                  const next = steps[position + 1];
                  if (next === 'pick' && hasTools && !adjustableValid)
                    setError(
                      'Kontrollera de justerbara vikterna innan du fortsätter.',
                    );
                  else if (next && !last) goTo(next);
                  else void save();
                }}
              >
                {pending
                  ? pending.label
                  : !last
                    ? 'Nästa'
                    : goal === 'custom'
                      ? 'Öppna mitt rehabprogram'
                      : goal === 'physio'
                        ? 'Visa mitt program'
                        : 'Visa mitt pass'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
