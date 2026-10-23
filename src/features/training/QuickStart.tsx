import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { getDb } from '../../db/db';
import { saveTrainingPreferences } from '../../db/training';
import type { EquipmentChoice, TrainingPreferences } from '../../domain/types';
import { Button } from '../../ui/Button';
import { WeightInventoryFields } from './WeightInventoryFields';

const fieldClass =
  'min-h-12 w-full rounded-sm border-2 border-edge bg-surface px-3 text-base text-ink';
type Goal = 'general' | 'running' | 'knee' | 'physio' | 'custom';
const goals: { id: Goal; label: string }[] = [
  { id: 'general', label: 'Bli starkare' },
  { id: 'running', label: 'Styrka för löpning' },
  { id: 'knee', label: 'Träna knäna' },
];

/** Answers survive leaving via the bottom nav (kept per tab, cleared on save). */
const DRAFT_KEY = 'stomme.quickstart.draft';
interface Draft {
  goal: Goal | null;
  equipment: EquipmentChoice[];
  experience: TrainingPreferences['experience'];
  weights: NonNullable<TrainingPreferences['weights']>;
  side: 'both' | 'right' | 'left';
}
function readDraft(): Partial<Draft> {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object'
      ? (parsed as Partial<Draft>)
      : {};
  } catch {
    return {};
  }
}
function clearDraft(): void {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* No draft to clear. */
  }
}
export function QuickStart() {
  const [, navigate] = useLocation();
  const [draft] = useState(readDraft);
  const [goal, setGoal] = useState<Goal | null>(
    goals.some((g) => g.id === draft.goal) ||
      draft.goal === 'custom' ||
      draft.goal === 'physio'
      ? (draft.goal ?? null)
      : null,
  );
  const [equipment, setEquipment] = useState<EquipmentChoice[]>(
    Array.isArray(draft.equipment) ? draft.equipment : ['bodyweight'],
  );
  const [experience, setExperience] = useState<
    TrainingPreferences['experience']
  >(
    draft.experience === 'some' || draft.experience === 'regular'
      ? draft.experience
      : 'new',
  );
  const [weights, setWeights] = useState<
    NonNullable<TrainingPreferences['weights']>
  >(Array.isArray(draft.weights) ? draft.weights : []);
  const [side, setSide] = useState<'both' | 'right' | 'left'>(
    draft.side === 'right' || draft.side === 'left' ? draft.side : 'both',
  );
  useEffect(() => {
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ goal, equipment, experience, weights, side }),
      );
    } catch {
      /* Draft is a convenience only. */
    }
  }, [goal, equipment, experience, weights, side]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  useEffect(() => {
    if (goal || moved.current) {
      moved.current = true;
      heading.current?.focus();
    }
  }, [goal]);
  const toggle = (item: EquipmentChoice, checked: boolean) =>
    setEquipment((values) =>
      checked
        ? [...new Set([...values, item])]
        : values.filter((value) => value !== item),
    );
  function family(type: 'dumbbell' | 'kettlebell', count: '0' | '1' | '2') {
    setEquipment((values) => [
      ...values.filter((value) => !value.startsWith(type)),
      ...(count === '0' ? [] : [`${type}-${count}` as EquipmentChoice]),
    ]);
  }
  return (
    <div className="mx-auto flex min-h-[85dvh] max-w-md flex-col gap-6 px-5 pt-8 pb-[var(--app-nav-height)]">
      {goal ? (
        <button
          type="button"
          onClick={() => {
            setGoal(null);
            setError('');
          }}
          className="min-h-12 self-start text-base font-bold underline"
        >
          Tillbaka
        </button>
      ) : null}
      <h1 ref={heading} tabIndex={-1} className="m-0 text-5xl font-extrabold">
        {goal ? 'Vad har du till hands?' : 'Vad vill du träna?'}
      </h1>
      {!goal ? (
        <>
          <p className="m-0 text-lg">Välj ett fokus. Vi gör ett pass åt dig.</p>
          <div className="flex flex-col gap-3">
            {goals.map((item) => (
              <Button
                key={item.id}
                variant="secondary"
                onClick={() => setGoal(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => setGoal('custom')}
              className="min-h-12 self-start text-left text-base underline"
            >
              Jag har ett eget rehabprogram
            </button>
            <button
              type="button"
              onClick={() => setGoal('physio')}
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
          <p className="m-0 text-lg">
            {goal === 'physio'
              ? 'Välj det du har hemma. Övningar som kräver annat än det du väljer lämnas bort. Utan val blir det bara övningar med kroppsvikt.'
              : 'Välj det du vill använda. Utan val blir det ett pass med kroppsvikt.'}
          </p>
          <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
            <legend className="sr-only">Utrustning</legend>
            {goal !== 'knee' && goal !== 'physio'
              ? (['dumbbell', 'kettlebell'] as const).map((type) => {
                  const count = equipment.includes(`${type}-2`)
                    ? '2'
                    : equipment.includes(`${type}-1`)
                      ? '1'
                      : '0';
                  const label = type === 'dumbbell' ? 'Hantlar' : 'Kettlebell';
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
                })
              : null}
            {(
              [
                ['chair', 'Stabil stol eller bänk'],
                ['support', 'Vägg eller stabilt stöd'],
                ...(goal === 'physio'
                  ? ([['band', 'Träningsband']] as const)
                  : []),
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className="flex min-h-12 items-center gap-3 text-lg"
              >
                <input
                  className="size-6"
                  type="checkbox"
                  checked={equipment.includes(value)}
                  onChange={(event) => toggle(value, event.target.checked)}
                />
                {label}
              </label>
            ))}
          </fieldset>
          {goal === 'general' || goal === 'running' ? (
            <label className="flex flex-col gap-2 text-base font-bold">
              Vana av styrketräning
              <select
                className={fieldClass}
                aria-label="Träningsvana"
                value={experience}
                onChange={(event) =>
                  setExperience(
                    event.target.value as TrainingPreferences['experience'],
                  )
                }
              >
                <option value="new">Ny eller på väg tillbaka</option>
                <option value="some">Viss vana</option>
                <option value="regular">Tränar regelbundet</option>
              </select>
              <span className="font-normal text-ink-soft">
                Gäller styrketräning. Din löpvana kan vara en annan.
              </span>
            </label>
          ) : null}
          {equipment.some(
            (item) =>
              item.startsWith('dumbbell') || item.startsWith('kettlebell'),
          ) ? (
            <details>
              <summary className="min-h-12 cursor-pointer py-3 text-base font-bold">
                Ange vikterna du äger
              </summary>
              <WeightInventoryFields value={weights} onChange={setWeights} />
            </details>
          ) : null}
          {goal === 'physio' ? (
            <label className="flex flex-col gap-2 text-base font-bold">
              Arbetande sida
              <select
                className={fieldClass}
                value={side}
                onChange={(event) => setSide(event.target.value as typeof side)}
              >
                <option value="both">Höger och vänster</option>
                <option value="right">Endast höger</option>
                <option value="left">Endast vänster</option>
              </select>
              <span className="font-normal text-ink-soft">
                Antalen gäller varje sida. För balansklockan är det stödbenet.
              </span>
            </label>
          ) : null}
          <details>
            <summary className="min-h-12 cursor-pointer py-3 text-base font-bold">
              Fler inställningar
            </summary>
            <div className="flex flex-col gap-3 pt-2">
              {goal !== 'knee' && goal !== 'physio'
                ? (['step', 'band'] as const).map((value) => (
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
                      {value === 'step' ? 'Träningssteg' : 'Träningsband'}
                    </label>
                  ))
                : null}
              {goal === 'knee' || goal === 'custom' ? (
                <label className="flex flex-col gap-2 text-base font-bold">
                  Arbetande sida
                  <select
                    className={fieldClass}
                    value={side}
                    onChange={(event) =>
                      setSide(event.target.value as typeof side)
                    }
                  >
                    <option value="both">Höger och vänster</option>
                    <option value="right">Endast höger</option>
                    <option value="left">Endast vänster</option>
                  </select>
                </label>
              ) : null}
              <p className="m-0 text-base text-ink-soft">
                Du kan ändra det här senare.
              </p>
            </div>
          </details>
          <div className="sticky bottom-[var(--app-nav-height)] z-10 -mx-5 mt-auto flex flex-col gap-2 border-t-[3px] border-ink bg-surface-tint px-5 py-3">
            {error ? (
              <p role="alert" className="m-0 text-base font-bold">
                {error}
              </p>
            ) : null}
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError('');
                try {
                  await saveTrainingPreferences(getDb(), {
                    programId:
                      goal === 'knee' || goal === 'custom' || goal === 'physio'
                        ? 'rehab'
                        : goal,
                    equipment,
                    experience,
                    ...(weights.length ? { weights } : {}),
                    ...(goal === 'knee' ||
                    goal === 'custom' ||
                    goal === 'physio'
                      ? {
                          rehabFocus:
                            goal === 'knee'
                              ? ('knee' as const)
                              : goal === 'physio'
                                ? ('knee-physio' as const)
                                : ('custom' as const),
                          rehabSide: side,
                        }
                      : {}),
                  });
                  clearDraft();
                  navigate('/traning/A');
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : 'Kunde inte spara. Försök igen.',
                  );
                  setBusy(false);
                }
              }}
            >
              {goal === 'custom'
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
