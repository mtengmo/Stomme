// @vitest-environment jsdom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { expire } = vi.hoisted(() => ({
  expire: vi.fn(async () => [] as string[]),
}));
vi.mock('../db/repo', () => ({ expireStaleSessions: expire }));
vi.mock('../db/db', () => ({ getDb: () => ({}) }));

import { useSessionExpiry } from './useSessionExpiry';

beforeEach(() => {
  vi.useFakeTimers();
  expire.mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useSessionExpiry', () => {
  it('checks on mount, when the page becomes visible and every five minutes', () => {
    renderHook(() => useSessionExpiry());
    expect(expire).toHaveBeenCalledTimes(1);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(expire).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(5 * 60_000);
    expect(expire).toHaveBeenCalledTimes(3);
  });

  it('stops listening and polling after unmount', () => {
    const { unmount } = renderHook(() => useSessionExpiry());
    unmount();
    expire.mockClear();
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(20 * 60_000);
    expect(expire).not.toHaveBeenCalled();
  });

  it('survives a failing check', () => {
    expire.mockRejectedValueOnce(new Error('db closed'));
    expect(() => renderHook(() => useSessionExpiry())).not.toThrow();
  });
});
