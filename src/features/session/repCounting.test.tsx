// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exercises } from '../../content/exercises';
import type { ExerciseId } from '../../domain/types';
import { SetScreen } from './SetScreen';

const frame = {
  title: 'Pass',
  stepId: 0,
  clock: '0:00',
  tally: { items: [], label: '0 av 2 set klara' },
  onAbort: () => {},
};

function show(id: ExerciseId, autoStartTimer = false) {
  const onDone = vi.fn();
  const onStartTimer = vi.fn();
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
      initialAmount={3}
      initialLoadIndex={0}
      autoStartTimer={autoStartTimer}
      onStartTimer={onStartTimer}
      busy={false}
      onDone={onDone}
      onSkip={() => {}}
    />,
  );
  return { onDone, onStartTimer };
}
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const phase = (word: string) => screen.getByText(new RegExp(`^${word}( · |$)`));
const click = (name: string | RegExp) =>
  act(() => screen.getByRole('button', { name }).click());

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('rep counting on the set screen', () => {
  it('offers one Start, counts and saves the planned reps once', () => {
    const { onDone, onStartTimer } = show('goblet-squat');
    expect(screen.queryByRole('button', { name: 'Klar set' })).toBeNull();
    click('Starta – 5 s förberedelse');
    expect(onStartTimer).toHaveBeenCalledTimes(1);
    expect(phase('Gör dig redo')).toBeTruthy();
    advance(5_050);
    expect(phase('Pågår')).toBeTruthy();
    advance(8_000);
    expect(screen.getByText('2 / 3')).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
    advance(4_000);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledWith(3, 0, undefined, {
      counting: 'auto',
      endedEarly: false,
    });
  });

  it('pauses with the main button, the counter and the Space key', () => {
    show('goblet-squat', true);
    advance(6_000);
    click('Pausa');
    expect(phase('Pausad')).toBeTruthy();
    click('Fortsätt');
    expect(phase('Fortsätter')).toBeTruthy();
    act(() => {
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'Space', bubbles: true }),
      );
    });
    expect(phase('Pausad')).toBeTruthy();
    click('Fortsätt räkningen');
    expect(phase('Fortsätter')).toBeTruthy();
  });

  it('ignores Space while a button has focus', () => {
    show('goblet-squat', true);
    advance(6_000);
    const main = screen.getByRole('button', { name: 'Pausa' });
    act(() => {
      main.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'Space', bubbles: true }),
      );
    });
    expect(screen.queryByText(/^Pausad( · |$)/)).toBeNull();
    expect(phase('Pågår')).toBeTruthy();
  });

  it('Avsluta setet saves the finished reps and marks the set as ended early', () => {
    const { onDone } = show('goblet-squat', true);
    advance(5_000 + 9_000);
    click('Avsluta setet');
    expect(onDone).toHaveBeenCalledWith(2, 0, undefined, {
      counting: 'auto',
      endedEarly: true,
    });
  });

  it('Räkna själv switches to the manual Klar set and is remembered', () => {
    const { onDone } = show('goblet-squat');
    act(() => screen.getByRole('switch', { name: 'Räkna själv: av' }).click());
    expect(window.localStorage.getItem('stomme.repCount.manual')).toBe('1');
    click('Klar set');
    expect(onDone).toHaveBeenCalledWith(3, 0, undefined, {
      counting: 'manual',
    });
  });

  it.each([
    'pull-up',
    'parallel-dip',
    'balance-clock',
    'farmer-carry',
  ] as const)('%s stays manual', (id) => {
    show(id);
    expect(screen.getByRole('button', { name: 'Klar set' })).toBeTruthy();
    expect(screen.queryByText('Räkna själv: av')).toBeNull();
  });

  it.each([
    'squat-jump',
    'burpee',
    'jumping-lunge',
    'kettlebell-swing',
  ] as const)(
    '%s renders with a counter, a suggested beat and the manual switch',
    (id) => {
      show(id);
      expect(
        screen.getByRole('button', { name: 'Starta – 5 s förberedelse' }),
      ).toBeTruthy();
      expect(screen.getByText(/Takt: ca \d+ s per repetition/)).toBeTruthy();
      expect(screen.getByText(/Förslag på takt/)).toBeTruthy();
      expect(
        screen.getByRole('switch', { name: 'Räkna själv: av' }),
      ).toBeTruthy();
    },
  );
});

describe('pace buttons', () => {
  it('slows and quickens the suggested beat and remembers it', () => {
    show('goblet-squat');
    expect(screen.getByText(/Takt: ca 4 s/)).toBeTruthy();
    click('Långsammare');
    expect(screen.getByText(/Takt: ca 5 s/)).toBeTruthy();
    expect(window.localStorage.getItem('stomme.repCount.pace')).toBe('3');
    click('Snabbare');
    click('Snabbare');
    expect(screen.getByText(/Takt: ca 3 s/)).toBeTruthy();
  });

  it('locks the buttons while a rep is being counted', () => {
    show('goblet-squat', true);
    advance(6_000);
    expect(
      (screen.getByRole('button', { name: 'Snabbare' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
