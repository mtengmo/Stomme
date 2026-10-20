// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTimedHold } from './useTimedHold';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('hands-free timed holds', () => {
  it('pauses an armed hold when the session cancels automatic continuation', () => {
    const done = vi.fn();
    const { result, rerender } = renderHook(
      ({ automatic }) =>
        useTimedHold({
          seconds: 20,
          side: '',
          autoStart: automatic,
          onDone: done,
        }),
      { initialProps: { automatic: true } },
    );
    act(() => vi.advanceTimersByTime(5_000));
    rerender({ automatic: false });
    expect(result.current.phase).toBe('paused');
    act(() => vi.advanceTimersByTime(60_000));
    expect(done).not.toHaveBeenCalled();
  });
  it('prepares for five seconds, holds the full duration, then completes exactly once', () => {
    const done = vi.fn();
    const { result } = renderHook(() =>
      useTimedHold({
        seconds: 20,
        side: 'Höger sida',
        autoStart: false,
        onDone: done,
      }),
    );
    expect(result.current.phase).toBe('idle');
    act(() => result.current.start());
    expect(result.current.remaining).toBe(5);
    act(() => vi.advanceTimersByTime(5_000));
    expect(result.current.phase).toBe('hold');
    expect(result.current.remaining).toBe(20);
    act(() => vi.advanceTimersByTime(20_000));
    expect(done).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(30_000));
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('pauses and resumes both preparation and work without losing their remaining time', () => {
    const done = vi.fn();
    const { result } = renderHook(() =>
      useTimedHold({ seconds: 20, side: '', autoStart: true, onDone: done }),
    );
    act(() => vi.advanceTimersByTime(2_000));
    act(() => result.current.pause());
    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current.remaining).toBe(3);
    act(() => result.current.resume());
    act(() => vi.advanceTimersByTime(3_000));
    expect(result.current.phase).toBe('hold');
    act(() => vi.advanceTimersByTime(7_000));
    act(() => result.current.pause());
    act(() => vi.advanceTimersByTime(30_000));
    expect(result.current.remaining).toBe(13);
    expect(done).not.toHaveBeenCalled();
    act(() => result.current.resume());
    act(() => vi.advanceTimersByTime(13_000));
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('pauses when hidden and requires an explicit resume', () => {
    const done = vi.fn();
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    const { result } = renderHook(() =>
      useTimedHold({ seconds: 20, side: '', autoStart: true, onDone: done }),
    );
    act(() => vi.advanceTimersByTime(5_000));
    act(() => {
      hidden.mockReturnValue(true);
      document.dispatchEvent(new Event('visibilitychange'));
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current.phase).toBe('paused');
    expect(done).not.toHaveBeenCalled();
    act(() => {
      hidden.mockReturnValue(false);
      document.dispatchEvent(new Event('visibilitychange'));
      vi.advanceTimersByTime(60_000);
    });
    expect(done).not.toHaveBeenCalled();
  });

  it('does not count late preparation ticks as completed exercise time or log after unmount', () => {
    const done = vi.fn();
    const { result, unmount } = renderHook(() =>
      useTimedHold({ seconds: 20, side: '', autoStart: true, onDone: done }),
    );
    act(() => {
      vi.setSystemTime(Date.now() + 60_000);
      vi.advanceTimersByTime(250);
    });
    expect(result.current.phase).toBe('hold');
    expect(result.current.remaining).toBe(20);
    unmount();
    act(() => vi.advanceTimersByTime(60_000));
    expect(done).not.toHaveBeenCalled();
  });
});
