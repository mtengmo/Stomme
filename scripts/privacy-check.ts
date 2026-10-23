/**
 * Privacy check for a public repository. Reads a local, gitignored denylist
 * (`.privacy-denylist`, one term per line; `#` starts a comment) and searches
 * every tracked file and every commit message, case-insensitively. Exits 1 and
 * prints each hit when a term is found. Without a denylist it prints a notice
 * and exits 0, so CI without the local file is not blocked.
 * Usage: npm run privacy:check   (PRIVACY_DENYLIST=<path> overrides the file)
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const listPath = process.env.PRIVACY_DENYLIST ?? '.privacy-denylist';
if (!existsSync(listPath)) {
  console.log(`No ${listPath}: nothing to check.`);
  process.exit(0);
}
const terms = readFileSync(listPath, 'utf8')
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'));

const git = (...args: string[]) =>
  execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });

const hits: string[] = [];
const scan = (where: string, text: string) => {
  const lower = text.toLowerCase();
  for (const term of terms) {
    const needle = term.toLowerCase();
    let at = lower.indexOf(needle);
    while (at !== -1) {
      const line = text.slice(0, at).split('\n').length;
      hits.push(`${where}:${line}: matches a denylist entry`);
      at = lower.indexOf(needle, at + needle.length);
    }
  }
};

for (const file of git('ls-files', '-z').split('\0').filter(Boolean)) {
  if (!existsSync(file)) continue;
  const buffer = readFileSync(file);
  if (buffer.includes(0)) continue;
  scan(file, buffer.toString('utf8'));
}
for (const entry of git('log', '--format=%H%x01%an <%ae>%n%B%x02')
  .split('\x02')
  .filter((e) => e.trim())) {
  const [hash = '', rest = ''] = entry.trim().split('\x01');
  scan(`commit ${hash.slice(0, 10)}`, rest);
}
if (hits.length) {
  console.error(`Privacy check failed (${hits.length} hit(s)):`);
  console.error(hits.join('\n'));
  process.exit(1);
}
console.log(`Privacy check passed (${terms.length} term(s)).`);
