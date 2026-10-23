import { describe, expect, it } from 'vitest';
import { amountText } from '../features/history/labels';
import { AMOUNT_LABEL, UNIT_WORD } from './copy';

describe('laps unit copy', () => {
  it('has Swedish words for laps', () => {
    expect(UNIT_WORD.laps).toBe('varv');
    expect(AMOUNT_LABEL.laps).toBe('Varv');
    expect(amountText(5, 'laps')).toBe('5 varv');
  });
  it('keeps the existing unit words', () => {
    expect(UNIT_WORD).toMatchObject({
      reps: 'reps',
      seconds: 'sek',
      meters: 'm',
    });
    expect(amountText(10, 'reps')).toBe('10 rep.');
  });
});
