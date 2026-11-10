// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { readyWorkouts } from '../../content/readyWorkouts';
import { FixedReadyWorkout } from './FixedReadyWorkout';

afterEach(cleanup);

const workout = readyWorkouts.find((w) => w.id === 'runner-home');

it('lists the exercises and adds the whole fixed list under its name', async () => {
  if (!workout) throw new Error('missing workout');
  const onAdd = vi.fn();
  render(<FixedReadyWorkout workout={workout} busy={false} onAdd={onAdd} />);
  expect(screen.getByText('4 övningar')).toBeTruthy();
  expect(screen.getAllByRole('listitem')).toHaveLength(4);
  await userEvent.click(
    screen.getByRole('button', {
      name: 'Lägg till färdigt pass: Hemmapass för löpare',
    }),
  );
  expect(onAdd).toHaveBeenCalledWith('Hemmapass för löpare', [
    ...workout.exerciseIds,
  ]);
});

it('disables the button while busy', () => {
  if (!workout) throw new Error('missing workout');
  render(<FixedReadyWorkout workout={workout} busy onAdd={vi.fn()} />);
  expect(
    (
      screen.getByRole('button', {
        name: /Lägg till färdigt pass/,
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
});
