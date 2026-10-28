// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { repProgress, repTempo } from '../rules/repTempo';
import { cue } from './beep';
import { useRepCounter } from './useRepCounter';

vi.mock('./beep', () => ({
  cue: {
    start: vi.fn(),
    go: vi.fn(),
    pause: vi.fn(),
    rep: vi.fn(),
    done: vi.fn(),
  },
}));

const tempo = repTempo('goblet-squat');
if (!tempo) throw new Error('tempo');

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const setup = (reps = 3, autoStart = false) => {
  const done = vi.fn();
  const view = renderHook(() =>
    useRepCounter({ reps, tempo, side: '', autoStart, onDone: done }),
  );
  return { done, ...view };
};
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe('hands-free rep counting', () => {
  it('prepares five seconds, counts each rep and saves once at the last rep', () => {
    const { result, done } = setup(3);
    act(() => result.current.start());
    expect(result.current.phase).toBe('prepare');
    advance(5_050);
    expect(result.current.phase).toBe('active');
    advance(4_050);
    expect(result.current.completed).toBe(1);
    advance(4_000);
    expect(result.current.completed).toBe(2);
    expect(done).not.toHaveBeenCalled();
    advance(4_050);
    expect(result.current.phase).toBe('done');
    expect(done).toHaveBeenCalledTimes(1);
    expect(done).toHaveBeenCalledWith(3, false);
    advance(30_000);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('keeps the count across pause and resumes after a 3-2-1 lead-in', () => {
    const { result, done } = setup(3);
    act(() => result.current.start());
    advance(5_000 + 5_000);
    expect(result.current.completed).toBe(1);
    act(() => result.current.pause());
    expect(result.current.phase).toBe('paused');
    advance(60_000);
    expect(result.current.completed).toBe(1);
    act(() => result.current.resume());
    expect(result.current.phase).toBe('resuming');
    advance(3_050);
    expect(result.current.phase).toBe('active');
    advance(3_000);
    expect(result.current.completed).toBe(2);
    expect(done).not.toHaveBeenCalled();
  });

  it('pauses when the app goes to the background', () => {
    const { result } = setup(3, true);
    advance(6_000);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current.phase).toBe('paused');
  });

  it('ending early logs only whole reps', () => {
    const { result, done } = setup(5);
    act(() => result.current.start());
    advance(5_000 + 9_000);
    act(() => result.current.endEarly());
    expect(done).toHaveBeenCalledTimes(1);
    expect(done).toHaveBeenCalledWith(2, true);
  });

  it('ending before the first rep saves nothing', () => {
    const { result, done } = setup(5);
    act(() => result.current.start());
    advance(5_000 + 3_000);
    act(() => result.current.endEarly());
    expect(done).not.toHaveBeenCalled();
    expect(result.current.phase).toBe('idle');
  });

  it('progress follows the rep clock, freezes when paused and is 0 outside a set', () => {
    const { result } = setup(3);
    expect(result.current.progress()).toBe(0);
    act(() => result.current.start());
    advance(5_000 + 1_000);
    expect(result.current.progress()).toBeCloseTo(repProgress(tempo, 1_000), 1);
    act(() => result.current.pause());
    const frozen = result.current.progress();
    advance(10_000);
    expect(result.current.progress()).toBe(frozen);
    expect(frozen).toBeGreaterThan(0);
  });

  it('counts and beeps in the same frame at the rep boundary', () => {
    const { result } = setup(5);
    act(() => result.current.start());
    advance(5_000 + 3_900);
    expect(result.current.completed).toBe(0);
    const before = vi.mocked(cue.rep).mock.calls.length;
    advance(50);
    expect(result.current.completed).toBe(0);
    advance(60);
    expect(result.current.completed).toBe(1);
    expect(vi.mocked(cue.rep).mock.calls.length).toBe(before + 1);
    expect(result.current.progress()).toBeLessThan(0.05);
  });

  it('ticks once per displayed second of the lead-in and sounds go at zero', () => {
    const { result } = setup(3);
    vi.mocked(cue.rep).mockClear();
    vi.mocked(cue.go).mockClear();
    act(() => result.current.start());
    advance(4_500);
    expect(vi.mocked(cue.rep)).toHaveBeenCalledTimes(4);
    expect(cue.go).not.toHaveBeenCalled();
    advance(600);
    expect(cue.go).toHaveBeenCalledTimes(1);
    expect(result.current.phase).toBe('active');
  });
});
