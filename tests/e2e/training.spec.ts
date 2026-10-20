import { expect, test } from '@playwright/test';

test('training setup keeps readiness, symptoms, effort, and after check-in separate', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  await page.getByRole('button', { name: /Jag förstår/ }).click();

  await expect(
    page.getByRole('heading', { name: 'Vad vill du träna?' }),
  ).toBeVisible();
  await page.getByRole('radio', { name: 'Allmän styrka' }).check();
  await page.getByRole('button', { name: 'Spara träningsinriktning' }).click();
  await page.reload();
  await page.getByRole('link', { name: 'Planera pass A' }).click();
  await expect(page.getByRole('heading', { name: 'Pass A' })).toBeVisible();

  const removeButtons = page.getByRole('button', { name: /^Ta bort / });
  while ((await removeButtons.count()) > 1) await removeButtons.last().click();
  await page.getByLabel('Set', { exact: true }).fill('1');
  await page.locator('ol').getByRole('link').first().click();
  await page.getByRole('button', { name: 'Tillbaka', exact: true }).click();
  await expect(page.getByLabel('Set', { exact: true })).toHaveValue('1');
  await page.getByRole('button', { name: 'Starta pass', exact: true }).click();

  await expect(page).toHaveURL(/#\/kansla\/[^/]+\/before$/);
  await expect(
    page.getByRole('heading', { name: 'Hur känns kroppen?' }),
  ).toBeVisible();
  await page.getByRole('radio', { name: 'Redo att träna' }).check();
  const saveBefore = page.getByRole('button', {
    name: 'Spara och fortsätt',
  });
  await expect(saveBefore).toBeDisabled();
  await page.getByRole('radio', { name: 'Nej, inga besvär' }).check();
  await saveBefore.click();

  await expect(page).toHaveURL(/#\/session\//);
  await expect(page.locator('[data-step]')).toBeVisible();
  await page.getByRole('button', { name: 'Klar set', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Hur kändes det?' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Lagom', exact: true }).click();

  await expect(page).toHaveURL(/#\/kansla\/[^/]+\/after$/);
  await expect(
    page.getByRole('heading', { name: 'Hur kändes passet?' }),
  ).toBeVisible();
  await page.getByRole('radio', { name: 'Bra' }).check();
  const saveAfter = page.getByRole('button', {
    name: 'Spara och fortsätt',
  });
  await expect(saveAfter).toBeDisabled();
  await page.getByRole('radio', { name: 'Nej, inga besvär' }).check();
  await saveAfter.click();
  await expect(
    page.getByRole('heading', { name: /Pass A klart/ }),
  ).toBeVisible();
});

test('running direction uses body-wide check-ins and keeps effort separate from symptoms', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Jag förstår/ }).click();
  await page
    .getByRole('radio', { name: 'Styrka för löpning', exact: true })
    .check();
  await page.getByRole('button', { name: 'Spara träningsinriktning' }).click();
  await page.getByRole('link', { name: 'Planera pass A' }).click();
  await expect(
    page.getByRole('heading', { name: 'Pass A', exact: true }),
  ).toBeVisible();
  while ((await page.getByRole('button', { name: /^Ta bort / }).count()) > 1)
    await page
      .getByRole('button', { name: /^Ta bort / })
      .last()
      .click();
  await page.getByLabel('Set', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Starta pass', exact: true }).click();
  await page.getByRole('radio', { name: 'Redo att träna' }).check();
  await page.getByRole('radio', { name: 'Nej, inga besvär' }).check();
  await page.getByRole('button', { name: 'Spara och fortsätt' }).click();
  await page
    .getByRole('button', { name: 'Rapportera smärta eller besvär' })
    .click();
  await page.getByLabel('Var känns besvären?').selectOption('Axel');
  await page
    .getByRole('combobox', { name: 'Sida', exact: true })
    .selectOption('left');
  await page.getByRole('button', { name: 'Spara besvär', exact: true }).click();
  await page.getByRole('button', { name: 'Klar set', exact: true }).click();
  await page.getByRole('button', { name: 'Lätt', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Hur kändes passet?' }),
  ).toBeVisible();
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
  expect(saved).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        programId: 'running',
        feedback: expect.objectContaining({
          'goblet-chair-squat': expect.objectContaining({
            effort: 'easy',
            symptoms: expect.objectContaining({ area: 'Axel', side: 'left' }),
          }),
        }),
      }),
    ]),
  );
});

test('rehab uses explicitly entered dose and selected left side through reload', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Jag förstår/ }).click();
  await page
    .getByRole('radio', { name: 'Mitt rehabprogram', exact: true })
    .check();
  await page.getByRole('button', { name: 'Spara träningsinriktning' }).click();
  await page.getByRole('link', { name: 'Planera mitt rehabpass' }).click();
  await expect(
    page.getByRole('heading', { name: 'Mitt rehabpass', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Lägg till övning', exact: true })
    .selectOption('straight-leg-raise');
  await page.getByRole('button', { name: 'Lägg till i passet' }).click();
  await expect(page.getByLabel('Set', { exact: true })).toHaveValue('');
  await page.getByLabel('Set', { exact: true }).fill('1');
  await page.getByLabel('Repetitioner per sida', { exact: true }).fill('3');
  await page.getByLabel('Arbetande sida').selectOption('left');
  await expect(
    page.getByRole('button', { name: 'Starta pass', exact: true }),
  ).toBeDisabled();
  await page.getByRole('checkbox', { name: /Jag har kontrollerat/ }).check();
  await page.getByRole('button', { name: 'Starta pass', exact: true }).click();
  await page.getByRole('radio', { name: 'Redo att träna' }).check();
  await page.getByRole('radio', { name: 'Nej, inga besvär' }).check();
  await page.getByRole('button', { name: 'Spara och fortsätt' }).click();
  await expect(
    page.getByRole('button', { name: 'Klar set', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText('Vänster ben', { exact: true })).toBeVisible();
  await expect(page.getByText(/Sedan: byt till vänster/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Klar set', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Hur kändes det?' }),
  ).toBeVisible();
});

test('knee rehab saves a reusable AAOS selection and connects actual sets to history', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  await page.getByRole('button', { name: /Jag förstår/ }).click();
  await page
    .getByRole('radio', { name: 'Mitt rehabprogram', exact: true })
    .check();
  await page
    .getByRole('combobox', { name: 'Rehabinriktning', exact: true })
    .selectOption('knee');
  await page
    .getByRole('combobox', {
      name: 'Vilket knä eller vilken sida?',
      exact: true,
    })
    .selectOption('left');
  await page.getByRole('button', { name: 'Spara träningsinriktning' }).click();
  await page.getByRole('link', { name: 'Planera mitt rehabpass' }).click();
  await page
    .getByText('Välj övningar från AAOS · 12 övningar', { exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Lägg till E38', exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'E31 tillagd', exact: true }),
  ).toBeDisabled();
  await page
    .getByText('Välj övningar från AAOS · 12 övningar', { exact: true })
    .click();
  await expect(page.getByRole('button', { name: /^Ta bort / })).toHaveCount(6);
  const remove = page
    .getByRole('button', { name: /^Ta bort / })
    .filter({ hasNotText: 'Rakt benlyft' });
  while (await remove.count()) await remove.first().click();
  await expect(page.getByLabel('Set', { exact: true })).toHaveValue('3');
  await expect(
    page.getByRole('combobox', { name: 'Arbetande sida', exact: true }),
  ).toHaveValue('left');
  await page.getByLabel('Set', { exact: true }).fill('1');
  await page.getByLabel('Repetitioner per sida', { exact: true }).fill('3');
  await page.getByRole('checkbox', { name: /Jag har kontrollerat/ }).check();
  await page
    .getByRole('button', { name: 'Spara rehabprogram', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText(
    'Rehabprogrammet är sparat',
  );
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await expect(page.getByLabel('Set', { exact: true })).toHaveValue('1');
  await expect(
    page.getByLabel('Repetitioner per sida', { exact: true }),
  ).toHaveValue('3');
  await page.getByRole('checkbox', { name: /Jag har kontrollerat/ }).check();
  await page.getByRole('button', { name: 'Starta pass', exact: true }).click();
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
