/**
 * Pixel comparison of two screenshot folders (same file names).
 * Usage: npx tsx scripts/shots-compare.ts <dirA> <dirB> [noiseDir]   (exit 1 on any diff)
 * noiseDir is a second capture of the same build as dirA: pixels where dirA and
 * noiseDir already differ are non-deterministic and are ignored (and counted).
 */
import { readdirSync } from 'node:fs';
import sharp from 'sharp';

const [a, b, noise] = process.argv.slice(2);
if (!a || !b) throw new Error('usage: shots-compare.ts <dirA> <dirB>');
let failed = 0;
let total = 0;
for (const name of readdirSync(a).filter((f) => f.endsWith('.png'))) {
  const x = await sharp(`${a}/${name}`)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const y = await sharp(`${b}/${name}`)
    .raw()
    .toBuffer({ resolveWithObject: true });
  total++;
  if (x.info.width !== y.info.width || x.info.height !== y.info.height) {
    console.log(`DIFF ${name}: size differs`);
    failed++;
    continue;
  }
  const ch = x.info.channels;
  const n = noise
    ? await sharp(`${noise}/${name}`)
        .raw()
        .toBuffer({ resolveWithObject: true })
    : undefined;
  let ignored = 0;
  let diff = 0;
  let minX = x.info.width;
  let minY = x.info.height;
  let maxX = -1;
  let maxY = -1;
  for (let i = 0; i < x.data.length; i += ch) {
    let d = false;
    for (let c = 0; c < ch; c++) if (x.data[i + c] !== y.data[i + c]) d = true;
    if (d && n) {
      let flaky = false;
      for (let c = 0; c < ch; c++)
        if (x.data[i + c] !== n.data[i + c]) flaky = true;
      if (flaky) {
        ignored++;
        d = false;
      }
    }
    if (d) {
      diff++;
      const p = i / ch;
      const px = p % x.info.width;
      const py = Math.floor(p / x.info.width);
      minX = Math.min(minX, px);
      maxX = Math.max(maxX, px);
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py);
    }
  }
  const pixels = x.info.width * x.info.height;
  if (diff) {
    failed++;
    console.log(
      `DIFF ${name}: ${diff} of ${pixels} px (${ignored} ignored), region x ${minX}-${maxX}, y ${minY}-${maxY}`,
    );
  } else
    console.log(
      `same ${name}: 0 of ${pixels} px differ (${ignored} non-deterministic px ignored)`,
    );
}
console.log(failed ? `${failed} of ${total} differ` : `All ${total} identical`);
process.exit(failed ? 1 : 0);
