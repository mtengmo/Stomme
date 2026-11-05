import type { EquipmentChoice, WeightInventoryItem } from '../../domain/types';
import { ChoiceCard } from '../../ui/ChoiceCard';
import { SupportToggles } from './EquipmentInventory';
import {
  allowedEquipment,
  DEFAULT_SUPPORT,
  type WeightKind,
} from './quickStartModel';

export interface StartEquipmentValue {
  equipment: EquipmentChoice[];
  weightKinds: WeightKind[];
  weights: WeightInventoryItem[];
}

const kindLabels: Record<WeightKind, string> = {
  dumbbell: 'Hantlar',
  kettlebell: 'Kettlebell',
};

/**
 * Equipment of the strength start flow: chair and wall are always on, the rest
 * are tick cards in three groups. Weights themselves are entered on the next step.
 */
export function StartEquipment({
  value,
  onChange,
}: {
  value: StartEquipmentValue;
  onChange(next: StartEquipmentValue): void;
}) {
  const allowed = allowedEquipment('general');
  const only = (items: EquipmentChoice[]) =>
    items.filter((item) => allowed.includes(item));
  const setEquipment = (equipment: EquipmentChoice[]) =>
    onChange({
      ...value,
      equipment: [...new Set([...DEFAULT_SUPPORT, ...equipment])],
    });
  const tickKind = (kind: WeightKind, checked: boolean) =>
    onChange({
      ...value,
      weightKinds: checked
        ? [...new Set([...value.weightKinds, kind])]
        : value.weightKinds.filter((item) => item !== kind),
      weights: checked
        ? value.weights
        : value.weights.filter((item) => item.type !== kind),
    });
  const furniture = only(['step']);
  const fixed = only(['pull-up-bar', 'dip-bars']);
  return (
    <div className="flex flex-col gap-5">
      <p className="m-0 border-l-[3px] border-ink pl-3 text-base">
        <strong>Alltid med:</strong> stol och vägg
      </p>
      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
        <legend className="mb-2 text-xl font-bold">Vikter</legend>
        {(['dumbbell', 'kettlebell'] as const).map((kind) => (
          <ChoiceCard
            key={kind}
            type="checkbox"
            label={kindLabels[kind]}
            checked={value.weightKinds.includes(kind)}
            onChange={(checked) => tickKind(kind, checked)}
          />
        ))}
        <SupportToggles
          equipment={value.equipment}
          onChange={setEquipment}
          items={only(['band'])}
        />
      </fieldset>
      {furniture.length ? (
        <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
          <legend className="mb-2 text-xl font-bold">Möbler</legend>
          <SupportToggles
            equipment={value.equipment}
            onChange={setEquipment}
            items={furniture}
          />
        </fieldset>
      ) : null}
      {fixed.length ? (
        <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
          <legend className="mb-2 text-xl font-bold">Fast monterat</legend>
          <SupportToggles
            equipment={value.equipment}
            onChange={setEquipment}
            items={fixed}
          />
        </fieldset>
      ) : null}
    </div>
  );
}
