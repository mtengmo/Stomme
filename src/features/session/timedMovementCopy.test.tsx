// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exercises } from '../../content/exercises';
import { timedMovementCue } from '../../content/timedMovement';
import type { ExerciseId } from '../../domain/types';
import { SetScreen } from './SetScreen';

const frame = {
  title: 'Pass',
  stepId: 0,
  clock: '0:00',
  tally: { items: [], label: '0 av 2 set klara' },
  onAbort: () => {},
};

function show(id: ExerciseId) {
  render(
    <SetScreen
      frame={frame}
      exercise={exercises[id]}
      step={{
        kind: 'set',
        exerciseId: id,
        planIndex: 0,
        setNumber: 1,
        side: exercises[id].perSide ? 'right' : 'both',
      }}
      totalSets={2}
      initialAmount={20}
      initialLoadIndex={0}
      autoStartTimer
      onStartTimer={() => {}}
      busy={false}
      onDone={() => {}}
      onSkip={() => {}}
    />,
  );
  act(() => vi.advanceTimersByTime(5_300));
}

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const MOVING: ExerciseId[] = [
  'heel-slide',
  'mountain-climber',
  'single-leg-lateral-hop',
  'fast-feet',
  'in-and-out-jump',
  'lateral-shuffle',
  'knee-drive',
  'plate-pogos',
];

describe('timer copy for timed exercises', () => {
  it('has a cue row for exactly the moving timed exercises', () => {
    expect(Object.keys(timedMovementCue).sort()).toEqual([...MOVING].sort());
    for (const id of MOVING) expect(exercises[id].unit).toBe('seconds');
  });

  it.each(MOVING)('%s says exercise time, not hold time', (id) => {
    show(id);
    expect(screen.getByRole('region', { name: 'Övningstid' })).toBeTruthy();
    expect(screen.queryByText(/Håll tills signalen/)).toBeNull();
    expect(screen.queryByText(/Hålltid/)).toBeNull();
    expect(
      screen.getByText(timedMovementCue[id]?.status as string),
    ).toBeTruthy();
    expect(screen.getByRole('timer').getAttribute('aria-label')).toMatch(
      /övningstid kvar/,
    );
  });

  it.each(['plank', 'wall-sit', 'side-plank'] as ExerciseId[])(
    '%s keeps the hold copy',
    (id) => {
      show(id);
      expect(screen.getByRole('region', { name: 'Hålltid' })).toBeTruthy();
      expect(
        screen.getByText(
          'Håll tills signalen. Setet sparas och nästa steg börjar automatiskt.',
        ),
      ).toBeTruthy();
    },
  );

  it('keeps the leg-swap line for the two older moving exercises', () => {
    for (const id of ['heel-slide', 'mountain-climber'] as const)
      expect(timedMovementCue[id]?.status).toMatch(/^Växla ben lugnt/);
  });
});
