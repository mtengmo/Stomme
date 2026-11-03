// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ExerciseThumb, PauseFiguresButton } from './ExerciseThumb';
import { PassCard, type PassCardExercise } from './PassCard';

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('pause button toggles and persists the choice', async () => {
  render(<PauseFiguresButton />);
  await userEvent.click(
    screen.getByRole('button', { name: 'Pausa figurerna' }),
  );
  expect(localStorage.getItem('stomme.program.pauseFigures')).toBe('1');
  await userEvent.click(
    screen.getByRole('button', { name: 'Spela figurerna' }),
  );
  expect(localStorage.getItem('stomme.program.pauseFigures')).toBeNull();
});

it('keeps working when storage is blocked', async () => {
  vi.stubGlobal('localStorage', {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
    removeItem: () => {
      throw new Error('blocked');
    },
  });
  render(<PauseFiguresButton />);
  await userEvent.click(
    screen.getByRole('button', { name: 'Pausa figurerna' }),
  );
  expect(screen.getByRole('button', { name: 'Spela figurerna' })).toBeTruthy();
  await userEvent.click(
    screen.getByRole('button', { name: 'Spela figurerna' }),
  );
});

it('observes visibility when IntersectionObserver exists', () => {
  const observe = vi.fn();
  const disconnect = vi.fn();
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe = observe;
      disconnect = disconnect;
    },
  );
  const { unmount } = render(<ExerciseThumb exerciseId="push-up" />);
  document.dispatchEvent(new Event('visibilitychange'));
  expect(observe).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('exercise-thumb')).toBeTruthy();
  unmount();
  expect(disconnect).toHaveBeenCalled();
});

const exercises: PassCardExercise[] = [
  {
    exerciseId: 'push-up',
    name: 'Armhävning',
    sets: 2,
    target: 10,
    restSec: 60,
  },
  { exerciseId: 'plank', name: 'Planka', sets: 2, target: 30, timed: true },
  {
    exerciseId: 'side-plank',
    name: 'Sidoplanka',
    sets: 2,
    target: 20,
    timed: true,
    perSide: true,
  },
];

it('lead card links every exercise and shows the legend', () => {
  render(
    <PassCard
      variant="lead"
      passNumber={2}
      focusLabel="Överkropp & bål"
      minutes={25}
      exercises={exercises}
      dayLabel="Idag"
      isToday
      showLegend
    />,
  );
  expect(screen.getByText('Pass 2')).toBeTruthy();
  expect(screen.getByText('Idag')).toBeTruthy();
  expect(screen.getByText('≈ 25 min · 3 övningar')).toBeTruthy();
  expect(
    screen.getByText(
      '2 × 10 = 2 set med 10 repetitioner. 60 s vila mellan seten.',
    ),
  ).toBeTruthy();
  expect(screen.getByText('2 × 20 s per sida')).toBeTruthy();
  const link = screen.getByRole('link', { name: /Armhävning/ });
  expect(link.getAttribute('href')).toBe('/ovning/push-up');
  expect(screen.getAllByTestId('exercise-thumb')).toHaveLength(3);
  expect(screen.getByRole('img', { name: 'Pass 2: 3 övningar' })).toBeTruthy();
});

it('receding card is compact and has no thumbnails or links', () => {
  render(
    <PassCard
      variant="receding"
      passNumber={3}
      focusLabel="Underkropp"
      minutes={20}
      exercises={exercises}
      dayLabel="lör"
    />,
  );
  expect(screen.getByText('Därefter · Pass 3')).toBeTruthy();
  expect(screen.queryByTestId('exercise-thumb')).toBeNull();
  expect(screen.queryByRole('link')).toBeNull();
  expect(screen.getByText('lör')).toBeTruthy();
});

it('explains a timed first exercise', () => {
  render(
    <PassCard
      variant="lead"
      passNumber={1}
      focusLabel="Helkropp"
      minutes={20}
      exercises={[exercises[1] as PassCardExercise]}
      showLegend
    />,
  );
  expect(screen.getByText('2 × 30 = 2 set på 30 sekunder.')).toBeTruthy();
});
