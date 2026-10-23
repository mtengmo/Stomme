/**
 * Greyscale check for care screens: for every theme and scheme, prints the CIE L*
 * difference (what a greyscale view keeps) between --care and --done, --care and
 * the paper, and the stop-screen frame and its inside, measured in the screenshot.
 * Also writes <theme>-<scheme>-stop-grey.png next to the captures.
 * Usage: npx tsx scripts/theme-grey.ts <dir with theme-shots output>
 */
import { existsSync } from 'node:fs';
import sharp from 'sharp';
import { lab } from '../src/styles/contrast';
import { SCHEMES, themes } from '../src/styles/themes/registry';

const dir = process.argv[2];
if (!dir) throw new Error('usage: theme-grey.ts <dir>');

const hex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
const L = (c: string) => lab(c)[0];

console.log(
  'theme/scheme              dL*care-done  dL*care-paper  dL*frame-inside(screenshot)',
);
let weak = 0;
for (const theme of themes) {
  for (const scheme of SCHEMES) {
    const t = theme.tokens[scheme];
    const careDone = Math.abs(L(t.care) - L(t.done));
    const carePaper = Math.abs(L(t.care) - L(t.paper));
    let frame = Number.NaN;
    const file = `${dir}/${theme.id}-${scheme}-stop.png`;
    if (existsSync(file)) {
      const { data, info } = await sharp(file)
        .raw()
        .toBuffer({ resolveWithObject: true });
      const px = (x: number, y: number) => {
        const i = (y * info.width + x) * info.channels;
        return hex(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0);
      };
      frame = Math.abs(L(px(2, 400)) - L(px(14, 400)));
      await sharp(file)
        .greyscale()
        .toFile(`${dir}/${theme.id}-${scheme}-stop-grey.png`);
    }
    const flag = carePaper < 40 || frame < 40 ? '  <-- check' : '';
    if (flag) weak++;
    console.log(
      `${`${theme.id} ${scheme}`.padEnd(26)}${careDone.toFixed(1).padStart(8)}${carePaper.toFixed(1).padStart(14)}${frame.toFixed(1).padStart(18)}${flag}`,
    );
  }
}
console.log(
  weak
    ? `\n${weak} row(s) to review`
    : '\nAll care frames separate in greyscale',
);
