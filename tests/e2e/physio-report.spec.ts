import { resolve } from 'node:path';
import { expect, type Page, test } from '@playwright/test';

test.use({ timezoneId: 'Europe/Stockholm' });

function localDateOffset(offset: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function stamp(date: string, hour = 12): string {
  const at = new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`);
  return at.toISOString();
}

function planned(exerciseId: string, patch: Record<string, unknown> = {}) {
  return {
    exerciseId,
    sets: 2,
    target: 10,
    loadIndex: 1,
    weightKg: 8,
    restSec: 60,
    reason: 'first_time',
    variantId: 'dumbbell',
    sides: ['right', 'left'],
    ...patch,
  };
}

function session(
  id: string,
  offset: number,
  patch: Record<string, unknown> = {},
) {
  const date = localDateOffset(offset);
  return {
    id,
    templateId: 'A',
    date,
    startedAt: stamp(date, 8),
    finishedAt: stamp(date, 9),
    status: 'completed',
    programWeek: 1,
    plan: [],
    feedback: {},
    ...patch,
  };
}

function makeFixture() {
  const general = session('report-general', 1, {
    programId: 'general',
    plan: [planned('supported-row')],
    feedback: {
      'supported-row': { effort: 'easy', symptoms: null },
    },
    checkins: {
      before: {
        feeling: 'ready',
        symptoms: null,
        recordedAt: stamp(localDateOffset(1), 7),
      },
      after: {
        feeling: 'good',
        symptoms: null,
        recordedAt: stamp(localDateOffset(1), 9),
      },
      // Deliberately no dayAfter entry: absence must remain distinct from null.
    },
  });
  const knee = session('report-knee', 3, {
    programId: 'rehab',
    rehabFocus: 'knee',
    templateId: 'B',
    plan: [
      planned('half-squat', {
        target: 4,
        weightKg: 0,
        variantId: 'bodyweight',
        sides: ['both'],
      }),
    ],
    checkins: {
      before: {
        feeling: 'ready',
        symptoms: null,
        recordedAt: stamp(localDateOffset(3), 7),
      },
      after: {
        feeling: 'mixed',
        symptoms: { area: 'Knä', side: 'left', score: 3 },
        recordedAt: stamp(localDateOffset(3), 9),
      },
    },
  });
  const legacy = session('report-legacy', 5, {
    templateId: 'B',
    status: 'aborted',
    abortReason: 'pain_stop',
    plan: [],
    feedback: {},
    note: 'Anteckning från ett äldre pass.',
  });
  const short = session('report-short', 7, {
    programId: 'general',
    workoutMode: 'short',
    plan: [
      planned('goblet-chair-squat', {
        sets: 1,
        target: 6,
        weightKg: 0,
        variantId: 'bodyweight',
        sides: undefined,
      }),
    ],
    fullPlan: [planned('goblet-chair-squat'), planned('push-up')],
  });
  const custom = session('report-custom', 9, {
    programId: 'rehab',
    rehabFocus: 'custom',
    customWorkoutId: 'custom-report-1',
    customWorkoutName: 'Mitt eget pass',
    status: 'aborted',
    abortReason: 'user',
    plan: [
      planned('dead-bug', { target: 8, weightKg: 0, variantId: 'bodyweight' }),
    ],
    feedback: { 'dead-bug': { skipped: true } },
  });
  const running = session('report-running', 0, {
    programId: 'running',
    status: 'in_progress',
    startedAt: new Date().toISOString(),
    finishedAt: undefined,
    plan: [
      planned('step-up', {
        target: 8,
        weightKg: 0,
        variantId: 'bodyweight',
        sides: ['right', 'left'],
      }),
    ],
  });
  const outside = session('report-outside-range', 28, {
    programId: 'general',
    plan: [planned('push-up')],
  });
  const sessionMap = [general, knee, legacy, short, custom, running, outside];
  const logs = [
    {
      id: 'actual-right',
      sessionId: general.id,
      exerciseId: 'supported-row',
      setNumber: 1,
      side: 'right',
      amount: 7,
      loadIndex: 2,
      weightKg: 6,
      variantId: 'old-discrete-setting',
      endedEarly: true,
      counting: 'manual',
      loggedAt: stamp(general.date, 8),
    },
    {
      id: 'actual-left',
      sessionId: general.id,
      exerciseId: 'supported-row',
      setNumber: 1,
      side: 'left',
      amount: 5,
      loadIndex: 1,
      weightKg: 8,
      variantId: 'dumbbell',
      loggedAt: stamp(general.date, 8),
    },
    {
      id: 'logged-only',
      sessionId: general.id,
      exerciseId: 'step-up',
      setNumber: 1,
      side: 'both',
      amount: 3,
      loadIndex: 0,
      weightKg: 0,
      variantId: 'bodyweight',
      loggedAt: stamp(general.date, 8),
    },
    {
      id: 'knee-actual',
      sessionId: knee.id,
      exerciseId: 'half-squat',
      setNumber: 1,
      side: 'both',
      amount: 3,
      loadIndex: 0,
      weightKg: 0,
      variantId: 'bodyweight',
      loggedAt: stamp(knee.date, 8),
    },
    {
      id: 'legacy-actual',
      sessionId: legacy.id,
      exerciseId: 'plank',
      setNumber: 1,
      side: 'right',
      amount: 18,
      loadIndex: 0,
      weightKg: 0,
      loggedAt: stamp(legacy.date, 8),
    },
    {
      id: 'short-actual',
      sessionId: short.id,
      exerciseId: 'goblet-chair-squat',
      setNumber: 1,
      side: 'both',
      amount: 6,
      loadIndex: 0,
      weightKg: 0,
      variantId: 'bodyweight',
      loggedAt: stamp(short.date, 8),
    },
    {
      id: 'custom-actual',
      sessionId: custom.id,
      exerciseId: 'dead-bug',
      setNumber: 1,
      side: 'left',
      amount: 4,
      loadIndex: 0,
      weightKg: 0,
      variantId: 'bodyweight',
      loggedAt: stamp(custom.date, 8),
    },
    {
      id: 'running-actual',
      sessionId: running.id,
      exerciseId: 'step-up',
      setNumber: 1,
      side: 'left',
      amount: 5,
      loadIndex: 0,
      weightKg: 0,
      variantId: 'bodyweight',
      loggedAt: stamp(running.date, 8),
    },
    {
      id: 'outside-actual',
      sessionId: outside.id,
      exerciseId: 'push-up',
      setNumber: 1,
      side: 'both',
      amount: 10,
      loadIndex: 0,
      weightKg: 0,
      loggedAt: stamp(outside.date, 8),
    },
  ];
  const painLogs = [
    {
      id: 'legacy-before',
      sessionId: legacy.id,
      date: legacy.date,
      timing: 'before',
      score: 5,
      location: 'right_knee',
      redFlags: { sharp: true, swelling: true, locking: false },
      createdAt: stamp(legacy.date, 7),
    },
    {
      id: 'legacy-day-after',
      sessionId: legacy.id,
      date: legacy.date,
      timing: 'dayAfter',
      score: 0,
      location: 'right_knee',
      redFlags: { sharp: false, swelling: false, locking: true },
      createdAt: stamp(legacy.date, 9),
    },
  ];
  return { sessions: sessionMap, logs, painLogs };
}

async function seed(page: Page) {
  const fixture = makeFixture();
  await page.evaluate(async (data) => {
    const request = indexedDB.open('stomme');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = db.transaction(['sessions', 'setLogs', 'painLogs'], 'readwrite');
    for (const value of data.sessions) tx.objectStore('sessions').put(value);
    for (const value of data.logs) tx.objectStore('setLogs').put(value);
    for (const value of data.painLogs) tx.objectStore('painLogs').put(value);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, fixture);
}

async function openReport(page: Page) {
  await page.goto('/');
  await seed(page);
  await page.goto('/#/historik');
  await page
    .getByRole('link', {
      name: 'Sammanställning till fysioterapeuten',
      exact: true,
    })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Till fysioterapeuten', exact: true }),
  ).toBeVisible();
}

for (const width of [320, 360, 412]) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`physiotherapist report (${width}px, ${colorScheme})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await page.addInitScript(() => {
        (window as Window & { __printCalls?: number }).__printCalls = 0;
        window.print = () => {
          const browserWindow = window as Window & { __printCalls?: number };
          browserWindow.__printCalls = (browserWindow.__printCalls ?? 0) + 1;
        };
      });
      await openReport(page);

      const articles = page.locator('[data-report-session]');
      await expect(articles).toHaveCount(6);
      await expect(
        page.locator('[data-report-session="report-outside-range"]'),
      ).toHaveCount(0);
      await expect(
        page.locator('[data-report-session="report-running"]'),
      ).toContainText('Pågående pass');
      await expect(
        page.locator('[data-report-session="report-custom"]'),
      ).toContainText('Mitt eget pass');
      await expect(
        page.locator('[data-report-session="report-custom"]'),
      ).toContainText('Eget pass');
      await expect(
        page.locator('[data-report-session="report-legacy"]'),
      ).toContainText('Stoppat på grund av besvär');

      const general = page.locator('[data-report-session="report-general"]');
      await expect(general).toContainText(
        'Planerat: 2 set × 10 rep. per vald sida',
      );
      await expect(general).toContainText(
        'Set 1 · höger: 7 rep. · 6 kg totalt',
      );
      await expect(general).toContainText(
        'Set 1 · vänster: 5 rep. · 8 kg totalt',
      );
      await expect(general).toContainText(
        'Okänd utrustningsvariant (old-discrete-setting)',
      );
      await expect(general).toContainText('Avslutat i förtid');
      await expect(general.getByText(/Automatisk räkning/)).toHaveCount(0);
      await expect(general).toContainText('Manuell räkning');
      await expect(
        general.locator('[data-report-exercise="step-up"]'),
      ).toContainText('Planerad dosering saknas.');
      await expect(general).toContainText(
        'Före passet: Redo att träna · Inga besvär',
      );
      await expect(general).toContainText('Dagen efter: Svar saknas');

      const shortArticle = page.locator('[data-report-session="report-short"]');
      await expect(shortArticle).toContainText('Kortpass');
      await expect(
        shortArticle.locator('[data-report-exercise="goblet-chair-squat"]'),
      ).toContainText('Set 1 · båda: 6 rep.');
      await expect(
        shortArticle.locator('[data-report-exercise="push-up"]'),
      ).toHaveCount(0);

      const legacyArticle = page.locator(
        '[data-report-session="report-legacy"]',
      );
      await expect(legacyArticle).toContainText('Äldre knäsmärtskattningar');
      await expect(legacyArticle).toContainText(
        '5/10 · Skarp smärta · Svullnad',
      );
      await expect(legacyArticle).toContainText('0/10 · Låsning');
      await expect(legacyArticle).toContainText(
        'Anteckning från ett äldre pass.',
      );

      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: test
          .info()
          .outputPath(`physio-report-${width}-${colorScheme}.png`),
        fullPage: true,
      });

      const from = page.getByLabel('Från datum', { exact: true });
      const to = page.getByLabel('Till datum', { exact: true });
      const programme = page.getByRole('combobox', {
        name: 'Träningsinriktning',
        exact: true,
      });
      await expect(from).toHaveValue(localDateOffset(27));
      await expect(to).toHaveValue(localDateOffset(0));
      await expect(programme).toHaveValue('all');
      const exactDate = localDateOffset(1);
      await from.fill(exactDate);
      await to.fill(exactDate);
      await expect(articles).toHaveCount(1);
      await expect(articles.first()).toHaveAttribute(
        'data-report-session',
        'report-general',
      );

      await programme.selectOption('legacy');
      await expect(articles).toHaveCount(0);
      await from.fill(localDateOffset(5));
      await to.fill(localDateOffset(5));
      await expect(articles).toHaveCount(1);
      await expect(articles.first()).toHaveAttribute(
        'data-report-session',
        'report-legacy',
      );

      await from.fill(localDateOffset(20));
      await to.fill(localDateOffset(20));
      await expect(articles).toHaveCount(0);
      await expect(page.getByRole('status')).toContainText(
        'Inga registrerade pass under perioden.',
      );
      await expect(
        page.getByRole('button', { name: 'Skriv ut eller spara PDF' }),
      ).toBeDisabled();

      await from.fill(localDateOffset(1));
      await to.fill(localDateOffset(2));
      await expect(page.getByRole('alert')).toContainText(
        'Välj ett giltigt datumintervall.',
      );
      await expect(
        page.getByRole('button', { name: 'Skriv ut eller spara PDF' }),
      ).toBeDisabled();

      await from.fill(localDateOffset(1));
      await to.fill(localDateOffset(1));
      await from.fill(localDateOffset(27));
      await to.fill(localDateOffset(0));
      await programme.selectOption('all');
      await expect(articles).toHaveCount(6);
      await page
        .getByRole('button', { name: 'Skriv ut eller spara PDF' })
        .click();
      await expect
        .poll(() =>
          page.evaluate(
            () => (window as Window & { __printCalls?: number }).__printCalls,
          ),
        )
        .toBe(1);

      await page.emulateMedia({ media: 'print' });
      await expect(page.locator('nav')).toBeHidden();
      await expect(
        page.getByRole('region', { name: 'Välj rapportens innehåll' }),
      ).toBeHidden();
      // Colours may still be transitioning right after the media switch.
      await expect
        .poll(() =>
          page.evaluate(() => ({
            background: getComputedStyle(document.body).backgroundColor,
            color: getComputedStyle(document.body).color,
            foreground: (() => {
              const report = document.querySelector('[data-print-report]');
              return report ? getComputedStyle(report).color : '';
            })(),
          })),
        )
        .toEqual({
          background: 'rgb(255, 255, 255)',
          color: 'rgb(0, 0, 0)',
          foreground: 'rgb(0, 0, 0)',
        });
      if (width === 320 && colorScheme === 'light') {
        await page.pdf({
          path: resolve('.impeccable/review/backlog-4/report-print.pdf'),
          format: 'A4',
          printBackground: true,
        });
      }
    });
  }
}
