// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { WeekTick } from './WeekTick';

function mockMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

beforeEach(() => {
  localStorage.clear();
  mockMotion(false);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const strip = <div>strip</div>;
const animated = () =>
  screen.getByTestId('week-tick').getAttribute('data-animated');

it('animates once per flag key, then stays static', () => {
  const first = render(
    <WeekTick flagKey="p1:1" week={1} done>
      {strip}
    </WeekTick>,
  );
  expect(animated()).toBe('true');
  expect(screen.getByText('Vecka 1 klar')).toBeTruthy();
  expect(
    JSON.parse(localStorage.getItem('stomme.program.weekTick') ?? '[]'),
  ).toEqual(['p1:1']);
  first.unmount();

  render(
    <WeekTick flagKey="p1:1" week={1} done>
      {strip}
    </WeekTick>,
  );
  expect(animated()).toBe('false');
  cleanup();

  render(
    <WeekTick flagKey="p1:2" week={2} done>
      {strip}
    </WeekTick>,
  );
  expect(animated()).toBe('true');
});

it('draws nothing and sets no flag while the week is not done', () => {
  render(
    <WeekTick flagKey="p1:1" week={1} done={false}>
      {strip}
    </WeekTick>,
  );
  expect(screen.queryByTestId('week-tick')).toBeNull();
  expect(localStorage.getItem('stomme.program.weekTick')).toBeNull();
});

it('is static under reduced motion but still shows the stroke', () => {
  mockMotion(true);
  const seen: boolean[] = [];
  render(
    <WeekTick flagKey="p1:1" week={1} done onAnimate={(a) => seen.push(a)}>
      {strip}
    </WeekTick>,
  );
  const svg = screen.getByTestId('week-tick');
  expect(svg.getAttribute('data-animated')).toBe('false');
  expect(svg.getAttribute('class')).not.toContain('week-tick-new');
  expect(seen).toEqual([false]);
});

it('survives blocked storage', () => {
  vi.stubGlobal('localStorage', {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
  });
  render(
    <WeekTick flagKey="p1:1" week={1} done>
      {strip}
    </WeekTick>,
  );
  expect(screen.getByTestId('week-tick')).toBeTruthy();
});
