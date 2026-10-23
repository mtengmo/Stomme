import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { evaluateTheme } from './contrast';
import {
  DEFAULT_THEME_ID,
  getTheme,
  OPTIONAL_TOKEN_NAMES,
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
            [...TOKEN_NAMES, ...OPTIONAL_TOKEN_NAMES].includes(
              (m[1] ?? '') as never,
            ),
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

describe('tinted surfaces and reported pairs', () => {
  it.each(themes)('$id checks coloured text on surface-tint', (theme) => {
    for (const scheme of SCHEMES) {
      const names = evaluateTheme(theme, scheme).pairs.map(
        (p) => `${p.fg} on ${p.bg}`,
      );
      for (const fg of ['done', 'accent', 'care', 'info'])
        expect(names).toContain(`${fg} on surface-tint`);
    }
  });

  it('reports care/action without failing on it', () => {
    const rutat = evaluateTheme(themes[0] as ThemeDef, 'light');
    expect(rutat.reported).toHaveLength(1);
    expect(rutat.reported[0]?.deltaE).toBe(0);
    expect(rutat.failures).toEqual([]);
  });
});

describe('Hav light done chip (solid coral fill with ink text)', () => {
  const hav = getTheme('hav') as ThemeDef;

  it('checks ink on the fill, the mark on every surface and distinctness', () => {
    const report = evaluateTheme(hav, 'light');
    const names = report.pairs.map((p) => `${p.fg} on ${p.bg}`);
    for (const n of [
      'done-fill-ink on done-fill',
      'done-mark on paper',
      'done-mark on surface',
      'done-mark on surface-tint',
    ])
      expect(names).toContain(n);
    expect(report.failures).toEqual([]);
    const fill = report.pairs.find((p) => p.fg === 'done-fill-ink');
    expect(fill?.ratio).toBeGreaterThanOrEqual(4.5);
    expect(report.reported.map((r) => `${r.a}/${r.b}`)).toEqual(
      expect.arrayContaining(['done-fill/rutat done', 'done-mark/rutat done']),
    );
    expect(
      report.reported.find((r) => r.a === 'done-fill')?.deltaE,
    ).toBeGreaterThanOrEqual(15);
  });

  it('fails a fill whose text is too weak or a mark that is too pale', () => {
    const weak = structuredClone(hav);
    weak.tokens.light['done-fill-ink'] = '#a0a0a0';
    expect(
      evaluateTheme(weak, 'light').failures.some((f) =>
        f.startsWith('done-fill-ink on done-fill'),
      ),
    ).toBe(true);
    const pale = structuredClone(hav);
    pale.tokens.light['done-mark'] = '#f0a090';
    expect(
      evaluateTheme(pale, 'light').failures.some((f) =>
        f.startsWith('done-mark on'),
      ),
    ).toBe(true);
  });

  it('leaves the other themes and Hav dark without a fill', () => {
    for (const t of themes) {
      expect(t.tokens.dark['done-fill']).toBeUndefined();
      if (t.id !== 'hav') expect(t.tokens.light['done-fill']).toBeUndefined();
    }
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
