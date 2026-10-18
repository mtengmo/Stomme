// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { secondsLeft, useCountdown } from './useCountdown';
import { createWakeLock } from './wakeLock';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('secondsLeft', () => {
  it('rounds up and never goes negative', () => {
    expect(secondsLeft(10_000, 0)).toBe(10);
    expect(secondsLeft(10_000, 9_001)).toBe(1);
    expect(secondsLeft(10_000, 12_000)).toBe(0);
  });
});

describe('useCountdown', () => {
  it('counts down, adds time, and fires once at zero', () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useCountdown(onDone));
    act(() => result.current.start(60));
    expect(result.current.seconds).toBe(60);
    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current.seconds).toBe(50);
    act(() => result.current.add(15));
    expect(result.current.seconds).toBe(65);
    act(() => vi.advanceTimersByTime(64_000));
    expect(result.current.seconds).toBe(1);
    expect(onDone).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1_000));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(result.current.running).toBe(false);
    act(() => vi.advanceTimersByTime(5_000));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('is correct after the tab was backgrounded and timers were throttled', () => {
    const { result } = renderHook(() => useCountdown());
    act(() => result.current.start(60));
    // the clock moves 30 s without any interval tick, then the tab is shown again
    act(() => {
      vi.setSystemTime(Date.now() + 30_000);
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current.seconds).toBe(30);
  });

  it('can be skipped', () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useCountdown(onDone));
    act(() => result.current.start(60));
    act(() => result.current.stop());
    expect(result.current.running).toBe(false);
    act(() => vi.advanceTimersByTime(70_000));
    expect(onDone).not.toHaveBeenCalled();
  });
});

describe('createWakeLock', () => {
  it('is a no-op without the API', async () => {
    const lock = createWakeLock({});
    await expect(lock.acquire()).resolves.toBeUndefined();
    await expect(lock.release()).resolves.toBeUndefined();
  });

  it('re-acquires when the page becomes visible again', async () => {
    const request = vi.fn(async () => {
      const listeners: Array<() => void> = [];
      return {
        release: vi.fn(async () => {
          for (const l of listeners) l();
        }),
        addEventListener: (_: string, cb: () => void) => listeners.push(cb),
      };
    });
    const lock = createWakeLock({ wakeLock: { request } });
    await lock.acquire();
    expect(request).toHaveBeenCalledTimes(1);
    const first = await request.mock.results[0]?.value;
    await first.release(); // the browser drops it when hidden
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    await lock.release();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('survives a refused request', async () => {
    const lock = createWakeLock({
      wakeLock: { request: async () => Promise.reject(new Error('denied')) },
    });
    await expect(lock.acquire()).resolves.toBeUndefined();
  });
});
