import { execFileSync } from 'node:child_process';

/** Commit count advances automatically; never create a version-only commit. */
export function buildVersion(base: string): {
  version: string;
  commit: string;
} {
  const git = (...args: string[]) =>
    execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  try {
    if (git('rev-parse', '--is-shallow-repository') === 'true') {
      throw new Error(
        'Build versions require full Git history (fetch-depth: 0).',
      );
    }
    const count = Number(git('rev-list', '--count', 'HEAD'));
    if (!Number.isSafeInteger(count) || count < 1)
      throw new Error('Invalid commit count');
    const family = base.split('.').slice(0, 2).join('.');
    const dirty =
      git('status', '--porcelain', '--untracked-files=normal') !== '';
    return {
      version: `${family}.${count}${dirty ? '-dev' : ''}`,
      commit: git('rev-parse', '--short=7', 'HEAD'),
    };
  } catch (error) {
    if (process.env.CI) throw error;
    return { version: `${base}-local`, commit: 'local' };
  }
}
