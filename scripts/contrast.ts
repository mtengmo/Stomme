/**
 * Contrast audit: prints the WCAG ratios and colour differences for every
 * registered theme in light and dark. The logic lives in src/styles/contrast.ts
 * (also run by `npm test` through src/styles/themes.test.ts).
 * Usage: npx tsx scripts/contrast.ts   (exit code 1 on any failure)
 */
import { evaluateTheme } from '../src/styles/contrast';
import { SCHEMES, themes } from '../src/styles/themes/registry';

let failed = 0;
for (const theme of themes) {
  for (const scheme of SCHEMES) {
    const report = evaluateTheme(theme, scheme);
    failed += report.failures.length;
    console.log(`\n${theme.id} ${scheme} (text >= ${theme.textMin}:1)`);
    for (const m of report.missing) console.log(`  MISSING token ${m}`);
    for (const p of report.pairs) {
      console.log(
        `  ${p.ok ? 'PASS' : 'FAIL'} ${p.ratio.toFixed(2).padStart(5)}:1 (min ${p.min})  ${p.fg} on ${p.bg}  ${p.kind}`,
      );
    }
    for (const d of report.distinct) {
      console.log(
        `  ${d.ok ? 'PASS' : 'FAIL'} dE ${d.deltaE.toFixed(1).padStart(5)} (min 20)  ${d.a} / ${d.b}`,
      );
    }
  }
}
console.log(failed ? `\n${failed} failing check(s)` : '\nAll checks pass');
process.exit(failed ? 1 : 0);
