import {
  type EquipmentType,
  equipmentLabels,
} from '../content/exerciseMetadata';
import type { TrainingPreferences, WeightInventoryItem } from '../domain/types';

/** What the user owns: support items plus the weights, the single record of dumbbells and kettlebells. */
export type Inventory = Pick<
  TrainingPreferences,
  'equipment' | 'weights' | 'adjustableWeights'
>;

type Count = 0 | 1 | 2;
type Requirement = { type: string; count: number };

/** Highest number of implements usable at one weight, per kind. */
export function capabilities(inventory: Inventory): {
  dumbbell: Count;
  kettlebell: Count;
} {
  const result = { dumbbell: 0 as Count, kettlebell: 0 as Count };
  for (const item of inventory.weights ?? [])
    if (item.kg > 0 && item.count > result[item.type])
      result[item.type] = item.count;
  for (const item of inventory.adjustableWeights ?? [])
    if (item.settingsKg.length >= 1 && item.count > result[item.type])
      result[item.type] = item.count;
  return result;
}

function isWeightType(type: string): type is 'dumbbell' | 'kettlebell' {
  return type === 'dumbbell' || type === 'kettlebell';
}

export function equipmentFits(
  requirements: readonly Requirement[],
  inventory: Inventory,
) {
  return missingRequirements(requirements, inventory).length === 0;
}

/** Swedish labels of the requirements the inventory does not meet. */
export function missingRequirements(
  requirements: readonly Requirement[],
  inventory: Inventory,
): string[] {
  const owned = capabilities(inventory);
  const missing: string[] = [];
  for (const requirement of requirements) {
    if (requirement.type === 'bodyweight') continue;
    if (isWeightType(requirement.type)) {
      if (owned[requirement.type] >= requirement.count) continue;
      const noun = requirement.type === 'dumbbell' ? 'hantel' : 'kettlebell';
      missing.push(
        requirement.count === 1
          ? `1 ${noun}`
          : `${requirement.count} ${noun === 'hantel' ? 'hantlar' : 'kettlebells'} i samma vikt`,
      );
      continue;
    }
    const has =
      (inventory.equipment as string[]).includes(requirement.type) ||
      (requirement.type === 'support' && inventory.equipment.includes('chair'));
    if (!has) missing.push(equipmentLabels[requirement.type as EquipmentType]);
  }
  return missing;
}

const supportLabels: Record<string, string> = {
  chair: 'stol',
  support: 'vägg',
  step: 'steg',
  band: 'band',
  'pull-up-bar': 'chinsstång',
  'dip-bars': 'dipsställning',
};

function kgText(kg: number): string {
  return String(kg).replace('.', ',');
}

function weightGroup(
  items: readonly WeightInventoryItem[],
  type: 'dumbbell' | 'kettlebell',
): string | undefined {
  const own = items.filter((item) => item.type === type && item.kg > 0);
  if (!own.length) return undefined;
  const sorted = [...own].sort((a, b) => a.kg - b.kg);
  const kgs = sorted.map((item) => kgText(item.kg));
  const list =
    kgs.length === 1
      ? kgs[0]
      : `${kgs.slice(0, -1).join(', ')} och ${kgs.at(-1)}`;
  const allPairs = sorted.every((item) => item.count === 2);
  const allSingles = sorted.every((item) => item.count === 1);
  const singular = type === 'dumbbell' ? 'hantel' : 'kettlebell';
  const plural = type === 'dumbbell' ? 'hantlar' : 'kettlebells';
  if (sorted.length === 1 && allSingles) return `${singular} ${list} kg`;
  const suffix = allPairs ? ' (par)' : allSingles ? '' : ' (en del par)';
  return `${plural} ${list} kg${suffix}`;
}

/** One line for lists and menus, e.g. "hantlar 5 och 10 kg (par), stol, vägg". */
export function inventorySummary(inventory: Inventory): string {
  const parts: string[] = [];
  for (const type of ['dumbbell', 'kettlebell'] as const) {
    const text = weightGroup(inventory.weights ?? [], type);
    if (text) parts.push(text);
    const adjustable = (inventory.adjustableWeights ?? []).filter(
      (item) => item.type === type && item.settingsKg.length >= 1,
    );
    if (adjustable.length)
      parts.push(`justerbar ${type === 'dumbbell' ? 'hantel' : 'kettlebell'}`);
  }
  for (const key of inventory.equipment)
    if (supportLabels[key]) parts.push(supportLabels[key]);
  return parts.length ? parts.join(', ') : 'Bara kroppsvikt';
}
