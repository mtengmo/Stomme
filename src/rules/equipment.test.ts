import { describe, expect, it } from 'vitest';
import { inventory } from '../test/inventory';
import {
  capabilities,
  equipmentFits,
  inventorySummary,
  missingRequirements,
} from './equipment';

describe('capabilities', () => {
  it('uses the highest count among fixed weights with a weight', () => {
    expect(capabilities(inventory())).toEqual({ dumbbell: 0, kettlebell: 0 });
    expect(
      capabilities(
        inventory({
          dumbbells: [[5, 1]],
          kettlebells: [
            [8, 2],
            [12, 1],
          ],
        }),
      ),
    ).toEqual({ dumbbell: 1, kettlebell: 2 });
  });
  it('counts an adjustable item only with at least one setting', () => {
    const base = inventory();
    expect(
      capabilities({
        ...base,
        adjustableWeights: [{ type: 'dumbbell', count: 2, settingsKg: [] }],
      }).dumbbell,
    ).toBe(0);
    expect(
      capabilities({
        ...base,
        adjustableWeights: [{ type: 'dumbbell', count: 2, settingsKg: [4] }],
      }).dumbbell,
    ).toBe(2);
  });
  it('never treats two different weights as a pair', () => {
    expect(
      capabilities(
        inventory({
          dumbbells: [
            [5, 1],
            [10, 1],
          ],
        }),
      ).dumbbell,
    ).toBe(1);
  });
});

describe('equipmentFits and missingRequirements', () => {
  const pair = [{ type: 'dumbbell', count: 2 }];
  it('needs a pair at one weight for two dumbbells', () => {
    expect(equipmentFits(pair, inventory({ dumbbells: [[5, 1]] }))).toBe(false);
    expect(equipmentFits(pair, inventory({ dumbbells: [[5, 2]] }))).toBe(true);
    expect(
      missingRequirements(pair, inventory({ dumbbells: [[5, 1]] })),
    ).toEqual(['2 hantlar i samma vikt']);
  });
  it('lets a chair stand in for a support and always allows bodyweight', () => {
    const support = [{ type: 'support', count: 1 }];
    expect(equipmentFits(support, inventory({ support: ['chair'] }))).toBe(
      true,
    );
    expect(equipmentFits(support, inventory())).toBe(false);
    expect(equipmentFits([{ type: 'bodyweight', count: 1 }], inventory())).toBe(
      true,
    );
  });
  it('names a missing band and a missing kettlebell', () => {
    expect(
      missingRequirements(
        [
          { type: 'band', count: 1 },
          { type: 'kettlebell', count: 1 },
        ],
        inventory({ dumbbells: [[5, 2]] }),
      ),
    ).toEqual(['Gummiband', '1 kettlebell']);
  });
});

describe('inventorySummary', () => {
  it('says bodyweight when nothing is owned', () => {
    expect(inventorySummary(inventory())).toBe('Bara kroppsvikt');
  });
  it('lists weights and support items', () => {
    expect(
      inventorySummary(
        inventory({
          dumbbells: [
            [10, 2],
            [5, 2],
          ],
          support: ['chair', 'support'],
        }),
      ),
    ).toBe('hantlar 5 och 10 kg (par), stol, vägg');
    expect(inventorySummary(inventory({ kettlebells: [[12.5, 1]] }))).toBe(
      'kettlebell 12,5 kg',
    );
  });
});

describe('inventorySummary branches', () => {
  it('words single, paired, mixed and adjustable weights and support items', () => {
    expect(inventorySummary(inventory({ dumbbells: [[10, 1]] }))).toBe(
      'hantel 10 kg',
    );
    expect(
      inventorySummary(
        inventory({
          dumbbells: [
            [5, 1],
            [10, 1],
          ],
        }),
      ),
    ).toBe('hantlar 5 och 10 kg');
    expect(
      inventorySummary(
        inventory({
          kettlebells: [
            [8, 2],
            [12, 1],
          ],
        }),
      ),
    ).toBe('kettlebells 8 och 12 kg (en del par)');
    expect(inventorySummary(inventory({ kettlebells: [[8, 2]] }))).toBe(
      'kettlebells 8 kg (par)',
    );
    const base = inventory({ support: ['chair'] });
    expect(
      inventorySummary({
        ...base,
        adjustableWeights: [
          { type: 'dumbbell', count: 2, settingsKg: [5, 10] },
          { type: 'kettlebell', count: 1, settingsKg: [] },
        ],
      }),
    ).toContain('justerbar hantel');
    expect(
      inventorySummary({
        equipment: ['bodyweight'],
        adjustableWeights: [{ type: 'kettlebell', count: 1, settingsKg: [8] }],
      }),
    ).toBe('justerbar kettlebell');
    expect(inventorySummary({ equipment: ['bodyweight'] })).toBe(
      'Bara kroppsvikt',
    );
  });
});
