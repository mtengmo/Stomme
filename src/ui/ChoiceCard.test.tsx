// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, expect, it } from 'vitest';
import { ChoiceCard } from './ChoiceCard';

afterEach(cleanup);

function Harness({ type }: { type: 'checkbox' | 'radio' }) {
  const [on, setOn] = useState(false);
  return (
    <ChoiceCard
      type={type}
      name="g"
      checked={on}
      onChange={setOn}
      label="Hantlar"
      hint="Två stycken"
    />
  );
}

it('keeps the checkbox role and name, and toggles', async () => {
  render(<Harness type="checkbox" />);
  const box = screen.getByRole('checkbox', { name: 'Hantlar' });
  expect((box as HTMLInputElement).checked).toBe(false);
  await userEvent.click(box);
  expect(
    (screen.getByRole('checkbox', { name: 'Hantlar' }) as HTMLInputElement)
      .checked,
  ).toBe(true);
  const id = box.getAttribute('aria-describedby') ?? '';
  expect(document.getElementById(id)?.textContent).toBe('Två stycken');
});

it('keeps the radio role and name', () => {
  render(<Harness type="radio" />);
  expect(screen.getByRole('radio', { name: 'Hantlar' })).toBeTruthy();
});

it('shows a check icon only when selected', async () => {
  const { container } = render(<Harness type="checkbox" />);
  expect(container.querySelector('svg')).toBeNull();
  await userEvent.click(screen.getByRole('checkbox', { name: 'Hantlar' }));
  expect(container.querySelector('svg')).not.toBeNull();
});
