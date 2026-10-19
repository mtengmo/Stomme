// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initInstall, isInstalled, promptInstall, useInstall } from './install';

let stop: () => void;
beforeEach(() => {
  stop = initInstall();
});
afterEach(() => {
  stop();
  vi.unstubAllGlobals();
});

function fireInstallEvent(outcome: 'accepted' | 'dismissed') {
  const e = new Event('beforeinstallprompt', { cancelable: true });
  const prompt = vi.fn().mockResolvedValue(undefined);
  Object.assign(e, { prompt, userChoice: Promise.resolve({ outcome }) });
  act(() => {
    window.dispatchEvent(e);
  });
  return { e, prompt };
}

describe('install', () => {
  it('is unavailable before the event', async () => {
    expect(await promptInstall()).toBe('unavailable');
  });
  it('captures the event, prevents default and prompts once', async () => {
    const { result } = renderHook(() => useInstall());
    expect(result.current.canInstall).toBe(false);
    const { e, prompt } = fireInstallEvent('accepted');
    expect(e.defaultPrevented).toBe(true);
    expect(result.current.canInstall).toBe(true);
    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.prompt();
    });
    expect(outcome).toBe('accepted');
    expect(prompt).toHaveBeenCalledOnce();
    expect(result.current.canInstall).toBe(false);
    expect(await promptInstall()).toBe('unavailable');
  });
  it('reports a dismissed prompt', async () => {
    fireInstallEvent('dismissed');
    expect(await promptInstall()).toBe('dismissed');
  });
  it('appinstalled clears the prompt and marks installed', () => {
    const { result } = renderHook(() => useInstall());
    fireInstallEvent('accepted');
    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });
    expect(result.current.canInstall).toBe(false);
    expect(result.current.installed).toBe(true);
  });
  it('detects standalone display mode', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q === '(display-mode: standalone)',
    }));
    expect(isInstalled()).toBe(true);
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    expect(isInstalled()).toBe(false);
  });
});
