// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { BlockProgress } from './BlockProgress';
import { ProgramWeekStrip } from './ProgramWeekStrip';

afterEach(cleanup);

// 2026-11-04 is a Wednesday; the week is 2026-11-02 .. 2026-11-08.
it('labels each day of the calendar week, Monday first', () => {
  render(
    <ProgramWeekStrip
      today="2026-11-04"
      plannedDates={['2026-11-04', '2026-11-06']}
      doneDates={['2026-11-02']}
      nextDate="2026-11-06"
      suggestedWeekdays={[3, 5]}
    />,
  );
  const items = within(
    screen.getByRole('list', { name: 'Veckan' }),
  ).getAllByRole('listitem');
  expect(items).toHaveLength(7);
  expect(items[0]?.getAttribute('aria-label')).toBe('måndag 2 november, klart');
  expect(items[2]?.getAttribute('aria-label')).toBe(
    'onsdag 4 november, idag, planerat',
  );
  expect(items[4]?.getAttribute('aria-label')).toBe(
    'fredag 6 november, planerat',
  );
  expect(items[6]?.getAttribute('aria-label')).toBe('söndag 8 november');
  expect(screen.getByText('Nästa')).toBeTruthy();
  expect(
    screen.getByText('Förslag: ons · fre. Träna när det passar.'),
  ).toBeTruthy();
});

it('omits the next chip and suggestion when not given', () => {
  render(
    <ProgramWeekStrip today="2026-11-04" plannedDates={[]} doneDates={[]} />,
  );
  expect(screen.queryByText('Nästa')).toBeNull();
  expect(screen.queryByText(/Förslag/)).toBeNull();
});

it('describes block progress per week and in total', () => {
  render(
    <BlockProgress done={5} total={12} currentWeek={2} completedWeeks={1} />,
  );
  const list = screen.getByRole('list', {
    name: 'Blockets framsteg: 1 av 4 veckor klara',
  });
  const labels = within(list)
    .getAllByRole('listitem')
    .map((li) => li.getAttribute('aria-label'));
  expect(labels).toEqual([
    'Vecka 1, klar',
    'Vecka 2, nu',
    'Vecka 3, kommande',
    'Vecka 4, kommande',
  ]);
  expect(screen.getByText('5 av 12 pass')).toBeTruthy();
  expect(screen.getByText('Nu')).toBeTruthy();
});
