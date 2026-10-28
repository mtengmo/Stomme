/**
 * Real installed-client upgrades on one origin, including the unmodified 0.1.74
 * bootstrap. Run: npx tsx scripts/test-upgrade.ts
 * Three production builds; intentionally separate from the normal smoke suite.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  type BrowserContext,
  chromium,
  expect,
  type Page,
} from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'test-results', 'pwa-upgrade');
await mkdir(output, { recursive: true });
const work = await mkdtemp(join(output, 'run-'));
const baseline = join(work, 'baseline');
await mkdir(baseline);
const archive = join(work, 'baseline.tar');
execFileSync(
  'git',
  ['archive', '96f2913', '--format=tar', `--output=${archive}`],
  { cwd: root },
);
// Git Bash's GNU tar treats drive letters as remote archive locations.
const tar =
  process.platform === 'win32'
    ? join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe')
    : 'tar';
execFileSync(tar, ['-xf', archive, '-C', baseline]);
const builds = {
  legacy: join(work, 'build-legacy'),
  A: join(work, 'build-A'),
  B: join(work, 'build-B'),
};
for (const [name, source] of [
  ['legacy', baseline],
  ['A', root],
  ['B', root],
] as const) {
  const config = join(work, `config-${name}.ts`);
  const dist = join(work, `build-${name}`);
  await writeFile(
    config,
    `import base from ${JSON.stringify(join(source, 'vite.config.ts').replaceAll('\\', '/'))};
export default {...base, root: ${JSON.stringify(source)}, define: {...base.define, 'import.meta.env.VITE_APP_COMMIT': ${JSON.stringify(JSON.stringify(`upgrade-${name}`))}}};`,
  );
  console.log(`Building ${name}…`);
  execFileSync(
    process.execPath,
    [
      join(root, 'node_modules/vite/bin/vite.js'),
      'build',
      '--config',
      config,
      '--outDir',
      dist,
    ],
    { cwd: source, stdio: 'inherit' },
  );
  builds[name] = dist;
}
assert.notEqual(
  await readFile(join(builds.A, 'sw.js'), 'utf8'),
  await readFile(join(builds.B, 'sw.js'), 'utf8'),
);

let current: keyof typeof builds = 'A';
let failWorker = false;
const mime: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(
    new URL(req.url ?? '/', 'http://localhost').pathname,
  );
  if (failWorker && pathname === '/sw.js') {
    res.writeHead(503);
    res.end();
    return;
  }
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (relative.includes('..')) {
    res.writeHead(400);
    res.end();
    return;
  }
  // Preserve old hashed assets exactly as a non-destructive deployment must.
  for (const build of [current, 'A', 'B', 'legacy'] as const) {
    const path = join(builds[build], relative);
    if (!(await stat(path).catch(() => null))?.isFile()) continue;
    res.writeHead(200, {
      'Content-Type': mime[extname(path)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    createReadStream(path).pipe(res);
    return;
  }
  res.writeHead(404);
  res.end();
});
await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
const address = server.address();
assert(address && typeof address !== 'string');
const origin = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ headless: true });
const contexts: BrowserContext[] = [];

async function seed(page: Page, includeTraining: boolean) {
  await page.evaluate(async (withTraining) => {
    const db = await new Promise<IDBDatabase>((done, reject) => {
      const request = indexedDB.open('stomme');
      request.onsuccess = () => done(request.result);
      request.onerror = () => reject(request.error);
    });
    // Recent timestamps: a session idle for 90 minutes is ended automatically.
    const now = Date.now();
    const stamp = (minutesAgo: number) =>
      new Date(now - minutesAgo * 60_000).toISOString();
    const d = new Date(now);
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const transaction = db.transaction(
      ['meta', 'sessions', 'setLogs', 'painLogs'],
      'readwrite',
    );
    transaction.objectStore('meta').put({
      key: 'onboarding',
      value: { acceptedAt: '2026-10-01T00:00:00Z' },
    });
    if (withTraining)
      transaction.objectStore('meta').put({
        key: 'training',
        value: {
          programId: 'running',
          equipment: ['bodyweight', 'dumbbell-2', 'chair'],
          experience: 'some',
        },
      });
    transaction.objectStore('sessions').put({
      id: 'upgrade-session',
      templateId: 'A',
      date: today,
      startedAt: stamp(2),
      status: 'in_progress',
      programWeek: 1,
      plan: [
        {
          exerciseId: 'goblet-chair-squat',
          sets: 2,
          target: 8,
          loadIndex: 0,
          weightKg: 0,
          restSec: 60,
          reason: 'week1_bodyweight',
        },
      ],
      feedback: {},
    });
    transaction.objectStore('setLogs').put({
      id: 'upgrade-set',
      sessionId: 'upgrade-session',
      exerciseId: 'goblet-chair-squat',
      setNumber: 1,
      side: 'both',
      amount: 8,
      weightKg: 0,
      loadIndex: 0,
      loggedAt: stamp(1),
    });
    transaction.objectStore('painLogs').put({
      id: 'upgrade-pain',
      sessionId: 'upgrade-session',
      timing: 'before',
      date: today,
      score: 0,
      location: 'right_knee',
      redFlags: { sharp: false, swelling: false, locking: false },
      createdAt: stamp(2),
    });
    await new Promise<void>((done, reject) => {
      transaction.oncomplete = () => done();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  }, includeTraining);
}
async function snapshot(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((done) => {
      const r = indexedDB.open('stomme');
      r.onsuccess = () => done(r.result);
    });
    const data: Record<string, unknown> = {};
    for (const name of ['sessions', 'setLogs', 'painLogs']) {
      data[name] = await new Promise<unknown>((done) => {
        const r = db.transaction(name).objectStore(name).getAll();
        r.onsuccess = () => done(r.result);
      });
    }
    db.close();
    return data;
  });
}
async function installed(build: keyof typeof builds = 'A') {
  current = build;
  failWorker = false;
  const context = await browser.newContext({
    serviceWorkers: 'allow',
    reducedMotion: 'reduce',
  });
  contexts.push(context);
  // tsx preserves function names with __name inside serialized callbacks.
  await context.addInitScript('window.__name = (fn) => fn;');
  const page = await context.newPage();
  await page.goto(origin);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await seed(page, build !== 'legacy');
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.goto(`${origin}/#/installningar`);
  await expect(page.getByText(`Bygge upgrade-${build}`)).toBeVisible();
  return { context, page, data: await snapshot(page) };
}
async function waiting(page: Page) {
  await page.waitForFunction(
    async () => !!(await navigator.serviceWorker.getRegistration())?.waiting,
  );
}
async function discover(page: Page) {
  await page.clock.install();
  await page.clock.fastForward(61_000);
  await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await waiting(page);
}
async function apply(page: Page) {
  await page.getByRole('button', { name: 'Uppdatera nu', exact: true }).click();
  await expect(page.getByText('Bygge upgrade-B')).toBeVisible();
}

try {
  {
    const { page, data } = await installed();
    current = 'B';
    await discover(page);
    await expect(
      page.getByText('Ny version finns', { exact: true }),
    ).toBeVisible();
    await apply(page);
    assert.deepEqual(await snapshot(page), data);
    console.log('PASS foreground A → B; saved workout unchanged');
  }
  {
    const { context, page, data } = await installed();
    current = 'B';
    await context.setOffline(true);
    await page.getByRole('button', { name: 'Sök efter uppdatering' }).click();
    await expect(
      page.getByText('Du är offline. Sök igen när du har internet.'),
    ).toBeVisible();
    await context.setOffline(false);
    failWorker = true;
    await page.getByRole('button', { name: 'Sök efter uppdatering' }).click();
    await expect(
      page.getByText('Uppdateringen kunde inte kontrolleras. Försök igen.'),
    ).toBeVisible();
    failWorker = false;
    await page.getByRole('button', { name: 'Sök efter uppdatering' }).click();
    await waiting(page);
    await apply(page);
    assert.deepEqual(await snapshot(page), data);
    console.log('PASS offline, failed server check, explicit retry');
  }
  {
    const { page, data } = await installed();
    await page.goto(`${origin}/#/session/upgrade-session`);
    await expect(page.locator('[data-step]')).toBeVisible();
    await page.evaluate(() => {
      (window as Window & { upgradeSentinel?: string }).upgradeSentinel =
        'unfinished';
    });
    current = 'B';
    await discover(page);
    await expect(
      page.getByText('Ny version finns', { exact: true }),
    ).toHaveCount(0);
    assert.equal(
      await page.evaluate(
        () => (window as Window & { upgradeSentinel?: string }).upgradeSentinel,
      ),
      'unfinished',
    );
    await page.goto(`${origin}/#/installningar`);
    await apply(page);
    assert.deepEqual(await snapshot(page), data);
    console.log(
      'PASS active workout waits for explicit safe-boundary application',
    );
  }
  {
    const { context, page, data } = await installed();
    current = 'B';
    await discover(page);
    const reopened = await context.newPage();
    await reopened.goto(`${origin}/#/installningar`);
    await page.close();
    await reopened
      .getByRole('button', { name: 'Sök efter uppdatering' })
      .click();
    await expect(
      reopened.getByRole('button', { name: 'Uppdatera nu', exact: true }),
    ).toBeVisible();
    await apply(reopened);
    assert.deepEqual(await snapshot(reopened), data);
    console.log('PASS reopened client discovers already-waiting worker');
  }
  {
    const { context, page, data } = await installed();
    const workout = await context.newPage();
    await workout.goto(`${origin}/#/session/upgrade-session`);
    await expect(workout.locator('[data-step]')).toBeVisible();
    await workout.evaluate(() => {
      (window as Window & { upgradeSentinel?: string }).upgradeSentinel =
        'unfinished';
      const input = document.createElement('input');
      input.id = 'unsaved-upgrade-value';
      input.value = '17';
      document.body.append(input);
    });
    current = 'B';
    await discover(page);
    await waiting(workout);
    await apply(page);
    await workout.waitForFunction(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      return !reg?.waiting && reg?.active?.state === 'activated';
    });
    assert.equal(
      await workout.evaluate(
        () => (window as Window & { upgradeSentinel?: string }).upgradeSentinel,
      ),
      'unfinished',
    );
    await expect(workout.locator('#unsaved-upgrade-value')).toHaveValue('17');
    await expect(
      workout.getByText('Ny version finns', { exact: true }),
    ).toHaveCount(0);
    // Use client routing: a full navigation would itself load B.
    await workout.evaluate(() => {
      window.location.hash = '#/installningar';
    });
    await expect(
      workout
        .getByText('Uppdateringen är klar. Ladda om när det passar.')
        .first(),
    ).toBeVisible();
    await apply(workout);
    assert.deepEqual(await snapshot(workout), data);
    console.log('PASS another tab cannot reload or discard active inputs');
  }
  {
    const { page, data } = await installed('legacy');
    current = 'B';
    // Data-preserving bootstrap for the old app: request its registered worker
    // update (equivalent to DevTools Application → Service Workers → Update).
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.ready).update();
    });
    await waiting(page);
    await page.getByRole('button', { name: 'Uppdatera', exact: true }).click();
    await expect(page.getByText('Bygge upgrade-B')).toBeVisible();
    assert.deepEqual(await snapshot(page), data);
    console.log('PASS unmodified 96f2913 installed-client bootstrap → B');
  }
} finally {
  await Promise.all(contexts.map((context) => context.close()));
  await browser.close();
  await new Promise<void>((done) => server.close(() => done()));
}
console.log(`Upgrade artifacts: ${work}`);
