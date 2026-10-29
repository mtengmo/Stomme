// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import type { WorkoutEquipment } from '../../domain/types';
import { addWeight, EquipmentInventory, parseKg } from './EquipmentInventory';

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
  it('starts empty with a bodyweight message', () => {
    render(<Harness />);
    expect(screen.getByText(/Bara kroppsvikt – passet byggs/)).toBeTruthy();
  });

  it('adds a pair, lists it with a labelled remove button and returns focus', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Lägg till hantel' }));
    await user.type(screen.getByLabelText(/Vikt per hantel/), '7,5');
    await user.click(screen.getByRole('button', { name: 'Lägg till' }));
    expect(json().weights).toEqual([{ type: 'dumbbell', kg: 7.5, count: 2 }]);
    expect(screen.getByRole('list').textContent).toContain(
      'Hantel 7,5 kg · par',
    );
    await new Promise((r) => setTimeout(r, 5));
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Lägg till hantel' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Ta bort hantel 7,5 kg (par)' }),
    );
    expect(json().weights).toEqual([]);
  });

  it('shows an alert for a bad weight and keeps the form open', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(
      screen.getByRole('button', { name: 'Lägg till kettlebell' }),
    );
    await user.type(screen.getByLabelText(/Vikt per kettlebell/), 'tung');
    await user.click(screen.getByRole('button', { name: 'Lägg till' }));
    expect(screen.getByRole('alert').textContent).toMatch(/0,5 och 100/);
    expect(json().weights).toBeUndefined();
    await user.click(screen.getByRole('button', { name: 'Avbryt' }));
    expect(screen.queryByRole('group', { name: 'Ny kettlebell' })).toBeNull();
  });

  it('merges one plus one of the same weight into a pair', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    for (let n = 0; n < 2; n++) {
      await user.click(
        screen.getByRole('button', { name: 'Lägg till hantel' }),
      );
      await user.type(screen.getByLabelText(/Vikt per hantel/), '5');
      await user.click(screen.getByRole('radio', { name: '1 hantel' }));
      await user.click(screen.getByRole('button', { name: 'Lägg till' }));
    }
    expect(json().weights).toEqual([{ type: 'dumbbell', kg: 5, count: 2 }]);
  });

  it('toggles support items and hides weights when asked', async () => {
    const user = userEvent.setup();
    render(<Harness showWeights={false} />);
    expect(
      screen.queryByRole('button', { name: 'Lägg till hantel' }),
    ).toBeNull();
    await user.click(screen.getByRole('checkbox', { name: 'Träningsband' }));
    expect(json().equipment).toContain('band');
    await user.click(screen.getByRole('checkbox', { name: 'Stabil stol' }));
    expect(json().equipment).not.toContain('chair');
  });
});
