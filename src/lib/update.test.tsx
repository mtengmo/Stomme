// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = { need: false, update: vi.fn().mockResolvedValue(undefined) };
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [state.need, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: state.update,
  }),
}));

import { useAppUpdate } from './update';

beforeEach(() => {
  state.need = false;
  state.update.mockClear();
});

describe('useAppUpdate', () => {
  it('shows nothing without a waiting update', () => {
    const { result } = renderHook(() => useAppUpdate(false));
    expect(result.current.needRefresh).toBe(false);
    expect(result.current.showBanner).toBe(false);
  });
  it('shows the banner outside a session', () => {
    state.need = true;
    const { result } = renderHook(() => useAppUpdate(false));
    expect(result.current.showBanner).toBe(true);
  });
  it('never shows the banner mid-session', () => {
    state.need = true;
    const { result } = renderHook(() => useAppUpdate(true));
    expect(result.current.needRefresh).toBe(true);
    expect(result.current.showBanner).toBe(false);
  });
  it('updateNow reloads with the new worker', async () => {
    const { result } = renderHook(() => useAppUpdate());
    await result.current.updateNow();
    expect(state.update).toHaveBeenCalledWith(true);
  });
});
