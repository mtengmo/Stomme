/**
 * Runs `npm run build` only when dist/ is missing or older than the sources
 * that feed it. CI never uses this (it always builds): see `e2e:ci`.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const entry = join(root, 'dist', 'index.html');
const inputs = [
  'src',
  'public',
  'index.html',
  'vite.config.ts',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'pwa-assets.config.ts',
];

/** Tests do not change the bundle, so they do not make dist stale. */
const ignored = (path: string) =>
  /\.test\.tsx?$/.test(path) || /[/]src[/]test[/]/.test(path);

function newest(path: string): number {
  if (!existsSync(path)) return 0;
  const stat = statSync(path);
  if (!stat.isDirectory()) return ignored(path) ? 0 : stat.mtimeMs;
  let latest = 0;
  for (const name of readdirSync(path))
    latest = Math.max(latest, newest(join(path, name)));
  return latest;
}

const built = existsSync(entry) ? statSync(entry).mtimeMs : 0;
const changed = Math.max(...inputs.map((input) => newest(join(root, input))));

if (built > changed) {
  console.log('dist/ is up to date; skipping build.');
} else {
  console.log(
    built === 0 ? 'dist/ is missing; building.' : 'Sources changed; building.',
  );
  const result = spawnSync('npm', ['run', 'build'], {
    stdio: 'inherit',
    shell: true,
  });
  process.exit(result.status ?? 1);
}
