// @vitest-environment jsdom
import { readdirSync, readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  APPEARANCE_KEY,
  applyAppearance,
  applyThemeColor,
  clearAppearance,
  DEFAULT_APPEARANCE,
  getAppearance,
  initAppearance,
  parseAppearance,
  resolveScheme,
  setAppearance,
  subscribe,
} from './appearance';

function stubMedia(dark: boolean) {
  const listeners: (() => void)[] = [];
  const mq = {
    matches: dark,
    addEventListener: (_: string, fn: () => void) => listeners.push(fn),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal('matchMedia', () => mq);
  return {
    set(next: boolean) {
      mq.matches = next;
      for (const fn of listeners) fn();
    },
  };
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-scheme');
  document.head.innerHTML = '<meta name="theme-color" content="#000000">';
  document.documentElement.style.removeProperty('--paper');
  stubMedia(false);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('parseAppearance', () => {
  it('defaults to Rutat following the phone', () => {
    expect(parseAppearance(null)).toEqual({ theme: 'rutat', scheme: 'system' });
    expect(DEFAULT_APPEARANCE).toEqual({ theme: 'rutat', scheme: 'system' });
  });

  it('keeps valid values', () => {
    expect(
      parseAppearance(JSON.stringify({ theme: 'rutat', scheme: 'dark' })),
    ).toEqual({ theme: 'rutat', scheme: 'dark' });
  });

  it('falls back per field for unknown ids and schemes', () => {
    expect(
      parseAppearance(JSON.stringify({ theme: 'neon', scheme: 'dark' })),
    ).toEqual({ theme: 'rutat', scheme: 'dark' });
    expect(
      parseAppearance(JSON.stringify({ theme: 'rutat', scheme: 'sepia' })),
    ).toEqual({ theme: 'rutat', scheme: 'system' });
  });

  it('survives corrupt or non-object storage', () => {
    for (const raw of ['{', 'null', '"x"', '12', '[]', '']) {
      expect(parseAppearance(raw)).toEqual(DEFAULT_APPEARANCE);
    }
  });
});

describe('resolveScheme', () => {
  it('follows the phone only for system', () => {
    expect(resolveScheme('system', true)).toBe('dark');
    expect(resolveScheme('system', false)).toBe('light');
    expect(resolveScheme('light', true)).toBe('light');
    expect(resolveScheme('dark', false)).toBe('dark');
  });
});

describe('get, set and subscribe', () => {
  it('stores validated changes, applies them and notifies', () => {
    const seen = vi.fn();
    const off = subscribe(seen);
    expect(setAppearance({ scheme: 'dark' })).toEqual({
      theme: 'rutat',
      scheme: 'dark',
    });
    expect(getAppearance()).toEqual({ theme: 'rutat', scheme: 'dark' });
    expect(JSON.parse(localStorage.getItem(APPEARANCE_KEY) ?? '')).toEqual({
      theme: 'rutat',
      scheme: 'dark',
    });
    expect(document.documentElement.dataset.theme).toBe('rutat');
    expect(document.documentElement.dataset.scheme).toBe('dark');
    expect(seen).toHaveBeenCalledTimes(1);
    off();
    setAppearance({ scheme: 'light' });
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it('rejects an unknown theme id by falling back to Rutat', () => {
    expect(setAppearance({ theme: 'nope' }).theme).toBe('rutat');
  });

  it('resolves system against the phone', () => {
    stubMedia(true);
    setAppearance({ scheme: 'system' });
    expect(document.documentElement.dataset.scheme).toBe('dark');
  });

  it('still applies when storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(getAppearance()).toEqual(DEFAULT_APPEARANCE);
    expect(setAppearance({ scheme: 'dark' }).scheme).toBe('dark');
    expect(document.documentElement.dataset.scheme).toBe('dark');
    vi.restoreAllMocks();
  });

  it('clearAppearance forgets the choice and returns to the defaults', () => {
    setAppearance({ scheme: 'dark' });
    clearAppearance();
    expect(localStorage.getItem(APPEARANCE_KEY)).toBeNull();
    expect(document.documentElement.dataset.scheme).toBe('light');
  });
});

describe('theme-color', () => {
  it('copies the computed --paper into the single meta', () => {
    document.documentElement.style.setProperty('--paper', '#1a1f21');
    applyThemeColor();
    const metas = document.querySelectorAll('meta[name="theme-color"]');
    expect(metas).toHaveLength(1);
    expect((metas[0] as HTMLMetaElement).content).toBe('#1a1f21');
  });

  it('creates the meta when missing and leaves it alone without a value', () => {
    document.head.innerHTML = '';
    applyThemeColor();
    expect(document.querySelectorAll('meta[name="theme-color"]')).toHaveLength(
      0,
    );
    document.documentElement.style.setProperty('--paper', '#eef3f0');
    applyThemeColor();
    expect(
      document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
        ?.content,
    ).toBe('#eef3f0');
  });

  it('is refreshed when the boot script announces a change', () => {
    const stop = initAppearance();
    document.documentElement.style.setProperty('--paper', '#123456');
    const seen = vi.fn();
    const off = subscribe(seen);
    window.dispatchEvent(new Event('stomme:appearance'));
    expect(
      document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
        ?.content,
    ).toBe('#123456');
    expect(seen).toHaveBeenCalled();
    off();
    stop();
  });

  it('applyAppearance sets both attributes from storage', () => {
    localStorage.setItem(
      APPEARANCE_KEY,
      JSON.stringify({ theme: 'rutat', scheme: 'dark' }),
    );
    applyAppearance();
    expect(document.documentElement.dataset.scheme).toBe('dark');
  });
});

describe('public/theme-boot.js', () => {
  const source = readFileSync('public/theme-boot.js', 'utf8');
  const run = () => new Function(source)();

  it('applies the same attributes as appearance.ts for every stored state', () => {
    const states: (string | null)[] = [
      null,
      '{',
      JSON.stringify({ theme: 'rutat', scheme: 'dark' }),
      JSON.stringify({ theme: 'rutat', scheme: 'light' }),
      JSON.stringify({ theme: 'rutat', scheme: 'system' }),
      JSON.stringify({ theme: 'unknown', scheme: 'dark' }),
      JSON.stringify({ theme: 'rutat', scheme: 'bogus' }),
    ];
    for (const phoneDark of [false, true]) {
      for (const stored of states) {
        stubMedia(phoneDark);
        if (stored === null) localStorage.removeItem(APPEARANCE_KEY);
        else localStorage.setItem(APPEARANCE_KEY, stored);
        run();
        const boot = { ...document.documentElement.dataset };
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.removeAttribute('data-scheme');
        applyAppearance(parseAppearance(stored));
        expect(boot).toMatchObject(document.documentElement.dataset);
      }
    }
  });

  it('falls back to Rutat and follows the phone when storage throws', () => {
    stubMedia(true);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    run();
    expect(document.documentElement.dataset.theme).toBe('rutat');
    expect(document.documentElement.dataset.scheme).toBe('dark');
    vi.restoreAllMocks();
  });

  it('follows phone changes while the choice is "system" only', () => {
    const media = stubMedia(false);
    run();
    expect(document.documentElement.dataset.scheme).toBe('light');
    media.set(true);
    expect(document.documentElement.dataset.scheme).toBe('dark');
    localStorage.setItem(
      APPEARANCE_KEY,
      JSON.stringify({ theme: 'rutat', scheme: 'light' }),
    );
    media.set(false);
    media.set(true);
    expect(document.documentElement.dataset.scheme).toBe('dark');
  });
});

describe('source hygiene', () => {
  it('has no prefers-color-scheme media rule left in the stylesheets', () => {
    const files = ['src/styles/index.css'];
    for (const f of readdirSync('src/styles/themes'))
      if (f.endsWith('.css')) files.push(`src/styles/themes/${f}`);
    for (const f of files) {
      expect(readFileSync(f, 'utf8'), f).not.toContain('prefers-color-scheme');
    }
  });
});
