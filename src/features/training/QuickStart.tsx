import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { bodyRegions } from '../../content/muscles';
import { experienceLabels } from '../../content/programmes';
import { getDb } from '../../db/db';
import { saveTrainingPreferences } from '../../db/training';
import type { EquipmentChoice, TrainingPreferences } from '../../domain/types';
import { regionsAvailable } from '../../rules/programRosters';
import { Button } from '../../ui/Button';
import { AdjustableWeightFields } from './AdjustableWeightFields';
import {
  allowedEquipment,
  type Draft,
  type Goal,
  isRehabGoal,
  levelHints,
  preferencesFromDraft,
  readDraft,
  type Step,
  stepsFor,
} from './quickStartModel';
import { WeightInventoryFields } from './WeightInventoryFields';

const fieldClass =
  'min-h-12 w-full rounded-sm border-2 border-edge bg-surface px-3 text-base text-ink';
const optionClass =
  'flex min-h-12 items-center gap-3 rounded-sm border-2 px-3 py-2 text-lg';
const goals: { id: Goal; label: string }[] = [
  { id: 'general', label: 'Bli starkare' },
  { id: 'running', label: 'Styrka för löpning' },
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
function clearDraft(): void {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* No draft to clear. */
  }
}

const headings: Record<Step, string> = {
  goal: 'Vad vill du träna?',
  equipment: 'Egenvikt eller utrustning?',
  level: 'Hur van är du vid styrketräning?',
  focus: 'Vad vill du träna först?',
};

export function QuickStart() {
  const [, navigate] = useLocation();
  const [draft, setDraft] = useState(loadDraft);
  const {
    goal,
    step,
    mode,
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

  const toggle = (item: EquipmentChoice, checked: boolean) =>
    update({
      equipment: checked
        ? [...new Set([...equipment, item])]
        : equipment.filter((value) => value !== item),
    });
  function family(type: 'dumbbell' | 'kettlebell', count: '0' | '1' | '2') {
    update({
      equipment: [
        ...equipment.filter((value) => !value.startsWith(type)),
        ...(count === '0' ? [] : [`${type}-${count}` as EquipmentChoice]),
      ],
    });
  }
  const goTo = (next: Step) => {
    setError('');
    update({ step: next });
  };
  const choose = (next: Goal) => update({ goal: next, step: 'equipment' });
  const hasTools = equipment.some(
    (item) => item.startsWith('dumbbell') || item.startsWith('kettlebell'),
  );
  const allowed = allowedEquipment(goal);
  const tools = allowed.includes('dumbbell-1')
    ? (['dumbbell', 'kettlebell'] as const)
    : [];
  // The physio's band has its own checkbox above.
  const extras = (['step', 'band', 'pull-up-bar', 'dip-bars'] as const).filter(
    (item) => allowed.includes(item) && !(goal === 'physio' && item === 'band'),
  );
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

  return (
    <div className="mx-auto flex min-h-[85dvh] max-w-md flex-col gap-6 px-5 pt-8 pb-[var(--app-nav-height)]">
      {step !== 'goal' ? (
        <button
          type="button"
          onClick={() => goTo(steps[position - 1] ?? 'goal')}
          className="min-h-12 self-start text-base font-bold underline"
        >
          Tillbaka
        </button>
      ) : null}
      {step !== 'goal' ? (
        <p className="m-0 text-base text-ink-soft">
          Steg {position + 1} av {steps.length}
        </p>
      ) : null}
      <h1 ref={heading} tabIndex={-1} className="m-0 text-5xl font-extrabold">
        {headings[step]}
      </h1>
      {step === 'goal' ? (
        <>
          <p className="m-0 text-lg">Välj ett fokus. Vi gör ett pass åt dig.</p>
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
              <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
                <legend className="sr-only">Vad tränar du med?</legend>
                <label
                  className={`${optionClass} ${mode === 'bodyweight' ? 'border-accent' : 'border-edge'}`}
                >
                  <input
                    className="size-6 shrink-0"
                    type="radio"
                    name="mode"
                    checked={mode === 'bodyweight'}
                    onChange={() => update({ mode: 'bodyweight' })}
                  />
                  Egenvikt – kroppen, en stol och en vägg
                </label>
                <label
                  className={`${optionClass} ${mode === 'equipment' ? 'border-accent' : 'border-edge'}`}
                >
                  <input
                    className="size-6 shrink-0"
                    type="radio"
                    name="mode"
                    checked={mode === 'equipment'}
                    onChange={() =>
                      update({
                        mode: 'equipment',
                        // Everyone has a chair and a wall: the physio's programme starts with them ticked.
                        equipment:
                          goal === 'physio' && !equipment.length
                            ? ['chair', 'support']
                            : equipment,
                      })
                    }
                  />
                  Utrustning
                </label>
              </fieldset>
              {mode === 'bodyweight' && goal === 'physio' ? (
                <p className="m-0 text-base text-ink-soft">
                  Träningsband ingår inte i Egenvikt. Välj Utrustning om du har
                  band; det behövs för övning 5 och 7.
                </p>
              ) : null}
              {mode === 'equipment' ? (
                <>
                  <p className="m-0 text-lg">
                    {goal === 'physio'
                      ? 'Välj det du har hemma. Övningar som kräver annat än det du väljer lämnas bort. Utan val blir det bara övningar med kroppsvikt.'
                      : 'Välj det du vill använda. Utan val blir det ett pass med kroppsvikt.'}
                  </p>
                  <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
                    <legend className="sr-only">Utrustning</legend>
                    {tools.map((type) => {
                      const count = equipment.includes(`${type}-2`)
                        ? '2'
                        : equipment.includes(`${type}-1`)
                          ? '1'
                          : '0';
                      const label =
                        type === 'dumbbell' ? 'Hantlar' : 'Kettlebell';
                      return (
                        <div key={type}>
                          <label className="flex min-h-12 items-center gap-3 text-lg">
                            <input
                              className="size-6"
                              type="checkbox"
                              checked={count !== '0'}
                              onChange={(event) =>
                                family(type, event.target.checked ? '1' : '0')
                              }
                            />
                            {label}
                          </label>
                          {count !== '0' ? (
                            <label className="mt-1 flex flex-col gap-2 text-base font-bold">
                              {type === 'dumbbell'
                                ? 'Antal hantlar'
                                : 'Antal kettlebells'}
                              <select
                                className={fieldClass}
                                value={count}
                                onChange={(event) =>
                                  family(type, event.target.value as '1' | '2')
                                }
                              >
                                <option value="1" translate="no">
                                  1
                                </option>
                                <option value="2">Två</option>
                              </select>
                            </label>
                          ) : null}
                        </div>
                      );
                    })}
                    {(
                      [
                        ['chair', 'Stabil stol eller bänk'],
                        ['support', 'Vägg eller stabilt stöd'],
                        ...(goal === 'physio'
                          ? ([['band', 'Träningsband']] as const)
                          : []),
                      ] as const
                    ).map(([value, label]) => (
                      <div key={value}>
                        <label className="flex min-h-12 items-center gap-3 text-lg">
                          <input
                            className="size-6"
                            type="checkbox"
                            checked={equipment.includes(value)}
                            onChange={(event) =>
                              toggle(value, event.target.checked)
                            }
                          />
                          {label}
                        </label>
                        {value === 'band' ? (
                          <p className="m-0 pl-9 text-base text-ink-soft">
                            Träningsband behövs för övning 5 och 7.
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </fieldset>
                  {hasTools ? (
                    <details open>
                      <summary className="min-h-12 cursor-pointer py-3 text-base font-bold">
                        Ange vikterna du äger
                      </summary>
                      <WeightInventoryFields
                        value={weights}
                        onChange={(next) => update({ weights: next })}
                      />
                      <div className="mt-4 border-t-2 border-edge pt-4">
                        <AdjustableWeightFields
                          value={adjustableWeights}
                          onChange={(next) =>
                            update({ adjustableWeights: next })
                          }
                          onValidityChange={setAdjustableValid}
                        />
                      </div>
                      {weights.length === 0 &&
                      adjustableWeights.length === 0 ? (
                        <p className="m-0 pt-2 text-base font-bold">
                          Ange fasta vikter eller de justerbara vikter du kan
                          ställa in för att få övningar med hantel/kettlebell.
                        </p>
                      ) : null}
                    </details>
                  ) : null}
                  {extras.length ? (
                    <details>
                      <summary className="min-h-12 cursor-pointer py-3 text-base font-bold">
                        Fler inställningar
                      </summary>
                      <div className="flex flex-col gap-3 pt-2">
                        {extras.map((value) => (
                          <label
                            key={value}
                            className="flex min-h-12 items-center gap-3 text-base"
                          >
                            <input
                              className="size-6"
                              type="checkbox"
                              checked={equipment.includes(value)}
                              onChange={(event) =>
                                toggle(value, event.target.checked)
                              }
                            />
                            {value === 'step'
                              ? 'Träningssteg'
                              : value === 'band'
                                ? 'Träningsband'
                                : value === 'pull-up-bar'
                                  ? 'Fast monterad chinsstång'
                                  : 'Stabil dipsställning'}
                          </label>
                        ))}
                      </div>
                    </details>
                  ) : null}
                </>
              ) : null}
              {rehab ? sideField : null}
              <p className="m-0 text-base text-ink-soft">
                Du kan ändra det här senare.
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
                Gäller styrketräning. Din löpvana kan vara en annan.
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
            <Button
              disabled={busy || (last && needsParts)}
              aria-describedby={
                last && needsParts ? 'focus-blocked' : undefined
              }
              onClick={() => {
                const next = steps[position + 1];
                if (next && !last) goTo(next);
                else void save();
              }}
            >
              {!last
                ? 'Nästa'
                : goal === 'custom'
                  ? 'Öppna mitt rehabprogram'
                  : goal === 'physio'
                    ? 'Visa mitt program'
                    : 'Visa mitt pass'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
