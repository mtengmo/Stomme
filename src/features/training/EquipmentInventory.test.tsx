// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import type { WorkoutEquipment } from '../../domain/types';
import {
  addWeight,
  EquipmentInventory,
  type PendingWeight,
  parseKg,
} from './EquipmentInventory';

afterEach(cleanup);

function Harness({
  showWeights = true,
  start = { equipment: ['bodyweight', 'chair'] },
}: {
  showWeights?: boolean;
  start?: WorkoutEquipment;
}) {
  const [value, setValue] = useState<WorkoutEquipment>(start);
  return (
    <>
      <EquipmentInventory
        idPrefix="t"
        value={value}
        onChange={setValue}
        supportItems={['chair', 'support', 'band']}
        showWeights={showWeights}
      />
      <output data-testid="json">{JSON.stringify(value)}</output>
    </>
  );
}
const json = () => JSON.parse(screen.getByTestId('json').textContent ?? '{}');

describe('parseKg', () => {
  it('accepts comma and dot within 0,5 to 100', () => {
    expect(parseKg('7,5')).toBe(7.5);
    expect(parseKg(' 10.5 ')).toBe(10.5);
    for (const bad of ['', 'abc', '0', '0,4', '101', '5 kg', '-3'])
      expect(parseKg(bad)).toBeNull();
  });
});

describe('addWeight', () => {
  const one = { type: 'dumbbell' as const, kg: 5, count: 1 as const };
  it('merges the same kg into a pair and refuses a third', () => {
    const merged = addWeight([one], one);
    expect(merged.weights).toEqual([{ ...one, count: 2 }]);
    expect(addWeight(merged.weights, one).error).toMatch(/redan ett par/);
  });
  it('keeps dumbbells and kettlebells apart', () => {
    expect(
      addWeight([one], { ...one, type: 'kettlebell' }).weights,
    ).toHaveLength(2);
  });
  it('stops at 20 weights', () => {
    const many = Array.from({ length: 20 }, (_, n) => ({
      ...one,
      kg: n + 1,
    }));
    expect(addWeight(many, { ...one, kg: 50 }).error).toMatch(/högst 20/);
  });
});

describe('EquipmentInventory', () => {
  it('starts with bodyweight only and a help line', () => {
    render(<Harness />);
    expect(screen.getByText(/Inga vikter\? Gå vidare/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Hantel / })).toBeNull();
  });

  it('a dumbbell chip adds a pair, a kettlebell chip adds one, tapping again removes', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('checkbox', { name: 'Hantlar' }));
    await user.click(screen.getByRole('checkbox', { name: 'Kettlebell' }));
    const five = screen.getByRole('button', { name: 'Hantel 5 kg' });
    expect(five.getAttribute('aria-pressed')).toBe('false');
    await user.click(five);
    await user.click(screen.getByRole('button', { name: 'Kettlebell 16 kg' }));
    expect(json().weights).toEqual([
      { type: 'dumbbell', kg: 5, count: 2 },
      { type: 'kettlebell', kg: 16, count: 1 },
    ]);
    expect(five.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('Hantel 5 kg · par')).toBeTruthy();
    await user.click(five);
    expect(json().weights).toEqual([{ type: 'kettlebell', kg: 16, count: 1 }]);
  });

  it('switches a selected weight between par and 1 st', async () => {
    const user = userEvent.setup();
    render(
      <Harness
        start={{
          equipment: [],
          weights: [{ type: 'dumbbell', kg: 5, count: 2 }],
        }}
      />,
    );
    await user.click(
      screen.getByRole('button', { name: 'Ändra hantel 5 kg till 1 st' }),
    );
    expect(json().weights[0].count).toBe(1);
    await user.click(
      screen.getByRole('button', { name: 'Ändra hantel 5 kg till par' }),
    );
    expect(json().weights[0].count).toBe(2);
  });

  it('unticking a kind clears its weights', async () => {
    const user = userEvent.setup();
    render(
      <Harness
        start={{
          equipment: [],
          weights: [{ type: 'dumbbell', kg: 5, count: 2 }],
        }}
      />,
    );
    await user.click(screen.getByRole('checkbox', { name: 'Hantlar' }));
    expect(json().weights).toEqual([]);
    expect(screen.queryByRole('button', { name: 'Hantel 5 kg' })).toBeNull();
  });

  it('Annan vikt adds a pair via its own button, lists it and returns focus', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('checkbox', { name: 'Hantlar' }));
    await user.click(
      screen.getByRole('button', { name: 'Annan vikt, hantel' }),
    );
    const add = screen.getByRole('button', { name: 'Lägg till vikt' });
    expect((add as HTMLButtonElement).disabled).toBe(true);
    await user.type(screen.getByLabelText('Vikt (kg)'), '7,5');
    await user.click(
      screen.getByRole('button', { name: 'Lägg till 7,5 kg (par)' }),
    );
    expect(json().weights).toEqual([{ type: 'dumbbell', kg: 7.5, count: 2 }]);
    expect(screen.getByRole('list').textContent).toContain(
      'Hantel 7,5 kg · par',
    );
    await new Promise((r) => setTimeout(r, 5));
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Annan vikt, hantel' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Ta bort hantel 7,5 kg (par)' }),
    );
    expect(json().weights).toEqual([]);
  });

  it('Enter adds, 1 st is the kettlebell default and Avbryt closes without adding', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('checkbox', { name: 'Kettlebell' }));
    await user.click(
      screen.getByRole('button', { name: 'Annan vikt, kettlebell' }),
    );
    await user.type(screen.getByLabelText('Vikt (kg)'), '14{Enter}');
    expect(json().weights).toEqual([{ type: 'kettlebell', kg: 14, count: 1 }]);
    await user.click(
      screen.getByRole('button', { name: 'Annan vikt, kettlebell' }),
    );
    await user.click(screen.getByRole('button', { name: 'Avbryt' }));
    expect(screen.queryByLabelText('Vikt (kg)')).toBeNull();
  });

  it('shows an alert for a bad weight on Enter and for a third of a pair', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('checkbox', { name: 'Hantlar' }));
    await user.click(
      screen.getByRole('button', { name: 'Annan vikt, hantel' }),
    );
    await user.type(screen.getByLabelText('Vikt (kg)'), 'tung{Enter}');
    expect(screen.getByRole('alert').textContent).toMatch(/0,5 och 100/);
    expect(json().weights).toBeUndefined();
    await user.clear(screen.getByLabelText('Vikt (kg)'));
    await user.type(screen.getByLabelText('Vikt (kg)'), '5{Enter}');
    await user.click(
      screen.getByRole('button', { name: 'Annan vikt, hantel' }),
    );
    await user.type(screen.getByLabelText('Vikt (kg)'), '5{Enter}');
    expect(screen.getByRole('alert').textContent).toMatch(/redan ett par/);
  });

  it('hands the add button to the host while the form is open', async () => {
    const user = userEvent.setup();
    const seen: (PendingWeight | null)[] = [];
    function Host() {
      const [value, setValue] = useState<WorkoutEquipment>({ equipment: [] });
      return (
        <EquipmentInventory
          idPrefix="h"
          value={value}
          onChange={setValue}
          onPendingChange={(p) => seen.push(p)}
          inlineAdd={false}
          supportItems={[]}
        />
      );
    }
    render(<Host />);
    await user.click(screen.getByRole('checkbox', { name: 'Hantlar' }));
    await user.click(
      screen.getByRole('button', { name: 'Annan vikt, hantel' }),
    );
    expect(screen.queryByRole('button', { name: /^Lägg till/ })).toBeNull();
    expect(seen.at(-1)).toMatchObject({
      label: 'Lägg till vikt',
      canSubmit: false,
    });
    await user.type(screen.getByLabelText('Vikt (kg)'), '7,5');
    expect(seen.at(-1)).toMatchObject({
      label: 'Lägg till 7,5 kg (par)',
      canSubmit: true,
    });
    await user.click(screen.getByRole('radio', { name: '1 st' }));
    expect(seen.at(-1)?.label).toBe('Lägg till 7,5 kg (1 st)');
    act(() => seen.at(-1)?.submit());
    expect(seen.at(-1)).toBeNull();
    expect(screen.getByText('Hantel 7,5 kg · 1 st')).toBeTruthy();
  });

  it('toggles support items and hides weights when asked', async () => {
    const user = userEvent.setup();
    render(<Harness showWeights={false} />);
    expect(screen.queryByRole('checkbox', { name: 'Hantlar' })).toBeNull();
    await user.click(screen.getByRole('checkbox', { name: 'Träningsband' }));
    expect(json().equipment).toContain('band');
    await user.click(screen.getByRole('checkbox', { name: 'Stabil stol' }));
    expect(json().equipment).not.toContain('chair');
  });
});
