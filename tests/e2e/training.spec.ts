import { expect, test } from '@playwright/test';
import {
  addExercise,
  completeSets,
  keepFirstExercises,
  quickStart,
} from './flow';
import { FRESH_STATE } from './state';

// Covers onboarding or training setup, so it starts from a first visit.
test.use({ storageState: FRESH_STATE });

test('regular training setup starts directly and ends in the summary, with no check-ins', {
  tag: '@smoke',
}, async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  await page.getByRole('button', { name: /Jag förstår/ }).click();

  await expect(
    page.getByRole('heading', { name: 'Vad vill du träna?' }),
  ).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Huvudmeny' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Bli starkare', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Vad tränar du med?' }),
  ).toBeVisible();
  await expect(
    page.getByRole('checkbox', { name: 'Stabil stol' }),
  ).toBeChecked();
  await page.getByRole('button', { name: 'Nästa', exact: true }).click();
  await expect(
    page.getByRole('radio', { name: /Ny eller på väg tillbaka/ }),
  ).toBeChecked();
  await page.getByRole('button', { name: 'Nästa', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Hela kroppen' })).toBeChecked();
  await page
    .getByRole('button', { name: 'Visa mitt pass', exact: true })
    .click();
  await page.getByRole('heading', { name: 'Pass A', exact: true }).waitFor();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Pass A' })).toBeVisible();

  await expect(page.getByLabel('Set', { exact: true })).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Anpassa passet', exact: true })
    .click();
  await keepFirstExercises(page);
  await page.getByLabel('Set', { exact: true }).fill('1');
  await page.locator('ol').getByRole('link').first().click();
  await page.getByRole('button', { name: 'Tillbaka', exact: true }).click();
  await expect(page.getByLabel('Set', { exact: true })).toHaveValue('1');
  await page.getByRole('button', { name: 'Börja passet', exact: true }).click();

  await expect(page).toHaveURL(/#\/session\/[^/]+$/);
  await expect(page.getByRole('radio', { name: 'Redo att träna' })).toHaveCount(
    0,
  );
  await expect(page.locator('[data-step]')).toBeVisible();
  await completeSets(page);
  await page.getByRole('button', { name: 'Lagom', exact: true }).click();

  await expect(
    page.getByRole('heading', { name: /Pass A klart/ }),
  ).toBeVisible();
  expect(page.url()).not.toMatch(/kansla/);
  await page.getByRole('button', { name: 'Avsluta pass', exact: true }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(
    page.getByRole('link', { name: 'Visa nästa pass', exact: true }),
  ).toHaveAttribute('href', /^#\/traning\/B(\?fokus=[a-z]+)?$/);
  await expect(
    page.getByRole('button', { name: 'Byt inriktning' }),
  ).toBeHidden();
});

test('general direction has no check-ins; "Det gör ont" marks only that exercise for that session', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Jag förstår/ }).click();
  await quickStart(page, { goal: 'general' });
  await page
    .getByRole('button', { name: 'Anpassa passet', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Pass A', exact: true }),
  ).toBeVisible();
  await keepFirstExercises(page);
  await page.getByLabel('Set', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Börja passet', exact: true }).click();
  // Ordinary training starts directly: no questionnaire, no rehab symptom report.
  await expect(page).toHaveURL(/#\/session\//);
  await expect(page.getByRole('radio', { name: 'Redo att träna' })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole('button', { name: 'Rapportera smärta eller besvär' }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Det gör ont', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Det gör ont', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'Vid skarp smärta, svullnad eller om en led låser sig: avbryt och kontakta vården (1177).',
    ),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Fortsätt ändå' }).click();
  await completeSets(page);
  await page.getByRole('button', { name: 'Lätt', exact: true }).click();
  await expect(page.getByRole('heading', { name: /klart/ })).toBeVisible();
  expect(page.url()).not.toMatch(/kansla/);
  await page.getByRole('button', { name: 'Avsluta pass', exact: true }).click();
  await expect(page).toHaveURL(/#\/$/);
  await page.reload();
  const saved = await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('stomme');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('sessions');
          const req = tx.objectStore('sessions').getAll();
          req.onsuccess = () => resolve(req.result);
          tx.oncomplete = () => db.close();
        };
      }),
  );
  expect(saved).toEqual([
    expect.objectContaining({
      programId: 'general',
      status: 'completed',
      checkins: {},
      feedback: {
        'goblet-chair-squat': { effort: 'easy', hurt: true },
      },
    }),
  ]);
});

test('rehab uses explicitly entered dose and selected left side through reload', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Jag förstår/ }).click();
  await quickStart(page, { goal: 'custom' });
  await expect(
    page.getByRole('heading', { name: 'Mitt rehabpass', exact: true }),
  ).toBeVisible();
  await addExercise(page, 'straight-leg-raise');
  await expect(page.getByLabel('Set', { exact: true })).toHaveValue('');
  await page.getByLabel('Set', { exact: true }).fill('1');
  await page.getByLabel('Repetitioner per sida', { exact: true }).fill('3');
  await page.getByLabel('Arbetande sida').selectOption('left');
  await expect(
    page.getByRole('button', { name: 'Börja passet', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Börja passet', exact: true }).click();
  await page.getByRole('radio', { name: 'Redo att träna' }).check();
  await page.getByRole('radio', { name: 'Nej, inga besvär' }).check();
  await page.getByRole('button', { name: 'Spara och fortsätt' }).click();
  await expect(
    page.getByRole('button', { name: 'Klar set', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText('Vänster ben rör sig', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Sedan: byt till vänster/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Klar set', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Hur ansträngande var övningen?' }),
  ).toBeVisible();
});

test('knee rehab saves a reusable AAOS selection and connects actual sets to history', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  await page.getByRole('button', { name: /Jag förstår/ }).click();
  await quickStart(page, { goal: 'knee', side: 'left' });
  await page
    .getByRole('button', { name: 'Anpassa passet', exact: true })
    .click();
  await page
    .getByText('Välj övningar från AAOS · 12 övningar', { exact: true })
    .click();
  const curl = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name: /E29.*Stående lårcurl/ }) });
  await expect(curl).toContainText('Tekniknivå 1/3');
  const calf = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name: /E08.*Enbens tåhävning/ }) });
  await expect(calf).toContainText('Tekniknivå 2/3');
  await curl.screenshot({
    path: test.info().outputPath('knee-curl-difficulty.png'),
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await curl.screenshot({
    path: test.info().outputPath('knee-curl-difficulty-desktop.png'),
  });
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(
    page.getByRole('button', { name: 'Lägg till E38', exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'E31 tillagd', exact: true }),
  ).toBeDisabled();
  await page
    .getByText('Välj övningar från AAOS · 12 övningar', { exact: true })
    .click();
  const rows = page.locator('ol > li > button[aria-expanded]');
  await expect(rows).toHaveCount(6);
  const others = rows.filter({ hasNotText: 'Rakt benlyft' });
  while (await others.count()) {
    await others.first().click();
    await page.getByRole('button', { name: /^Ta bort / }).click();
  }
  await rows.first().click();
  await expect(page.getByLabel('Set', { exact: true })).toHaveValue('3');
  await expect(
    page.getByRole('combobox', { name: 'Arbetande sida', exact: true }),
  ).toHaveValue('left');
  await page.getByLabel('Set', { exact: true }).fill('1');
  await page.getByLabel('Repetitioner per sida', { exact: true }).fill('3');
  await page
    .getByRole('button', { name: 'Spara rehabprogram', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText(
    'Rehabprogrammet är sparat',
  );
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await page
    .getByRole('button', { name: 'Anpassa passet', exact: true })
    .click();
  await page.locator('ol > li > button[aria-expanded]').first().click();
  await expect(page.getByLabel('Set', { exact: true })).toHaveValue('1');
  await expect(
    page.getByLabel('Repetitioner per sida', { exact: true }),
  ).toHaveValue('3');
  await page.getByRole('button', { name: 'Börja passet', exact: true }).click();
  await page.getByRole('radio', { name: 'Redo att träna' }).check();
  await page.getByRole('radio', { name: 'Nej, inga besvär' }).check();
  await page.getByRole('button', { name: 'Spara och fortsätt' }).click();
  await page.getByRole('button', { name: 'Klar set', exact: true }).click();
  await page.getByRole('button', { name: 'Lätt', exact: true }).click();
  await page.getByRole('radio', { name: 'Bra', exact: true }).check();
  await page.getByRole('radio', { name: 'Nej, inga besvär' }).check();
  await page.getByRole('button', { name: 'Spara och fortsätt' }).click();
  await page.getByRole('heading', { name: /Pass A klart/ }).waitFor();
  await page.goto('/#/historik');
  await page.getByText('Filtrera', { exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Träningsinriktning', exact: true })
    .selectOption('knee');
  await expect(page.getByRole('status')).toHaveText('1 pass visas');
  await page
    .getByRole('region', { name: 'Alla pass' })
    .getByRole('link')
    .first()
    .click();
  await expect(
    page.getByRole('region', { name: 'Känsla och besvär' }),
  ).toContainText('Svar saknas');
  await expect(page.getByText('3 rep.', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Smärta i högerknäet' }),
  ).toHaveCount(0);
  await page.getByRole('link', { name: 'Jämför tidigare pass' }).click();
  await expect(
    page.getByRole('combobox', { name: 'Arbetande sida', exact: true }),
  ).toHaveValue('left');
  await expect(page.getByText(/Set 1: 3 rep/)).toBeVisible();
});
