import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  requestPersistence,
  shouldRemindBackup,
  storageStatus,
} from './storage';

const now = new Date(2026, 9, 19, 12);
const s = (d: number) => new Date(2026, 9, d, 10).toISOString();

describe('shouldRemindBackup', () => {
  it('does not remind with no sessions since export', () => {
    expect(
      shouldRemindBackup({
        lastExportAt: s(1),
        completedSessionTimes: [s(0 + 1)],
        now,
      }),
    ).toBe(false);
    expect(shouldRemindBackup({ completedSessionTimes: [], now })).toBe(false);
  });
  it('reminds after 4 sessions since last export', () => {
    const t = [s(11), s(12), s(13), s(14)];
    expect(
      shouldRemindBackup({
        lastExportAt: s(10),
        completedSessionTimes: t,
        now,
      }),
    ).toBe(true);
    expect(
      shouldRemindBackup({
        lastExportAt: s(10),
        completedSessionTimes: t.slice(0, 3),
        now,
      }),
    ).toBe(false);
  });
  it('reminds only when more than 14 days passed and there is new data', () => {
    const last = new Date(2026, 9, 4, 9).toISOString();
    expect(
      shouldRemindBackup({
        lastExportAt: last,
        completedSessionTimes: [s(10)],
        now: new Date(2026, 9, 18),
      }),
    ).toBe(false); // exactly 14 days
    expect(
      shouldRemindBackup({
        lastExportAt: last,
        completedSessionTimes: [s(10)],
        now: new Date(2026, 9, 19),
      }),
    ).toBe(true);
    expect(
      shouldRemindBackup({
        lastExportAt: last,
        completedSessionTimes: [],
        now: new Date(2027, 0, 1),
      }),
    ).toBe(false);
  });
  it('without any export counts from the first session', () => {
    expect(
      shouldRemindBackup({ completedSessionTimes: [s(1), s(3)], now }),
    ).toBe(true); // 18 days
    expect(
      shouldRemindBackup({ completedSessionTimes: [s(15), s(17)], now }),
    ).toBe(false);
    expect(
      shouldRemindBackup({
        completedSessionTimes: [s(15), s(16), s(17), s(18)],
        now,
      }),
    ).toBe(true);
  });
});

describe('persistence and status', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('requestPersistence calls persist once and reports', async () => {
    const persist = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('navigator', {
      storage: { persist, persisted: vi.fn().mockResolvedValue(false) },
    });
    expect(await requestPersistence()).toBe(true);
    expect(persist).toHaveBeenCalledOnce();
  });
  it('skips persist when already persisted; never throws', async () => {
    const persist = vi.fn();
    vi.stubGlobal('navigator', {
      storage: { persist, persisted: vi.fn().mockResolvedValue(true) },
    });
    expect(await requestPersistence()).toBe(true);
    expect(persist).not.toHaveBeenCalled();
    vi.stubGlobal('navigator', {
      storage: { persist: vi.fn().mockRejectedValue(new Error('x')) },
    });
    expect(await requestPersistence()).toBe(false);
    vi.stubGlobal('navigator', {});
    expect(await requestPersistence()).toBe(false);
  });
  it('storageStatus maps persisted and estimate', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        persisted: vi.fn().mockResolvedValue(false),
        estimate: vi.fn().mockResolvedValue({ usage: 10, quota: 100 }),
      },
    });
    expect(await storageStatus()).toEqual({
      state: 'evictable',
      usageBytes: 10,
      quotaBytes: 100,
    });
    vi.stubGlobal('navigator', {});
    expect((await storageStatus()).state).toBe('unsupported');
  });
});
