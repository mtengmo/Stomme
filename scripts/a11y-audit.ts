/**
 * Structural a11y audit over every screen (DEV server, SYNTHETIC data):
 * targets under 48 px, text under 16 px, unnamed controls, focus ring on Tab,
 * reduced-motion (animations/transitions), dialog keyboard (Escape, focus trap).
 * Usage: npx tsx scripts/a11y-audit.ts
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { type Browser, chromium, type Page } from '@playwright/test';

// Each run owns its server; a stale worktree server must not pass an audit.
const reservation = createServer();
await new Promise<void>((resolve, reject) => {
  reservation.once('error', reject);
  reservation.listen(0, resolve);
});
const address = reservation.address();
if (!address || typeof address === 'string') throw new Error('No audit port');
const PORT = address.port;
await new Promise<void>((resolve, reject) =>
  reservation.close((error) => (error ? reject(error) : resolve())),
);
async function up(url: string) {
  for (let i = 0; i < 60; i++) {
    if (srv.exitCode !== null)
      throw new Error(`Audit server exited: ${srv.exitCode}`);
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('no server');
}

const srv = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort'],
  {
    stdio: 'ignore',
  },
);
const findings: string[] = [];
const browsers = new Set<Browser>();
let screens = 0;

async function audit(page: Page, name: string) {
  screens++;
  const res = await page.evaluate(() => {
    const out: string[] = [];
    const label = (el: Element) =>
      `${el.tagName.toLowerCase()}${el.getAttribute('role') ? `[${el.getAttribute('role')}]` : ''} "${(
        el.getAttribute('aria-label') ||
        (el as HTMLElement).innerText ||
        ''
      )
        .trim()
        .slice(0, 30)}"`;
    const visible = (el: Element) => {
      const closed = el.closest('details:not([open])');
      if (closed && el !== closed.querySelector(':scope > summary'))
        return false;
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return (
        r.width > 1 &&
        r.height > 1 &&
        s.visibility !== 'hidden' &&
        s.display !== 'none'
      );
    };
    const sel =
      'a[href],button,input:not([type=hidden]),select,textarea,[role=radio],[role=switch],[role=button],summary';
    for (const el of document.querySelectorAll(sel)) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 47.5 || r.height < 47.5) {
        // radios/switches are often visually-hidden inputs inside a labelled 48px row
        const host = el.closest('label') ?? el;
        const hr = host.getBoundingClientRect();
        if (hr.width >= 47.5 && hr.height >= 47.5) continue;
        out.push(
          `target ${Math.round(r.width)}x${Math.round(r.height)} ${label(el)}`,
        );
      }
      const name =
        el.getAttribute('aria-label') ||
        el.getAttribute('aria-labelledby') ||
        (el as HTMLElement).innerText?.trim() ||
        el.closest('label')?.textContent?.trim();
      if (!name) out.push(`unnamed control ${label(el)}`);
    }
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    const seen = new Set<Element>();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || seen.has(el) || !n.textContent?.trim() || !visible(el))
        continue;
      seen.add(el);
      if (el.closest('svg')) continue;
      const fs = Number.parseFloat(getComputedStyle(el).fontSize);
      if (fs < 15.99)
        out.push(`text ${fs}px "${n.textContent.trim().slice(0, 30)}"`);
    }
    return out;
  });
  for (const r of res) findings.push(`${name}: ${r}`);

  // keyboard focus ring on the first tab stops
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    const ring = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      return {
        t: `${el.tagName.toLowerCase()} "${((el as HTMLElement).innerText || el.getAttribute('aria-label') || '').trim().slice(0, 25)}"`,
        ok: s.outlineStyle !== 'none' && Number.parseFloat(s.outlineWidth) >= 2,
        // visually hidden inputs delegate the ring to their label
        hidden: el.getBoundingClientRect().width < 2,
      };
    });
    if (ring && !ring.ok && !ring.hidden)
      findings.push(`${name}: no focus ring on ${ring.t}`);
  }
}

async function theme(scheme: 'light' | 'dark') {
  const browser = await chromium.launch();
  browsers.add(browser);
  const ctx = await browser.newContext({
    viewport: { width: 360, height: 800 },
    colorScheme: scheme,
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.addInitScript('window.__name = (f) => f');
  const base = `http://localhost:${PORT}`;
  const tag = (s: string) => `${scheme} ${s}`;
  await page.goto(base);
  await page.getByRole('heading', { name: /Välkommen/ }).waitFor();
  await audit(page, tag('onboarding'));
  await page.getByRole('button', { name: /Jag förstår/ }).click();
  await page.goto(`${base}/#/dev/demo`);
  await page
    .getByRole('button', { name: 'Fyll med syntetisk testdata' })
    .click();
  await page.getByText(/Fyllde med/).waitFor();
  for (const [name, hash, wait] of [
    ['week', '#/', /Vecka/],
    ['history', '#/historik', /Historik/],
    ['settings', '#/installningar', /Inställningar/],
    ['exercise card', '#/ovning/step-up', /Step/i],
  ] as const) {
    await page.goto(`${base}/${hash}`);
    await page.getByRole('heading', { name: wait }).first().waitFor();
    await page.waitForTimeout(300);
    await audit(page, tag(name));
  }
  await page.goto(`${base}/#/ovningar?muskel=core`);
  await page.getByRole('heading', { name: 'Övningar', exact: true }).waitFor();
  await audit(page, tag('filtered exercise library'));
  await page.goto(`${base}/#/ovning/dead-bug`);
  await page.getByRole('heading', { name: 'Dead bug', exact: true }).waitFor();
  await audit(page, tag('muscle movement overlay'));
  await page.getByRole('heading', { name: 'Så gör du', exact: true }).waitFor();
  await page.getByRole('heading', { name: 'Tränar främst' }).waitFor();
  await page.getByRole('heading', { name: 'Hjälper till' }).waitFor();
  await audit(page, tag('unified exercise guide'));
  await page.locator('summary').filter({ hasText: 'Visa muskelkarta' }).click();
  await audit(page, tag('front and back muscle map'));
  await page.goto(`${base}/#/granska?ovning=E03`);
  await page.getByRole('heading', { name: /^E03 ·/ }).waitFor();
  await audit(page, tag('numbered exercise review'));
  await page
    .getByRole('button', { name: 'Dölj muskler i rörelsen', exact: true })
    .click();
  await audit(page, tag('exercise review muscle frames'));
  await page.goto(`${base}/#/historik`);
  await page.getByRole('link', { name: /Pass/ }).first().click();
  await page.getByRole('heading', { name: /Pass [AB]/, level: 1 }).waitFor();
  await audit(page, tag('session detail'));
  await page.getByRole('button', { name: 'Radera passet' }).click();
  await audit(page, tag('session detail delete confirm'));

  // settings confirmations
  await page.goto(`${base}/#/installningar`);
  await page.getByRole('button', { name: 'Radera all data' }).click();
  await audit(page, tag('delete confirm'));
  await page.keyboard.press('Escape');
  await page.getByRole('heading', { name: 'Inställningar' }).waitFor();

  // fresh session flow: preview, pain, set, rest, effort, pain after, summary
  await page.goto(`${base}/#/pass/A`);
  await page.getByRole('heading', { name: 'Pass A' }).waitFor();
  await audit(page, tag('pass preview'));
  await page
    .getByRole('button', { name: 'Byt övning', exact: true })
    .first()
    .click();
  await audit(page, tag('exercise choices'));
  await page
    .getByRole('button', { name: 'Stäng övningsval', exact: true })
    .click();
  await page.getByRole('button', { name: 'Starta pass' }).click();
  await page.getByRole('heading', { name: /Hur känns/ }).waitFor();
  await audit(page, tag('pain screen'));
  await page.getByRole('radio', { name: /^0(,|$)/ }).check({ force: true });
  await page.getByRole('button', { name: 'Spara' }).click();
  await page.locator('[data-step]').waitFor();
  await audit(page, tag('session set'));
  // exercise sheet: open, Escape closes, focus returns, focus trapped
  await page.getByRole('button', { name: 'Hur gör man?' }).click();
  await page.getByRole('dialog').waitFor();
  await audit(page, tag('exercise sheet'));
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    const inside = await page.evaluate(
      () => !!document.activeElement?.closest('[role=dialog]'),
    );
    if (!inside) {
      findings.push(
        `${tag('exercise sheet')}: focus escaped the dialog after ${i + 1} Tab presses`,
      );
      break;
    }
  }
  await page.keyboard.press('Escape');
  if ((await page.getByRole('dialog').count()) > 0) {
    findings.push(`${tag('exercise sheet')}: Escape does not close the dialog`);
  }
  await page.getByRole('button', { name: 'Klar set' }).click();
  await page.getByRole('button', { name: 'Hoppa över vila' }).waitFor();
  await audit(page, tag('rest'));
  await page.getByRole('button', { name: 'Hoppa över vila' }).click();
  // finish quickly: loop primary actions until the effort / summary screens
  const seen = new Set<string>();
  let completed = false;
  for (let g = 0; g < 80; g++) {
    const a = page
      .getByRole('button', {
        name: /^(Klar set|Hoppa över vila|Lagom|Spara)$/,
      })
      .first();
    await a.waitFor();
    const n = (await a.innerText()).trim();
    if (n === 'Lagom' && !seen.has('effort')) {
      seen.add('effort');
      await audit(page, tag('effort'));
    }
    if (n === 'Spara' && !seen.has('after')) {
      seen.add('after');
      await audit(page, tag('pain after'));
      await page.getByRole('radio', { name: /^0(,|$)/ }).check({ force: true });
    }
    if (n === 'Spara') {
      await a.click();
      // Saving the 'after' reading finishes the session and shows the summary.
      const home = page.getByRole('link', { name: 'Till veckan' });
      await home.waitFor();
      await audit(page, tag('summary'));
      await home.click();
      completed = true;
      break;
    }
    await a.click();
    await page.waitForTimeout(80);
  }
  if (!completed)
    throw new Error(`${scheme}: session did not reach its summary`);
  // stale open session on the week view
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('stomme');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('sessions', 'readwrite');
          const d = new Date(Date.now() - 3 * 86400000);
          const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          tx.objectStore('sessions').put({
            id: 'stale-1',
            templateId: 'B',
            date,
            startedAt: d.toISOString(),
            status: 'in_progress',
            programWeek: 1,
            plan: [],
            feedback: {},
          });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
  await page.reload();
  await page.getByText(/är inte avslutat/).waitFor();
  await audit(page, tag('stale session'));
  // stop screen
  await page.goto(`${base}/#/stopp/x`);
  await page.waitForTimeout(300);
  await audit(page, tag('stop screen'));
  // reduced motion: no running animations/long transitions on week view
  await page.goto(`${base}/#/`);
  await page.waitForTimeout(500);
  const anims = await page.evaluate(() => document.getAnimations().length);
  if (anims > 0)
    findings.push(
      `${tag('week')}: ${anims} running animation(s) under reduced motion`,
    );
  // error boundary: make the History route throw on render
  const p2 = await ctx.newPage();
  await p2.addInitScript('window.__name = (f) => f');
  await p2.route('**/features/history/History.tsx*', (r) =>
    r.fulfill({
      contentType: 'text/javascript',
      body: "export function History(){ throw new Error('demo'); }",
    }),
  );
  await p2.goto(`${base}/#/historik`);
  await p2.getByRole('heading', { name: 'Något gick fel' }).waitFor();
  await audit(p2, tag('error boundary'));
  // A separate fresh profile covers the programme flows without changing the
  // legacy synthetic sessions used above.
  const trainingContext = await browser.newContext({
    viewport: { width: 360, height: 800 },
    colorScheme: scheme,
    reducedMotion: 'reduce',
  });
  const training = await trainingContext.newPage();
  await training.addInitScript('window.__name = (f) => f');
  await training.goto(base);
  await training.getByRole('button', { name: /Jag förstår/ }).click();
  await training.getByRole('heading', { name: 'Vad vill du träna?' }).waitFor();
  await audit(training, tag('training setup'));
  await training
    .getByRole('radio', { name: 'Allmän styrka', exact: true })
    .check();
  await training
    .getByRole('button', { name: 'Spara träningsinriktning' })
    .click();
  await training.getByRole('link', { name: 'Planera pass A' }).waitFor();
  await audit(training, tag('training overview'));
  await training.getByRole('link', { name: 'Planera pass A' }).click();
  await training
    .getByRole('heading', { name: 'Pass A', exact: true })
    .waitFor();
  await audit(training, tag('general training preview'));
  while (
    (await training.getByRole('button', { name: /^Ta bort / }).count()) > 1
  )
    await training
      .getByRole('button', { name: /^Ta bort / })
      .last()
      .click();
  await training.getByLabel('Set', { exact: true }).fill('1');
  await training
    .getByRole('button', { name: 'Starta pass', exact: true })
    .click();
  await training.getByRole('heading', { name: 'Hur känns kroppen?' }).waitFor();
  await audit(training, tag('training readiness check'));
  await training.getByRole('radio', { name: 'Redo att träna' }).check();
  await training
    .getByRole('radio', { name: 'Ja, jag vill ange besvär' })
    .check();
  await audit(training, tag('training symptom fields'));
  await training.getByRole('radio', { name: 'Nej, inga besvär' }).check();
  await training.getByRole('button', { name: 'Spara och fortsätt' }).click();
  await training
    .getByRole('button', { name: 'Rapportera smärta eller besvär' })
    .waitFor();
  await audit(training, tag('general training set'));
  await training
    .getByRole('button', { name: 'Rapportera smärta eller besvär' })
    .click();
  await audit(training, tag('exercise symptom report'));
  await training.getByRole('button', { name: 'Avbryt rapport' }).click();
  await training.getByRole('button', { name: 'Klar set', exact: true }).click();
  await training.getByRole('button', { name: 'Lagom', exact: true }).click();
  await training.getByRole('heading', { name: 'Hur kändes passet?' }).waitFor();
  await audit(training, tag('training after check'));
  await training.getByRole('radio', { name: 'Bra', exact: true }).check();
  await training.getByRole('radio', { name: 'Nej, inga besvär' }).check();
  await training.getByRole('button', { name: 'Spara och fortsätt' }).click();
  await training
    .getByRole('heading', { name: 'Pass A klart', exact: true })
    .waitFor();
  await audit(training, tag('general training summary'));
  await training.goto(`${base}/#/historik`);
  await training
    .getByRole('heading', { name: 'Historik', exact: true })
    .waitFor();
  await audit(training, tag('new history overview and trends'));
  await training
    .getByRole('region', { name: 'Alla pass' })
    .getByRole('link')
    .first()
    .click();
  await training
    .getByRole('heading', { name: 'Känsla och besvär', exact: true })
    .waitFor();
  await audit(training, tag('new session history answers'));
  await training
    .getByRole('link', { name: 'Jämför tidigare pass' })
    .first()
    .click();
  await training
    .getByRole('combobox', { name: 'Utrustning', exact: true })
    .waitFor();
  await audit(training, tag('equipment and side exercise comparison'));
  await training.goto(`${base}/#/`);
  await training
    .getByRole('button', { name: 'Byt träningsinriktning' })
    .click();
  await training
    .getByRole('radio', { name: 'Mitt rehabprogram', exact: true })
    .check();
  await training
    .getByRole('combobox', { name: 'Rehabinriktning', exact: true })
    .selectOption('knee');
  await audit(training, tag('knee rehabilitation setup'));
  await training
    .getByRole('button', { name: 'Spara träningsinriktning' })
    .click();
  await training.getByRole('link', { name: 'Planera mitt rehabpass' }).click();
  await training
    .getByText('Välj övningar från AAOS · 12 övningar', { exact: true })
    .click();
  await audit(training, tag('AAOS exercise selection'));
  const removeKnee = training
    .getByRole('button', { name: /^Ta bort / })
    .filter({ hasNotText: 'Rakt benlyft' });
  while (await removeKnee.count()) await removeKnee.first().click();
  await training
    .getByText('Välj övningar från AAOS · 12 övningar', { exact: true })
    .click();
  await training.getByLabel('Set', { exact: true }).fill('1');
  await training.getByLabel('Repetitioner per sida', { exact: true }).fill('3');
  await training
    .getByRole('checkbox', { name: /Jag har kontrollerat/ })
    .check();
  await training
    .getByRole('button', { name: 'Spara rehabprogram', exact: true })
    .click();
  await audit(training, tag('saved knee programme editor'));
  await trainingContext.close();
  await browser.close();
  browsers.delete(browser);
}

try {
  await up(`http://localhost:${PORT}`);
  await theme('light');
  await theme('dark');
} finally {
  await Promise.all([...browsers].map((browser) => browser.close()));
  srv.kill();
}
const unique = [...new Set(findings)];
console.log(`${screens} screen audits (360x800, light+dark)`);
console.log(unique.length ? unique.join('\n') : 'No findings');
if (unique.length) process.exitCode = 1;
