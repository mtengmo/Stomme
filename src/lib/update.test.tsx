// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import type { RegisterSWOptions } from 'vite-plugin-pwa/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  need: false,
  options: undefined as RegisterSWOptions | undefined,
}));
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: (options: RegisterSWOptions) => {
    state.options = options;
    return { needRefresh: [state.need, vi.fn()] };
  },
}));

import { UPDATE_INTERVAL, UPDATE_THROTTLE, useAppUpdate } from './update';

class Worker extends EventTarget {
  state: ServiceWorkerState = 'installing';
  postMessage = vi.fn();
  change(next: ServiceWorkerState) {
    this.state = next;
    this.dispatchEvent(new Event('statechange'));
  }
}
class Registration extends EventTarget {
  active: Worker | null = new Worker();
  installing: Worker | null = null;
  waiting: Worker | null = null;
  update = vi.fn().mockResolvedValue(undefined);
}
let reg: Registration;
let container: EventTarget & {
  controller: Worker | null;
  getRegistration: ReturnType<typeof vi.fn>;
  register: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.useFakeTimers();
  state.need = false;
  window.location.hash = '#/';
  reg = new Registration();
  container = Object.assign(new EventTarget(), {
    controller: reg.active,
    getRegistration: vi.fn().mockResolvedValue(reg),
    register: vi.fn().mockResolvedValue(reg),
  });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: container,
  });
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: true,
  });
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: 'visible',
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function mount(inSession = false) {
  const hook = renderHook(() => useAppUpdate(inSession));
  await act(async () => {
    state.options?.onRegisteredSW?.(
      '/sw.js',
      reg as unknown as ServiceWorkerRegistration,
    );
  });
  return hook;
}

describe('useAppUpdate lifecycle', () => {
  it('checks at registration, throttles foreground bursts and checks every five visible minutes', async () => {
    const { result, unmount } = await mount();
    expect(reg.update).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('current');
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('online'));
    });
    expect(reg.update).toHaveBeenCalledTimes(1);
    await act(async () => {
      vi.advanceTimersByTime(UPDATE_THROTTLE);
      window.dispatchEvent(new Event('focus'));
    });
    expect(reg.update).toHaveBeenCalledTimes(2);
    await act(async () => {
      vi.advanceTimersByTime(UPDATE_INTERVAL);
    });
    expect(reg.update).toHaveBeenCalledTimes(3);
    unmount();
    vi.advanceTimersByTime(UPDATE_INTERVAL);
    window.dispatchEvent(new Event('focus'));
    expect(reg.update).toHaveBeenCalledTimes(3);
  });

  it('manual checks bypass throttling and deduplicate with an automatic request', async () => {
    const { result } = await mount();
    let finish: (() => void) | undefined;
    reg.update.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    let first: Promise<void>;
    await act(async () => {
      first = result.current.checkForUpdate();
      void result.current.checkForUpdate();
      window.dispatchEvent(new Event('focus'));
    });
    expect(reg.update).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe('checking');
    await act(async () => {
      finish?.();
      await first;
    });
    expect(result.current.status).toBe('current');
  });

  it('keeps installation separate from a completed check and only activates a waiting worker', async () => {
    const { result } = await mount();
    const worker = new Worker();
    reg.update.mockImplementation(async () => {
      reg.installing = worker;
      reg.dispatchEvent(new Event('updatefound'));
    });
    await act(async () => {
      await result.current.checkForUpdate();
    });
    expect(result.current.status).toBe('installing');
    expect(result.current.needRefresh).toBe(false);
    await act(async () => {
      await result.current.updateNow();
    });
    expect(worker.postMessage).not.toHaveBeenCalled();
    await act(async () => {
      reg.waiting = worker;
      reg.installing = null;
      worker.change('installed');
    });
    expect(result.current.needRefresh).toBe(true);
    await act(async () => {
      await result.current.updateNow();
    });
    expect(worker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(result.current.status).toBe('applying');
  });

  it('finds an already waiting update at startup and during a manual check', async () => {
    reg.waiting = new Worker();
    const { result } = await mount();
    await act(async () => {
      await result.current.checkForUpdate();
    });
    expect(result.current.status).toBe('ready');
    expect(result.current.showBanner).toBe(true);
    expect(reg.update).not.toHaveBeenCalled();
  });

  it('skips hidden/offline checks, reports failed checks and retries when online', async () => {
    const { result } = await mount();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    await act(async () => {
      vi.advanceTimersByTime(UPDATE_INTERVAL);
    });
    expect(reg.update).toHaveBeenCalledTimes(1);
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    await act(async () => {
      await result.current.checkForUpdate();
    });
    expect(result.current.status).toBe('offline');
    expect(reg.update).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    reg.update.mockRejectedValueOnce(new Error('server unavailable'));
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current.status).toBe('failed');
    await act(async () => {
      await result.current.checkForUpdate();
    });
    expect(result.current.status).toBe('current');
  });

  it('surfaces registration failure and retries registration explicitly', async () => {
    const { result } = renderHook(() => useAppUpdate());
    await act(async () => {
      state.options?.onRegisterError?.(new Error('blocked'));
    });
    expect(result.current.status).toBe('failed');
    container.getRegistration.mockResolvedValue(undefined);
    await act(async () => {
      await result.current.checkForUpdate();
    });
    expect(container.register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
    expect(result.current.status).toBe('current');
  });

  it.each([
    '/session/abc',
    '/smarta/abc/before',
    '/kansla/abc/before',
    '/traning/abc',
    '/ovning/e01',
  ])(
    'never activates or reloads %s after another tab accepts',
    async (route) => {
      reg.waiting = new Worker();
      const { result } = await mount();
      window.location.hash = `#${route}`;
      await act(async () => {
        await result.current.updateNow();
      });
      expect(reg.waiting.postMessage).not.toHaveBeenCalled();
      await act(async () => {
        container.controller = new Worker();
        container.dispatchEvent(new Event('controllerchange'));
        state.options?.onNeedReload?.();
      });
      expect(result.current.reloadPending).toBe(true);
      expect(result.current.status).toBe('ready');
      expect(window.location.hash).toBe(`#${route}`);
    },
  );

  it('hides the banner when the caller reports an active session', async () => {
    reg.waiting = new Worker();
    const { result } = await mount(true);
    expect(result.current.needRefresh).toBe(true);
    expect(result.current.showBanner).toBe(false);
  });

  it('reports a failed installation instead of offering activation', async () => {
    const { result } = await mount();
    reg.installing = new Worker();
    await act(async () => {
      reg.dispatchEvent(new Event('updatefound'));
    });
    await act(async () => {
      reg.installing?.change('redundant');
    });
    expect(result.current.status).toBe('failed');
    expect(result.current.needRefresh).toBe(false);
  });

  it('leaves the installing state when the first offline worker activates', async () => {
    reg.active = null;
    container.controller = null;
    reg.installing = new Worker();
    const { result } = await mount();
    expect(result.current.status).toBe('installing');
    await act(async () => {
      reg.installing?.change('installed');
    });
    expect(result.current.needRefresh).toBe(false);
    await act(async () => {
      reg.installing?.change('activated');
    });
    expect(result.current.status).toBe('current');
  });
});
