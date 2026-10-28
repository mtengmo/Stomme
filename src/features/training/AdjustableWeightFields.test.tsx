// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AdjustableWeightFields,
  parseAdjustableSettings,
} from './AdjustableWeightFields';

afterEach(cleanup);

describe('adjustable weight fields', () => {
  it('parses explicit semicolon-separated settings with Swedish decimals', () => {
    expect(parseAdjustableSettings('2,5; 5; 7.5')).toEqual([2.5, 5, 7.5]);
    expect(parseAdjustableSettings('')).toBeNull();
    expect(parseAdjustableSettings('5; 5')).toBeNull();
    expect(parseAdjustableSettings('0; 101')).toBeNull();
    expect(parseAdjustableSettings('5,')).toBeNull();
  });

  it('adds a family without inventing settings and reports validation', () => {
    const onChange = vi.fn();
    const onValidityChange = vi.fn();
    const { rerender } = render(
      <AdjustableWeightFields
        value={[]}
        onChange={onChange}
        onValidityChange={onValidityChange}
      />,
    );
    fireEvent.click(screen.getByLabelText('Justerbara hantlar'));
    expect(onChange).toHaveBeenLastCalledWith([
      { type: 'dumbbell', count: 1, settingsKg: [] },
    ]);
    rerender(
      <AdjustableWeightFields
        value={[{ type: 'dumbbell', count: 1, settingsKg: [] }]}
        onChange={onChange}
        onValidityChange={onValidityChange}
      />,
    );
    fireEvent.change(screen.getByLabelText('Hantelvikter (kg)'), {
      target: { value: '2,5; 5; 7,5' },
    });
    expect(onChange).toHaveBeenLastCalledWith([
      { type: 'dumbbell', count: 1, settingsKg: [2.5, 5, 7.5] },
    ]);
  });
});
