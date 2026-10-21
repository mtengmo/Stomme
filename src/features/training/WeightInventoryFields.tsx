import type { WeightInventoryItem } from '../../domain/types';
import { Button } from '../../ui/Button';

const fieldClass =
  'min-h-12 w-full rounded-sm border-2 border-edge bg-paper px-3 text-base text-ink';

export function WeightInventoryFields({
  value,
  onChange,
}: {
  value: WeightInventoryItem[];
  onChange(value: WeightInventoryItem[]): void;
}) {
  return (
    <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
      <legend className="text-lg font-bold">Mina vikter</legend>
      <p className="m-0 text-base text-ink-soft">
        Ange vikten för ett redskap. Appen räknar ut totalvikten.
      </p>
      {value.map((item, index) => (
        <div
          key={`${item.type}-${item.kg}-${item.count}`}
          className="grid grid-cols-[1fr_5.5rem] gap-2 border-t-2 border-edge pt-3"
        >
          <label className="flex flex-col gap-1 text-base font-bold">
            Redskap
            <select
              className={fieldClass}
              value={item.type}
              onChange={(event) =>
                onChange(
                  value.map((entry, n) =>
                    n === index
                      ? {
                          ...entry,
                          type: event.target
                            .value as WeightInventoryItem['type'],
                        }
                      : entry,
                  ),
                )
              }
            >
              <option value="dumbbell">Hantel</option>
              <option value="kettlebell">Kettlebell</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-base font-bold">
            Antal
            <select
              className={fieldClass}
              value={item.count}
              onChange={(event) =>
                onChange(
                  value.map((entry, n) =>
                    n === index
                      ? { ...entry, count: Number(event.target.value) as 1 | 2 }
                      : entry,
                  ),
                )
              }
            >
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-base font-bold">
            Kg per redskap
            <input
              className={fieldClass}
              type="number"
              inputMode="decimal"
              min="0.5"
              max="100"
              step="0.5"
              value={item.kg}
              onChange={(event) =>
                onChange(
                  value.map((entry, n) =>
                    n === index
                      ? { ...entry, kg: Number(event.target.value) }
                      : entry,
                  ),
                )
              }
            />
          </label>
          <button
            type="button"
            className="min-h-12 self-end text-base font-bold underline"
            onClick={() => onChange(value.filter((_, n) => n !== index))}
          >
            Ta bort
          </button>
        </div>
      ))}
      <Button
        variant="secondary"
        onClick={() =>
          onChange([...value, { type: 'dumbbell', kg: 5, count: 2 }])
        }
      >
        Lägg till vikt
      </Button>
    </fieldset>
  );
}
