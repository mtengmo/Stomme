import { useState } from 'react';
import { equipmentChoices, isWorkoutEquipment } from '../../content/programmes';
import type {
  EquipmentChoice,
  TrainingPreferences,
  WorkoutEquipment,
} from '../../domain/types';
import { Button } from '../../ui/Button';
import { AdjustableWeightFields } from './AdjustableWeightFields';
import { WeightInventoryFields } from './WeightInventoryFields';

export function WorkoutEquipmentControls({
  home,
  override,
  onApply,
}: {
  home: TrainingPreferences;
  override?: WorkoutEquipment;
  onApply(value: WorkoutEquipment | undefined): void;
}) {
  const [draft, setDraft] = useState<WorkoutEquipment>(() =>
    structuredClone(
      override ?? {
        equipment: home.equipment,
        weights: home.weights ?? [],
        adjustableWeights: home.adjustableWeights ?? [],
      },
    ),
  );
  const [error, setError] = useState('');
  const [adjustableValid, setAdjustableValid] = useState(true);
  const families = ['dumbbell', 'kettlebell'] as const;
  return (
    <section
      aria-label="Utrustning för detta pass"
      className="border-y-2 border-edge py-2"
    >
      {override ? (
        <p role="status" className="m-0 py-2 text-base font-bold">
          Tillfällig utrustning används för detta pass.
        </p>
      ) : null}
      <details>
        <summary className="min-h-12 cursor-pointer py-3 text-base font-bold">
          Annan utrustning för detta pass
        </summary>
        <div className="flex flex-col gap-4 py-3">
          <p className="m-0 text-base text-ink-soft">
            Välj det som finns här. När du tillämpar valet visas ett nytt
            passförslag. Dina anpassningar med hemutrustningen finns kvar när du
            återgår till den.
          </p>
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-2 text-lg font-bold">
              Tillgänglig utrustning
            </legend>
            {families.map((type) => (
              <label
                key={type}
                className="flex flex-col gap-2 text-base font-bold"
              >
                {type === 'dumbbell'
                  ? 'Hantlar för passet'
                  : 'Kettlebells för passet'}
                <select
                  className="min-h-12 w-full rounded-sm border-2 border-edge bg-surface px-3 text-base text-ink"
                  value={
                    draft.equipment.includes(`${type}-2`)
                      ? '2'
                      : draft.equipment.includes(`${type}-1`)
                        ? '1'
                        : '0'
                  }
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      equipment: [
                        ...current.equipment.filter(
                          (item) => !item.startsWith(type),
                        ),
                        ...(event.target.value === '0'
                          ? []
                          : [
                              `${type}-${event.target.value}` as EquipmentChoice,
                            ]),
                      ],
                    }))
                  }
                >
                  <option value="0">Inga</option>
                  <option value="1">Ett redskap</option>
                  <option value="2">Två redskap</option>
                </select>
              </label>
            ))}
            {(Object.entries(equipmentChoices) as [EquipmentChoice, string][])
              .filter(([key]) => !families.some((type) => key.startsWith(type)))
              .map(([key, label]) => (
                <label
                  key={key}
                  className="flex min-h-12 items-center gap-3 text-base"
                >
                  <input
                    type="checkbox"
                    className="size-6 shrink-0"
                    checked={draft.equipment.includes(key)}
                    disabled={key === 'bodyweight'}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        equipment: event.target.checked
                          ? [...current.equipment, key]
                          : current.equipment.filter((item) => item !== key),
                      }))
                    }
                  />
                  {label}
                </label>
              ))}
          </fieldset>
          <WeightInventoryFields
            value={draft.weights ?? []}
            onChange={(weights) =>
              setDraft((current) => ({ ...current, weights }))
            }
          />
          <AdjustableWeightFields
            onValidityChange={setAdjustableValid}
            value={draft.adjustableWeights ?? []}
            onChange={(adjustableWeights) =>
              setDraft((current) => ({ ...current, adjustableWeights }))
            }
          />
          {error ? (
            <p role="alert" className="m-0 text-base font-bold">
              {error}
            </p>
          ) : null}
          <Button
            variant="secondary"
            disabled={!adjustableValid}
            onClick={() => {
              if (!adjustableValid || !isWorkoutEquipment(draft))
                return setError(
                  'Kontrollera vikterna och de ställbara viktlägena.',
                );
              onApply(structuredClone(draft));
            }}
          >
            Använd utrustningen för detta pass
          </Button>
        </div>
      </details>
      {override ? (
        <Button variant="secondary" onClick={() => onApply(undefined)}>
          Återgå till min hemutrustning
        </Button>
      ) : null}
      <p className="m-0 py-2 text-base text-ink-soft">
        Hemutrustning och sparade standardpass ändras inte.
      </p>
    </section>
  );
}
