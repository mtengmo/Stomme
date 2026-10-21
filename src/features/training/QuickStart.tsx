import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { getDb } from '../../db/db';
import { saveTrainingPreferences } from '../../db/training';
import type { EquipmentChoice, TrainingPreferences } from '../../domain/types';
import { Button } from '../../ui/Button';
import { WeightInventoryFields } from './WeightInventoryFields';

const fieldClass =
  'min-h-12 w-full rounded-sm border-2 border-edge bg-paper px-3 text-base text-ink';
type Goal = 'general' | 'running' | 'knee' | 'custom';
const goals: { id: Goal; label: string }[] = [
  { id: 'general', label: 'Bli starkare' },
  { id: 'running', label: 'Styrka för löpning' },
  { id: 'knee', label: 'Träna knäna' },
];
export function QuickStart() {
  const [, navigate] = useLocation();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [equipment, setEquipment] = useState<EquipmentChoice[]>(['bodyweight']);
  const [experience, setExperience] =
    useState<TrainingPreferences['experience']>('new');
  const [weights, setWeights] = useState<
    NonNullable<TrainingPreferences['weights']>
  >([]);
  const [side, setSide] = useState<'both' | 'right' | 'left'>('both');
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
    <div className="mx-auto flex min-h-[85dvh] max-w-md flex-col gap-6 px-5 pt-8 pb-10">
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
          <button
            type="button"
            onClick={() => setGoal('custom')}
            className="mt-2 min-h-12 self-start text-base underline"
          >
            Jag har ett eget rehabprogram
          </button>
        </>
      ) : (
        <>
          <p className="m-0 text-lg">
            Välj det du vill använda. Utan val blir det ett pass med kroppsvikt.
          </p>
          <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
            <legend className="sr-only">Utrustning</legend>
            {goal !== 'knee'
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
          <details>
            <summary className="min-h-12 cursor-pointer py-3 text-base font-bold">
              Fler inställningar
            </summary>
            <div className="flex flex-col gap-3 pt-2">
              {goal !== 'knee'
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
                    goal === 'knee' || goal === 'custom' ? 'rehab' : goal,
                  equipment,
                  experience,
                  ...(weights.length ? { weights } : {}),
                  ...(goal === 'knee' || goal === 'custom'
                    ? {
                        rehabFocus:
                          goal === 'knee'
                            ? ('knee' as const)
                            : ('custom' as const),
                        rehabSide: side,
                      }
                    : {}),
                });
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
            {goal === 'custom' ? 'Öppna mitt rehabprogram' : 'Visa mitt pass'}
          </Button>
        </>
      )}
    </div>
  );
}
