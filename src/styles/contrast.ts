/**
 * Pure colour maths and the theme contrast gate. No DOM, no React.
 * WCAG 2 contrast ratios, CIEDE2000 colour difference, and evaluateTheme(),
 * which checks one theme in one scheme (used by themes.test.ts and
 * scripts/contrast.ts).
 */
import {
  type Scheme,
  type ThemeDef,
  TOKEN_NAMES,
  type TokenName,
} from './themes/types';

/** '#rrggbb' to sRGB channels in 0..1. */
export function hexToRgb(hex: string): [number, number, number] {
  const c = [1, 3, 5].map(
    (i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255,
  );
  return [c[0] as number, c[1] as number, c[2] as number];
}

const toLinear = (v: number): number =>
  v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(toLinear) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, always >= 1. */
export function contrastRatio(a: string, b: string): number {
  const hi = Math.max(luminance(a), luminance(b));
  const lo = Math.min(luminance(a), luminance(b));
  return (hi + 0.05) / (lo + 0.05);
}

export type Lab = [number, number, number];

/** sRGB hex to CIELAB (D65). */
export function lab(hex: string): Lab {
  const [r, g, b] = hexToRgb(hex).map(toLinear) as [number, number, number];
  const x = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = 0.0193339 * r + 0.119192 * g + 0.9503041 * b;
  const f = (t: number): number =>
    t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116;
  const fx = f(x / 0.95047);
  const fy = f(y);
  const fz = f(z / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** CIEDE2000 between two CIELAB colours (kL = kC = kH = 1). */
export function deltaE2000Lab([L1, a1, b1]: Lab, [L2, a2, b2]: Lab): number {
  const rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const hue = (b: number, a: number): number => {
    if (b === 0 && a === 0) return 0;
    const v = Math.atan2(b, a) / rad;
    return v < 0 ? v + 360 : v;
  };
  const h1p = hue(b1, a1p);
  const h2p = hue(b2, a2p);
  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * rad) / 2);
  const Lbp = (L1 + L2) / 2;
  const Cbp = (C1p + C2p) / 2;
  let hbp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) > 180)
      hbp = h1p + h2p < 360 ? (hbp + 360) / 2 : (hbp - 360) / 2;
    else hbp /= 2;
  }
  const T =
    1 -
    0.17 * Math.cos((hbp - 30) * rad) +
    0.24 * Math.cos(2 * hbp * rad) +
    0.32 * Math.cos((3 * hbp + 6) * rad) -
    0.2 * Math.cos((4 * hbp - 63) * rad);
  const dTheta = 30 * Math.exp(-(((hbp - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lbp - 50) ** 2) / Math.sqrt(20 + (Lbp - 50) ** 2);
  const Sc = 1 + 0.045 * Cbp;
  const Sh = 1 + 0.015 * Cbp * T;
  const Rt = -Math.sin(2 * dTheta * rad) * Rc;
  return Math.sqrt(
    (dLp / Sl) ** 2 +
      (dCp / Sc) ** 2 +
      (dHp / Sh) ** 2 +
      Rt * (dCp / Sc) * (dHp / Sh),
  );
}

/** CIEDE2000 between two '#rrggbb' colours. */
export function deltaE2000(a: string, b: string): number {
  return deltaE2000Lab(lab(a), lab(b));
}

// ---------------------------------------------------------------- theme gate

export interface PairResult {
  fg: string;
  bg: string;
  kind: 'text' | 'ui';
  min: number;
  ratio: number;
  ok: boolean;
}

export interface DistinctResult {
  a: TokenName;
  b: TokenName;
  deltaE: number;
  ok: boolean;
}

export interface ThemeReport {
  missing: string[];
  pairs: PairResult[];
  distinct: DistinctResult[];
  /** Informational colour differences (see REPORTED_PAIRS); never failures. */
  reported: DistinctResult[];
  failures: string[];
}

export const MIN_DELTA_E = 20;
export const UI_MIN = 3;

/** Colour pairs that must stay distinguishable (CIEDE2000 >= MIN_DELTA_E). */
export const DISTINCT_PAIRS: readonly [TokenName, TokenName][] = [
  ['done', 'care'],
  ['done', 'accent'],
  ['care', 'accent'],
  ['accent', 'ink'],
  ['accent', 'equipment'],
  ['ink', 'equipment'],
];

/** Reported, not gating: care and the primary action may share a hue (Rutat: both graphite). */
export const REPORTED_PAIRS: readonly [TokenName, TokenName][] = [
  ['care', 'action'],
];

type PairSpec = [fg: string, bg: string, kind: 'text' | 'ui'];

function pairSpecs(theme: ThemeDef, scheme: Scheme): PairSpec[] {
  const bgs = ['paper', 'surface', ...(theme.grid ? ['line'] : [])];
  const specs: PairSpec[] = [];
  for (const fg of ['ink', 'ink-soft', 'done', 'accent', 'care', 'info'])
    for (const bg of bgs) specs.push([fg, bg, 'text']);
  specs.push(
    ['ink', 'surface-tint', 'text'],
    ['ink-soft', 'surface-tint', 'text'],
    ['action-ink', 'action', 'text'],
    ['today-ink', 'today', 'text'],
    ['upcoming-ink', 'upcoming', 'text'],
    ['care-ink', 'care', 'text'],
    ['paper', 'accent', 'text'], // text selection
  );
  // Coloured text on the tinted bar, lead card and selected rows.
  for (const fg of ['done', 'accent', 'care', 'info'])
    specs.push([fg, 'surface-tint', 'text']);
  for (const fg of ['edge', 'equipment'])
    for (const bg of bgs) specs.push([fg, bg, 'ui']);
  specs.push(
    ['action', 'paper', 'ui'],
    ['action', 'surface', 'ui'],
    ['action', 'surface-tint', 'ui'], // nav active indicator, button edge
    ['done', 'paper', 'ui'], // pencil tick
    ['done', 'surface-tint', 'ui'], // tick on the tinted bar / day square
    ['accent', 'paper', 'ui'], // working side, muscle map
    ['accent', 'surface', 'ui'],
  );
  const focus = theme.focus[scheme];
  if (focus.kind === 'double') {
    specs.push(
      ['focusCompanion', 'paper', 'ui'],
      ['focusCompanion', 'surface', 'ui'],
      ['focus', 'focusCompanion', 'ui'],
      ['focus', 'action', 'ui'],
    );
  } else {
    specs.push(
      ['focus', 'paper', 'ui'],
      ['focus', 'surface', 'ui'],
      ['focus', 'surface-tint', 'ui'],
    );
  }
  return specs;
}

/** Checks one theme in one scheme: token completeness, contrast, distinctness. */
export function evaluateTheme(theme: ThemeDef, scheme: Scheme): ThemeReport {
  const tokens: Record<string, string | undefined> = {
    ...theme.tokens[scheme],
  };
  const focus = theme.focus[scheme];
  if (focus.kind === 'double') tokens.focusCompanion = focus.companion;
  const missing = TOKEN_NAMES.filter((name) => !tokens[name]).map(String);
  const pairs: PairResult[] = [];
  const distinct: DistinctResult[] = [];
  const reported: DistinctResult[] = [];
  if (missing.length === 0) {
    for (const [fg, bg, kind] of pairSpecs(theme, scheme)) {
      const min = kind === 'text' ? theme.textMin : UI_MIN;
      const ratio = contrastRatio(tokens[fg] as string, tokens[bg] as string);
      pairs.push({ fg, bg, kind, min, ratio, ok: ratio >= min - 1e-9 });
    }
    for (const [a, b] of DISTINCT_PAIRS) {
      const deltaE = deltaE2000(tokens[a] as string, tokens[b] as string);
      distinct.push({ a, b, deltaE, ok: deltaE >= MIN_DELTA_E });
    }
    for (const [a, b] of REPORTED_PAIRS) {
      const deltaE = deltaE2000(tokens[a] as string, tokens[b] as string);
      reported.push({ a, b, deltaE, ok: deltaE >= MIN_DELTA_E });
    }
  }
  const failures = [
    ...missing.map((name) => `missing token ${name}`),
    ...pairs
      .filter((p) => !p.ok)
      .map((p) => `${p.fg} on ${p.bg} ${p.ratio.toFixed(2)} < ${p.min}`),
    ...distinct
      .filter((d) => !d.ok)
      .map(
        (d) => `deltaE ${d.a}/${d.b} ${d.deltaE.toFixed(1)} < ${MIN_DELTA_E}`,
      ),
  ];
  return { missing, pairs, distinct, reported, failures };
}
