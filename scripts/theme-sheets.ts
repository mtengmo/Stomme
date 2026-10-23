/**
 * Labelled contact sheets from the theme captures.
 *   sheet-<theme>.png      6 screens x light/dark (week, set, rest, pain, stop, muscle-map)
 *   sheet-all-light.png / sheet-all-dark.png   4 themes (rows) x week, set, stop
 * Usage: npx tsx scripts/theme-sheets.ts <dir>   (after theme-shots and theme-review)
 */
import { existsSync } from 'node:fs';
import sharp, { type OverlayOptions } from 'sharp';
import { SCHEMES, themes } from '../src/styles/themes/registry';

const dir = process.argv[2];
if (!dir) throw new Error('usage: theme-sheets.ts <dir>');

const W = 270;
const H = 600;
const LABEL = 26;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const label = (text: string, width: number) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${LABEL}"><rect width="100%" height="100%" fill="#222"/><text x="8" y="18" font-family="Arial" font-size="14" fill="#fff">${esc(text)}</text></svg>`,
  );

async function tile(file: string, text: string) {
  if (!existsSync(file)) throw new Error(`missing capture ${file}`);
  const image = await sharp(file)
    .resize(W, H, { fit: 'contain', background: '#777' })
    .toBuffer();
  return { image, text };
}

async function sheet(rows: { name: string; file: string }[][], path: string) {
  const cols = Math.max(...rows.map((r) => r.length));
  const composites: OverlayOptions[] = [];
  for (const [r, row] of rows.entries()) {
    for (const [c, cell] of row.entries()) {
      const { image, text } = await tile(cell.file, cell.name);
      const left = c * W;
      const top = r * (H + LABEL);
      composites.push({ input: label(text, W), left, top });
      composites.push({ input: image, left, top: top + LABEL });
    }
  }
  await sharp({
    create: {
      width: cols * W,
      height: rows.length * (H + LABEL),
      channels: 3,
      background: '#777',
    },
  })
    .composite(composites)
    .png()
    .toFile(path);
  console.log(path);
}

const six = ['week', 'set', 'rest', 'pain', 'stop', 'muscle-map'];
for (const theme of themes) {
  await sheet(
    SCHEMES.map((scheme) =>
      six.map((s) => ({
        name: `${theme.id} ${scheme} ${s}`,
        file: `${dir}/${theme.id}-${scheme}-${s}.png`,
      })),
    ),
    `${dir}/sheet-${theme.id}.png`,
  );
}
for (const scheme of SCHEMES) {
  await sheet(
    themes.map((theme) =>
      ['week', 'set', 'stop'].map((s) => ({
        name: `${theme.id} ${scheme} ${s}`,
        file: `${dir}/${theme.id}-${scheme}-${s}.png`,
      })),
    ),
    `${dir}/sheet-all-${scheme}.png`,
  );
}

// Review sheets for the picker, onboarding, week and focus close-ups.
async function grid(
  cells: { name: string; file: string }[],
  cols: number,
  tw: number,
  th: number,
  path: string,
) {
  const composites: OverlayOptions[] = [];
  for (const [i, cell] of cells.entries()) {
    const left = (i % cols) * tw;
    const top = Math.floor(i / cols) * (th + LABEL);
    const image = await sharp(cell.file)
      .resize(tw, th, { fit: 'contain', background: '#777' })
      .toBuffer();
    composites.push({ input: label(cell.name, tw), left, top });
    composites.push({ input: image, left, top: top + LABEL });
  }
  await sharp({
    create: {
      width: cols * tw,
      height: Math.ceil(cells.length / cols) * (th + LABEL),
      channels: 3,
      background: '#777',
    },
  })
    .composite(composites)
    .png()
    .toFile(path);
  console.log(path);
}

const combos = themes.flatMap((t) => SCHEMES.map((s) => `${t.id}-${s}`));
await grid(
  combos.map((c) => ({
    name: `picker ${c}`,
    file: `${dir}/picker-set-${c}.png`,
  })),
  4,
  270,
  600,
  `${dir}/sheet-picker.png`,
);
await grid(
  combos.flatMap((c) =>
    (['collapsed', 'expanded'] as const).map((k) => ({
      name: `onboarding ${k} ${c}`,
      file: `${dir}/picker-onb-${c}-${k}.png`,
    })),
  ),
  4,
  270,
  600,
  `${dir}/sheet-onboarding.png`,
);
await grid(
  combos.flatMap((c) =>
    ['week', 'week-klar'].map((k) => ({
      name: `${k} ${c}`,
      file: `${dir}/${c}-${k}.png`,
    })),
  ),
  4,
  270,
  975,
  `${dir}/sheet-week.png`,
);
await grid(
  combos.flatMap((c) =>
    ['button', 'radio', 'nav', 'link'].map((k) => ({
      name: `focus ${k} ${c}`,
      file: `${dir}/focus-${c}-${k}.png`,
    })),
  ),
  4,
  330,
  130,
  `${dir}/sheet-focus.png`,
);
await grid(
  combos.flatMap((c) =>
    ['pain-ja', 'pain-warn'].map((k) => ({
      name: `${k} ${c}`,
      file: `${dir}/${k}-${c}.png`,
    })),
  ),
  4,
  270,
  600,
  `${dir}/sheet-pain.png`,
);
await grid(
  combos.map((c) => ({
    name: `week-800 ${c}`,
    file: `${dir}/${c}-week-800.png`,
  })),
  4,
  270,
  600,
  `${dir}/sheet-week-800.png`,
);
