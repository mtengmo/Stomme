// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import type { SymptomReport } from '../../domain/types';
import { ExerciseSymptoms, SymptomFields } from './Checkin';

afterEach(cleanup);
it('changes zero directly to 2 or 10 without a number field or leading zero', async () => {
  function Fields() {
    const [value, setValue] = useState<SymptomReport>({
      area: 'Knä',
      side: 'left',
      score: 0,
    });
    return (
      <>
        <SymptomFields value={value} onChange={setValue} />
        <output aria-label="Sparat värde">{value.score}</output>
      </>
    );
  }
  const user = userEvent.setup();
  render(<Fields />);
  const picker = screen.getByRole('group', {
    name: 'Besvärens intensitet (0–10)',
  });
  expect(within(picker).getAllByRole('radio')).toHaveLength(11);
  expect(screen.queryByRole('spinbutton')).toBeNull();
  for (const value of [2, 10, 0]) {
    await user.click(
      within(picker).getByRole('radio', { name: new RegExp(`^${value}(,|$)`) }),
    );
    expect(screen.getByLabelText('Sparat värde').textContent).toBe(
      String(value),
    );
    expect(
      (within(picker).getByRole('radio', { checked: true }) as HTMLInputElement)
        .value,
    ).toBe(String(value));
  }
});
it('saves the tapped intensity separately from body area and side during exercise', async () => {
  const save = vi.fn().mockResolvedValue(undefined);
  const user = userEvent.setup();
  render(<ExerciseSymptoms onSave={save} onCancel={() => {}} />);
  await user.selectOptions(screen.getByLabelText('Var känns besvären?'), 'Knä');
  await user.selectOptions(screen.getByLabelText('Sida'), 'left');
  await user.click(screen.getByRole('radio', { name: '2' }));
  await user.click(screen.getByRole('button', { name: 'Spara besvär' }));
  expect(save).toHaveBeenCalledWith({ area: 'Knä', side: 'left', score: 2 });
});
