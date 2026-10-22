import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { evaluateTheme } from './contrast';
import {
  DEFAULT_THEME_ID,
  getTheme,
  SCHEMES,
  type ThemeDef,
  TOKEN_NAMES,
  themes,
} from './themes/registry';

const read = (path: string) => readFileSync(path, 'utf8');

function runGate(theme: ThemeDef) {
  for (const scheme of SCHEMES) {
    it(`${theme.id} ${scheme}: tokens, contrast and distinctness pass`, () => {
      const report = evaluateTheme(theme, scheme);
      expect(report.failures).toEqual([]);
      expect(report.pairs.length).toBeGreaterThan(30);
    });
    it(`${theme.id} ${scheme}: text reaches ${theme.textMin}:1 on paper and surface`, () => {
      const report = evaluateTheme(theme, scheme);
      const text = report.pairs.filter(
        (p) => p.kind === 'text' && (p.bg === 'paper' || p.bg === 'surface'),
      );
      expect(text.length).toBeGreaterThan(8);
      for (const pair of text) {
        expect(pair.ratio, `${pair.fg} on ${pair.bg}`).toBeGreaterThanOrEqual(
          theme.textMin,
        );
      }
    });
  }
}

describe('registry', () => {
  it('registers Rutat as the default theme', () => {
    expect(getTheme(DEFAULT_THEME_ID)?.name).toBe('Rutat');
    expect(themes.map((t) => t.id)).toContain('rutat');
    expect(new Set(themes.map((t) => t.id)).size).toBe(themes.length);
  });

  it('keeps public/theme-boot.js in step with the registry ids', () => {
    const boot = read('public/theme-boot.js');
    const list = /const THEMES = \[([^\]]*)\]/.exec(boot)?.[1] ?? '';
    const ids = [...list.matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(ids).toEqual(themes.map((t) => t.id));
    expect(boot).toContain(`const DEFAULT_THEME = '${DEFAULT_THEME_ID}'`);
  });
});

describe.each(themes)('theme $id', (theme) => {
  runGate(theme);

  it('has a Swedish name, a strategy and a done-colour statement', () => {
    expect(theme.name).not.toBe('');
    expect(theme.doneStatement).not.toBe('');
    expect(['Restrained', 'Committed', 'Full palette']).toContain(
      theme.strategy,
    );
  });

  it('is mirrored exactly by its CSS file', () => {
    const css = read(`src/styles/themes/${theme.id}.css`).replaceAll('"', "'");
    for (const scheme of SCHEMES) {
      const block = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].find(
        ([, selector = '']) =>
          selector.includes(`[data-theme='${theme.id}']`) &&
          (selector.includes("[data-scheme='dark']") ? 'dark' : 'light') ===
            scheme,
      );
      expect(block, `${theme.id} ${scheme} block`).toBeDefined();
      const declared = Object.fromEntries(
        [...(block?.[2] ?? '').matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/g)]
          .filter((m) =>
            (TOKEN_NAMES as readonly string[]).includes(m[1] ?? ''),
          )
          .map((m) => [m[1], m[2]]),
      );
      expect(declared).toEqual(theme.tokens[scheme]);
    }
  });
});

describe('the gate catches broken themes', () => {
  const base = themes[0] as ThemeDef;
  const clone = (): ThemeDef => structuredClone(base);

  it('fails a missing token', () => {
    const broken = clone();
    (broken.tokens.light as Partial<Record<string, string>>).care = undefined;
    expect(evaluateTheme(broken, 'light').failures).toContain(
      'missing token care',
    );
  });

  it('fails weak text contrast', () => {
    const broken = clone();
    broken.tokens.light['ink-soft'] = '#bbbbbb';
    expect(
      evaluateTheme(broken, 'light').failures.some((f) =>
        f.startsWith('ink-soft on paper'),
      ),
    ).toBe(true);
  });

  it('fails colours that are too alike', () => {
    const broken = clone();
    broken.tokens.dark.care = broken.tokens.dark.done;
    expect(
      evaluateTheme(broken, 'dark').failures.some((f) =>
        f.startsWith('deltaE done/care'),
      ),
    ).toBe(true);
  });

  it('requires 7:1 text when the theme asks for it', () => {
    const strict = clone();
    strict.textMin = 7;
    expect(
      evaluateTheme(strict, 'light').failures.some((f) => f.includes('< 7')),
    ).toBe(true);
  });

  it('knows every required token name', () => {
    expect(TOKEN_NAMES).toHaveLength(20);
  });
});

describe('Hög kontrast', () => {
  const hk = getTheme('hog-kontrast') as ThemeDef;

  it('asks for 7:1 text, has no grid and a double focus ring in light', () => {
    expect(hk.textMin).toBe(7);
    expect(hk.grid).toBe(false);
    expect(hk.focus.light.kind).toBe('double');
    expect(hk.focus.dark.kind).toBe('offset');
  });

  it('draws the double ring and hides the grid in CSS', () => {
    const css = read('src/styles/themes/hog-kontrast.css').replaceAll('"', "'");
    expect(css).toMatch(/--grid-line: transparent/);
    expect(css).toMatch(/--focus-outline: #0b0b0b/);
    expect(css).toMatch(/--focus-ring: 0 0 0 3px #ffd500/);
  });
});
