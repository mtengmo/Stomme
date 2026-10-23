import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const dir = mkdtempSync(join(tmpdir(), 'privacy-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function run(list: string | null) {
  const path = join(dir, 'denylist');
  if (list !== null) writeFileSync(path, list);
  const missing = join(dir, 'does-not-exist');
  return spawnSync(
    process.execPath,
    ['node_modules/tsx/dist/cli.mjs', 'scripts/privacy-check.ts'],
    {
      encoding: 'utf8',
      env: { ...process.env, PRIVACY_DENYLIST: list === null ? missing : path },
    },
  );
}

describe('privacy check', () => {
  it('passes when no denylist exists', () => {
    const result = run(null);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('nothing to check');
  });
  it('passes when no term occurs', () => {
    const result = run('# comment\nqzxjvkwpfm-not-present\n');
    expect(result.status).toBe(0);
  });
  it('fails and prints the hit, case-insensitively, without echoing the term', () => {
    const tracked = execFileSync('git', ['ls-files', 'package.json'], {
      encoding: 'utf8',
    }).trim();
    expect(tracked).toBe('package.json');
    const result = run('PRIVACY:CHECK\n');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('package.json:');
    expect(result.stderr).not.toContain('PRIVACY:CHECK');
  });
});
