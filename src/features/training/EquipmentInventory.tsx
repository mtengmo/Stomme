import { useRef, useState } from 'react';
import { equipmentChoices } from '../../content/programmes';
import type {
  EquipmentChoice,
  WeightInventoryItem,
  WorkoutEquipment,
} from '../../domain/types';
import { Button } from '../../ui/Button';
import { AdjustableWeightFields } from './AdjustableWeightFields';

const fieldClass =
  'min-h-12 w-full rounded-sm border-2 border-edge bg-surface px-3 text-base text-ink';
const MAX_WEIGHTS = 20;

type Kind = WeightInventoryItem['type'];
const names: Record<Kind, { one: string; add: string; many: string }> = {
  dumbbell: { one: 'hantel', add: 'Lägg till hantel', many: 'hantlar' },
  kettlebell: {
    one: 'kettlebell',
    add: 'Lägg till kettlebell',
    many: 'kettlebells',
  },
};

/** Accepts "7,5" and "7.5"; 0,5 to 100 kg. */
export function parseKg(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+(?:[,.]\d+)?$/.test(trimmed)) return null;
  const kg = Number(trimmed.replace(',', '.'));
  return kg >= 0.5 && kg <= 100 ? kg : null;
}

function kgText(kg: number): string {
  return String(kg).replace('.', ',');
}

function lineText(item: WeightInventoryItem): string {
  const name = names[item.type].one;
  return `${name[0]?.toUpperCase()}${name.slice(1)} ${kgText(item.kg)} kg · ${item.count === 2 ? 'par' : '1 st'}`;
}

/** Adds a weight; the same kind and kg again merges 1 + 1 into a pair. */
export function addWeight(
  weights: WeightInventoryItem[],
  item: WeightInventoryItem,
): { weights: WeightInventoryItem[]; error?: string } {
  const existing = weights.find(
    (entry) => entry.type === item.type && entry.kg === item.kg,
  );
  if (!existing) {
    if (weights.length >= MAX_WEIGHTS)
      return {
        weights,
        error: `Du kan lägga till högst ${MAX_WEIGHTS} vikter.`,
      };
    return { weights: [...weights, item] };
  }
  if (existing.count + item.count > 2)
    return {
      weights,
      error: `Du har redan ett par ${names[item.type].many} på ${kgText(item.kg)} kg.`,
    };
  return {
    weights: weights.map((entry) =>
      entry === existing ? { ...entry, count: 2 } : entry,
    ),
  };
}

/**
 * The one place to say what you own: weights (dumbbells, kettlebells) and support items.
 * Used by the start flow, Settings and the per-workout override.
 */
export function EquipmentInventory({
  value,
  onChange,
  onValidityChange,
  supportItems,
  showWeights = true,
  idPrefix,
}: {
  value: WorkoutEquipment;
  onChange(value: WorkoutEquipment): void;
  onValidityChange?(valid: boolean): void;
  supportItems: readonly EquipmentChoice[];
  showWeights?: boolean;
  idPrefix: string;
}) {
  const weights = value.weights ?? [];
  const [adding, setAdding] = useState<Kind | null>(null);
  const [kgInput, setKgInput] = useState('');
  const [pair, setPair] = useState<'1' | '2'>('2');
  const [error, setError] = useState('');
  const buttons = useRef<Partial<Record<Kind, HTMLButtonElement | null>>>({});
  const kgField = useRef<HTMLInputElement>(null);

  function open(kind: Kind) {
    setAdding(kind);
    setKgInput('');
    setPair('2');
    setError('');
    setTimeout(() => kgField.current?.focus(), 0);
  }
  function close(kind: Kind) {
    setAdding(null);
    setError('');
    setTimeout(() => buttons.current[kind]?.focus(), 0);
  }
  function submit(kind: Kind) {
    const kg = parseKg(kgInput);
    if (kg === null) {
      setError('Ange en vikt mellan 0,5 och 100 kg, till exempel 7,5.');
      kgField.current?.focus();
      return;
    }
    const result = addWeight(weights, {
      type: kind,
      kg,
      count: pair === '2' ? 2 : 1,
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    onChange({ ...value, weights: result.weights });
    close(kind);
  }
  function remove(index: number) {
    onChange({ ...value, weights: weights.filter((_, n) => n !== index) });
  }
  const toggle = (item: EquipmentChoice, checked: boolean) =>
    onChange({
      ...value,
      equipment: checked
        ? [...new Set([...value.equipment, item])]
        : value.equipment.filter((entry) => entry !== item),
    });
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="flex flex-col gap-5">
      {showWeights ? (
        <section
          aria-labelledby={id('weights')}
          className="flex flex-col gap-3"
        >
          <h2 id={id('weights')} className="m-0 text-xl font-bold">
            Mina vikter
          </h2>
          {weights.length || (value.adjustableWeights ?? []).length ? null : (
            <p className="m-0 text-base text-ink-soft">
              Bara kroppsvikt – passet byggs utan vikter.
            </p>
          )}
          {weights.length ? (
            <ul className="m-0 flex list-none flex-col p-0">
              {weights.map((item, index) => (
                <li
                  key={`${item.type}-${item.kg}`}
                  className="flex min-h-12 items-center justify-between gap-3 border-b-2 border-edge"
                >
                  <span className="text-base">{lineText(item)}</span>
                  <button
                    type="button"
                    className="min-h-12 shrink-0 px-1 text-base font-bold underline"
                    aria-label={`Ta bort ${names[item.type].one} ${kgText(item.kg)} kg${item.count === 2 ? ' (par)' : ''}`}
                    onClick={() => remove(index)}
                  >
                    Ta bort
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {adding ? (
            <fieldset className="m-0 flex flex-col gap-3 rounded-sm border-2 border-edge p-3">
              <legend className="px-1 text-base font-bold">
                Ny {names[adding].one}
              </legend>
              <label
                htmlFor={id('kg')}
                className="flex flex-col gap-1 text-base font-bold"
              >
                Vikt per {names[adding].one} (kg)
              </label>
              <input
                id={id('kg')}
                ref={kgField}
                className={fieldClass}
                type="text"
                inputMode="decimal"
                value={kgInput}
                aria-invalid={!!error}
                aria-describedby={error ? id('error') : undefined}
                onChange={(event) => {
                  setKgInput(event.target.value);
                  setError('');
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    submit(adding);
                  }
                }}
              />
              <div
                role="radiogroup"
                aria-label="Antal"
                className="flex flex-col gap-1"
              >
                {(
                  [
                    ['1', `1 ${names[adding].one}`],
                    ['2', 'Par'],
                  ] as const
                ).map(([count, label]) => (
                  <label
                    key={count}
                    className="flex min-h-12 items-center gap-3 text-base"
                  >
                    <input
                      className="size-6"
                      type="radio"
                      name={id('count')}
                      checked={pair === count}
                      onChange={() => setPair(count)}
                    />
                    {label}
                  </label>
                ))}
              </div>
              {error ? (
                <p
                  id={id('error')}
                  role="alert"
                  className="m-0 text-base font-bold"
                >
                  {error}
                </p>
              ) : null}
              <div className="flex flex-col gap-2">
                <Button variant="secondary" onClick={() => submit(adding)}>
                  Lägg till
                </Button>
                <button
                  type="button"
                  className="min-h-12 text-base font-bold underline"
                  onClick={() => close(adding)}
                >
                  Avbryt
                </button>
              </div>
            </fieldset>
          ) : (
            <div className="flex flex-col gap-2">
              {(['dumbbell', 'kettlebell'] as const).map((kind) => (
                <Button
                  key={kind}
                  variant="secondary"
                  onClick={() => open(kind)}
                  // Focus returns here after an add or a cancel.
                  ref={(el: HTMLButtonElement | null) => {
                    buttons.current[kind] = el;
                  }}
                >
                  {names[kind].add}
                </Button>
              ))}
            </div>
          )}
          <details>
            <summary className="min-h-12 cursor-pointer py-3 text-base font-bold">
              Justerbara vikter
            </summary>
            <AdjustableWeightFields
              value={value.adjustableWeights ?? []}
              onChange={(adjustableWeights) =>
                onChange({ ...value, adjustableWeights })
              }
              onValidityChange={onValidityChange}
            />
          </details>
        </section>
      ) : null}
      <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
        <legend className="mb-1 text-xl font-bold">
          {showWeights ? 'Annat jag har' : 'Det här har jag'}
        </legend>
        {supportItems.map((item) => (
          <div key={item}>
            <label className="flex min-h-12 items-center gap-3 text-base">
              <input
                className="size-6 shrink-0"
                type="checkbox"
                checked={value.equipment.includes(item)}
                onChange={(event) => toggle(item, event.target.checked)}
              />
              {equipmentChoices[item]}
            </label>
            {item === 'band' && !showWeights ? (
              <p className="m-0 pl-9 text-base text-ink-soft">
                Träningsband behövs för övning 5 och 7.
              </p>
            ) : null}
          </div>
        ))}
      </fieldset>
    </div>
  );
}
