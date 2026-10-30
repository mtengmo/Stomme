import { useEffect, useRef, useState } from 'react';
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
/** Quick picks; a dumbbell chip adds a pair, a kettlebell chip adds one. */
const CHIPS = {
  dumbbell: [2, 3, 4, 5, 6, 8, 10, 12, 15, 20],
  kettlebell: [8, 12, 16, 20, 24],
} as const;

type Kind = WeightInventoryItem['type'];
const names: Record<Kind, { one: string; many: string }> = {
  dumbbell: { one: 'hantel', many: 'hantlar' },
  kettlebell: { one: 'kettlebell', many: 'kettlebells' },
};

/** What the host's fixed primary button does while the "Annan vikt" form is open. */
export interface PendingWeight {
  label: string;
  canSubmit: boolean;
  submit(): void;
  /** The inventory including the typed weight, or null when it is empty or refused. */
  withWeight(): WorkoutEquipment | null;
}

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

function capital(kind: Kind): string {
  const name = names[kind].one;
  return `${name[0]?.toUpperCase()}${name.slice(1)}`;
}

function lineText(item: WeightInventoryItem): string {
  return `${capital(item.type)} ${kgText(item.kg)} kg · ${item.count === 2 ? 'par' : '1 st'}`;
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
 * With `onPendingChange` the host owns the add button (see PendingWeight); without it
 * the open "Annan vikt" form shows its own button.
 */
export function EquipmentInventory({
  value,
  onChange,
  onValidityChange,
  onPendingChange,
  inlineAdd = true,
  supportItems,
  showWeights = true,
  idPrefix,
}: {
  value: WorkoutEquipment;
  onChange(value: WorkoutEquipment): void;
  onValidityChange?(valid: boolean): void;
  onPendingChange?(pending: PendingWeight | null): void;
  /** False when the host renders the add button itself from onPendingChange. */
  inlineAdd?: boolean;
  supportItems: readonly EquipmentChoice[];
  showWeights?: boolean;
  idPrefix: string;
}) {
  const weights = value.weights ?? [];
  const [adding, setAdding] = useState<Kind | null>(null);
  const [kgInput, setKgInput] = useState('');
  const [pair, setPair] = useState<'1' | '2'>('2');
  const [error, setError] = useState('');
  const [ticked, setTicked] = useState<Record<Kind, boolean>>(() => ({
    dumbbell: weights.some((item) => item.type === 'dumbbell'),
    kettlebell: weights.some((item) => item.type === 'kettlebell'),
  }));
  const buttons = useRef<Partial<Record<Kind, HTMLButtonElement | null>>>({});
  const kgField = useRef<HTMLInputElement>(null);
  const parsed = parseKg(kgInput);
  const count: 1 | 2 = pair === '2' ? 2 : 1;
  const pendingLabel =
    parsed === null
      ? 'Lägg till vikt'
      : `Lägg till ${kgText(parsed)} kg (${count === 2 ? 'par' : '1 st'})`;

  function open(kind: Kind) {
    setAdding(kind);
    setKgInput('');
    setPair(kind === 'dumbbell' ? '2' : '1');
    setError('');
    setTimeout(() => {
      kgField.current?.focus();
      kgField.current?.scrollIntoView?.({ block: 'center' });
    }, 0);
  }
  function close(kind: Kind) {
    setAdding(null);
    setError('');
    setTimeout(() => buttons.current[kind]?.focus(), 0);
  }
  function submit(kind: Kind) {
    if (parsed === null) {
      setError('Ange en vikt mellan 0,5 och 100 kg, till exempel 7,5.');
      kgField.current?.focus();
      return;
    }
    const result = addWeight(weights, { type: kind, kg: parsed, count });
    if (result.error) {
      setError(result.error);
      return;
    }
    onChange({ ...value, weights: result.weights });
    close(kind);
  }
  // The host's fixed button follows the open form; closing the form hands it back.
  // biome-ignore lint/correctness/useExhaustiveDependencies: submit is rebuilt each render from these inputs.
  useEffect(() => {
    if (!onPendingChange) return;
    onPendingChange(
      adding
        ? {
            label: pendingLabel,
            canSubmit: parsed !== null,
            submit: () => submit(adding),
            withWeight: () => {
              if (parsed === null) return null;
              const result = addWeight(weights, {
                type: adding,
                kg: parsed,
                count,
              });
              return result.error
                ? null
                : { ...value, weights: result.weights };
            },
          }
        : null,
    );
  }, [adding, pendingLabel, parsed, weights, pair]);
  useEffect(() => () => onPendingChange?.(null), [onPendingChange]);

  const setWeights = (next: WeightInventoryItem[]) =>
    onChange({ ...value, weights: next });
  function chip(kind: Kind, kg: number) {
    const index = weights.findIndex(
      (item) => item.type === kind && item.kg === kg,
    );
    if (index >= 0) return setWeights(weights.filter((_, n) => n !== index));
    const result = addWeight(weights, {
      type: kind,
      kg,
      count: kind === 'dumbbell' ? 2 : 1,
    });
    if (result.error) return setError(result.error);
    setError('');
    setWeights(result.weights);
  }
  const remove = (index: number) =>
    setWeights(weights.filter((_, n) => n !== index));
  const setCount = (index: number, next: 1 | 2) =>
    setWeights(
      weights.map((item, n) => (n === index ? { ...item, count: next } : item)),
    );
  function tickKind(kind: Kind, checked: boolean) {
    setTicked({ ...ticked, [kind]: checked });
    if (checked) return;
    if (adding === kind) close(kind);
    setWeights(weights.filter((item) => item.type !== kind));
  }
  const toggle = (item: EquipmentChoice, checked: boolean) =>
    onChange({
      ...value,
      equipment: checked
        ? [...new Set([...value.equipment, item])]
        : value.equipment.filter((entry) => entry !== item),
    });
  const id = (name: string) => `${idPrefix}-${name}`;
  const rowClass = 'flex min-h-12 items-center gap-3 text-base';

  function weightBlock(kind: Kind) {
    const mine = weights
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.type === kind);
    return (
      <div className="flex flex-col gap-2 pb-2 pl-9">
        <fieldset className="m-0 flex flex-wrap gap-2 border-0 p-0">
          <legend className="sr-only">Snabbval {names[kind].many}</legend>
          {CHIPS[kind].map((kg) => {
            const on = mine.some(({ item }) => item.kg === kg);
            return (
              <button
                key={kg}
                type="button"
                aria-pressed={on}
                aria-label={`${capital(kind)} ${kgText(kg)} kg`}
                onClick={() => chip(kind, kg)}
                className={`min-h-12 min-w-14 rounded-sm border-2 px-3 text-base font-bold ${on ? 'border-ink bg-ink text-surface' : 'border-edge bg-surface text-ink'}`}
              >
                {kgText(kg)} kg
              </button>
            );
          })}
        </fieldset>
        {mine.length ? (
          <ul className="m-0 flex list-none flex-col p-0">
            {mine.map(({ item, index }) => (
              <li
                key={`${item.type}-${item.kg}`}
                className="flex flex-wrap items-center gap-x-4 border-b-2 border-edge"
              >
                <span className="grow pt-2 text-base">{lineText(item)}</span>
                <span className="flex items-center gap-4">
                  <button
                    type="button"
                    className="min-h-12 text-base underline"
                    aria-label={`Ändra ${names[kind].one} ${kgText(item.kg)} kg till ${item.count === 2 ? '1 st' : 'par'}`}
                    onClick={() => setCount(index, item.count === 2 ? 1 : 2)}
                  >
                    Ändra till {item.count === 2 ? '1 st' : 'par'}
                  </button>
                  <button
                    type="button"
                    className="min-h-12 shrink-0 text-base font-bold underline"
                    aria-label={`Ta bort ${names[kind].one} ${kgText(item.kg)} kg${item.count === 2 ? ' (par)' : ''}`}
                    onClick={() => remove(index)}
                  >
                    Ta bort
                  </button>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {adding === kind ? (
          <fieldset className="m-0 flex flex-col gap-2 rounded-sm border-2 border-edge p-3">
            <legend className="px-1 text-base font-bold">
              Annan {names[kind].one}
            </legend>
            <label htmlFor={id('kg')} className="text-base font-bold">
              Vikt (kg)
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
                  submit(kind);
                }
              }}
            />
            <div
              role="radiogroup"
              aria-label="Antal"
              className="flex flex-wrap gap-x-6"
            >
              {(
                [
                  ['1', '1 st'],
                  ['2', 'Par'],
                ] as const
              ).map(([choice, label]) => (
                <label key={choice} className={rowClass}>
                  <input
                    className="size-6"
                    type="radio"
                    name={id('count')}
                    checked={pair === choice}
                    onChange={() => setPair(choice)}
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
            {inlineAdd ? (
              <Button
                variant="secondary"
                disabled={parsed === null}
                onClick={() => submit(kind)}
              >
                {pendingLabel}
              </Button>
            ) : null}
            <button
              type="button"
              className="min-h-12 self-start text-base underline"
              onClick={() => close(kind)}
            >
              Avbryt
            </button>
          </fieldset>
        ) : (
          <button
            type="button"
            className="min-h-12 self-start text-base font-bold underline"
            aria-label={`Annan vikt, ${names[kind].one}`}
            onClick={() => open(kind)}
            ref={(el: HTMLButtonElement | null) => {
              buttons.current[kind] = el;
            }}
          >
            Annan vikt
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
        <legend className="mb-1 text-xl font-bold">
          {showWeights ? 'Jag har' : 'Det här har jag'}
        </legend>
        {showWeights ? (
          <label className={rowClass}>
            <input
              className="size-6 shrink-0"
              type="checkbox"
              checked
              disabled
              readOnly
            />
            Bara kroppsvikt
          </label>
        ) : null}
        {showWeights
          ? (['dumbbell', 'kettlebell'] as const).map((kind) => {
              const on =
                ticked[kind] || weights.some((item) => item.type === kind);
              return (
                <div key={kind}>
                  <label className={rowClass}>
                    <input
                      className="size-6 shrink-0"
                      type="checkbox"
                      checked={on}
                      onChange={(event) => tickKind(kind, event.target.checked)}
                    />
                    {kind === 'dumbbell' ? 'Hantlar' : 'Kettlebell'}
                  </label>
                  {on ? weightBlock(kind) : null}
                </div>
              );
            })
          : null}
        {supportItems.map((item) => (
          <div key={item}>
            <label className={rowClass}>
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
      {error && !adding ? (
        <p role="alert" className="m-0 text-base font-bold">
          {error}
        </p>
      ) : null}
      {showWeights ? (
        <>
          {weights.length || (value.adjustableWeights ?? []).length ? null : (
            <p className="m-0 text-base text-ink-soft">
              Inga vikter? Gå vidare, passet byggs med kroppsvikt.
            </p>
          )}
          <details>
            <summary className="min-h-12 cursor-pointer py-3 text-base font-bold">
              Fler alternativ (justerbara vikter)
            </summary>
            <AdjustableWeightFields
              value={value.adjustableWeights ?? []}
              onChange={(adjustableWeights) =>
                onChange({ ...value, adjustableWeights })
              }
              onValidityChange={onValidityChange}
            />
          </details>
        </>
      ) : null}
    </div>
  );
}
