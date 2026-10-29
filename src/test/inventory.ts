import type {
  EquipmentChoice,
  TrainingPreferences,
  WeightInventoryItem,
} from '../domain/types';

type Pairs = [kg: number, count: 1 | 2][];

/**
 * Test fixture for an owned inventory. `dumbbells: [[5, 2]]` means a pair of 5 kg
 * dumbbells; `support` lists the support items next to bodyweight.
 */
export function inventory(
  options: {
    dumbbells?: Pairs;
    kettlebells?: Pairs;
    support?: Exclude<EquipmentChoice, 'bodyweight'>[];
  } = {},
): Pick<TrainingPreferences, 'equipment' | 'weights'> {
  const weights: WeightInventoryItem[] = [
    ...(options.dumbbells ?? []).map(([kg, count]) => ({
      type: 'dumbbell' as const,
      kg,
      count,
    })),
    ...(options.kettlebells ?? []).map(([kg, count]) => ({
      type: 'kettlebell' as const,
      kg,
      count,
    })),
  ];
  return {
    equipment: ['bodyweight', ...(options.support ?? [])],
    ...(weights.length ? { weights } : {}),
  };
}
