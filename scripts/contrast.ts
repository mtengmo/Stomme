/**
 * Contrast audit: reads the colour tokens from src/styles/index.css and prints
 * WCAG ratios for every foreground/background pair in light and dark.
 * Usage: npx tsx scripts/contrast.ts   (exit code 1 on any failure)
 */
import { readFileSync } from 'node:fs';

const css = readFileSync('src/styles/index.css', 'utf8');
const rootBlock = /:root\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
const darkBlock =
  /prefers-color-scheme:\s*dark\)\s*\{\s*:root\s*\{([^}]*)\}/.exec(css)?.[1] ??
  '';

function tokens(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    out[m[1] as string] = m[2] as string;
  }
  return out;
}
const light = tokens(rootBlock);
const dark = { ...light, ...tokens(darkBlock) };

function lum(hex: string): number {
  const c = [1, 3, 5].map((i) => {
    const v = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return (
    0.2126 * (c[0] as number) +
    0.7152 * (c[1] as number) +
    0.0722 * (c[2] as number)
  );
}
function ratio(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return ((x as number) + 0.05) / ((y as number) + 0.05);
}

/** [foreground, background, minimum, what]; text 4.5, large text and UI 3. */
const pairs: [string, string, number, string][] = [
  ['ink', 'paper', 4.5, 'body text'],
  ['ink', 'line', 4.5, 'body text over a grid line'],
  ['ink-soft', 'paper', 4.5, 'secondary text'],
  ['ink-soft', 'line', 4.5, 'secondary text over a grid line'],
  ['red', 'paper', 4.5, 'done chip text and stop dashes'],
  ['red', 'line', 4.5, 'done chip text over a grid line'],
  ['blue', 'paper', 4.5, 'link and "Nästa pass" text'],
  ['blue', 'line', 4.5, 'link text over a grid line'],
  ['paper', 'ink', 4.5, 'primary button text'],
  ['paper', 'blue', 4.5, 'text selection'],
  ['amber-ink', 'amber', 4.5, 'today chip and day square'],
  ['upcoming-ink', 'upcoming', 4.5, 'upcoming chip'],
  ['edge', 'paper', 3, 'outlines of receding items (UI)'],
  ['edge', 'line', 3, 'outlines over a grid line (UI)'],
  ['ink', 'paper', 3, 'heavy outlines and tick (UI)'],
  ['blue', 'paper', 3, 'focus ring (UI)'],
  ['red', 'paper', 3, 'pencil tick (UI)'],
];

let failed = 0;
for (const [name, set] of [
  ['light', light],
  ['dark', dark],
] as const) {
  console.log(`\n${name}`);
  for (const [fg, bg, min, what] of pairs) {
    const a = set[fg];
    const b = set[bg];
    if (!a || !b) {
      console.log(`  MISSING token ${fg} or ${bg}`);
      failed++;
      continue;
    }
    const r = ratio(a, b);
    const ok = r >= min;
    if (!ok) failed++;
    console.log(
      `  ${ok ? 'PASS' : 'FAIL'} ${r.toFixed(2).padStart(5)}:1 (min ${min})  ${fg} on ${bg}  ${what}`,
    );
  }
}
console.log(failed ? `\n${failed} failing pair(s)` : '\nAll pairs pass');
process.exit(failed ? 1 : 0);
