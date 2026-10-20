import type { EquipmentChoice } from '../domain/types';

export function equipmentFits(
  requirements: readonly { type: string; count: number }[],
  inventory: readonly EquipmentChoice[],
) {
  return requirements.every((requirement) => {
    if (requirement.type === 'bodyweight') return true;
    if (requirement.type === 'dumbbell' || requirement.type === 'kettlebell') {
      const count = inventory.includes(`${requirement.type}-2`)
        ? 2
        : inventory.includes(`${requirement.type}-1`)
          ? 1
          : 0;
      return count >= requirement.count;
    }
    return (
      inventory.includes(requirement.type as EquipmentChoice) ||
      (requirement.type === 'support' && inventory.includes('chair'))
    );
  });
}
