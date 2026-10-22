// Installs the Lefthook git hooks on `npm install`. It must never fail the
// install: no-op in CI, with LEFTHOOK=0 at install time, outside a git checkout, or when dev dependencies are
// not installed (`npm ci --omit=dev`). Plain Node so it needs no dev tools.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

try {
  const bin = join(
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'lefthook.cmd' : 'lefthook',
  );
  if (
    !process.env.CI &&
    process.env.LEFTHOOK !== '0' &&
    existsSync('.git') &&
    existsSync(bin)
  ) {
    const result = spawnSync(bin, ['install'], {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    if (result.status !== 0)
      console.warn('lefthook install failed; continuing without git hooks.');
  }
} catch (error) {
  console.warn(`Skipping git hooks: ${error}`);
}
