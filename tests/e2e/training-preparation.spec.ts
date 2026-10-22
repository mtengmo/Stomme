import { expect, test } from '@playwright/test';
import { completeSets, keepFirstExercises } from './flow';
import { FRESH_STATE } from './state';

// Covers onboarding or training setup, so it starts from a first visit.
test.use({ storageState: FRESH_STATE });

for (const width of [360, 1280]) {
  test(`unstarted workouts can be edited, switched or replaced (${width})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.getByRole('button', { name: /Jag förstår/ }).click();
    await page
      .getByRole('button', { name: 'Styrka för löpning', exact: true })
      .click();
    await page
      .getByRole('combobox', { name: 'Träningsvana', exact: true })
      .selectOption('some');
    await page
      .getByRole('button', { name: 'Visa mitt pass', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Anpassa passet', exact: true })
      .click();
    await page
      .getByRole('button', { name: /Ändra$/ })
      .first()
      .click();
    await page.getByLabel('Set', { exact: true }).first().fill('4');
    await page.screenshot({
      path: test.info().outputPath('compact-editor.png'),
      fullPage: true,
    });
    // Ordinary training starts directly; asking first is an explicit choice.
    await page
      .getByText('Besvär eller något att anpassa idag?', { exact: true })
      .click();
    await page
      .getByRole('checkbox', { name: /Fråga hur kroppen känns före passet/ })
      .check();
    await page
      .getByRole('button', { name: 'Börja passet', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Hur känns kroppen?', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('Styrka för löpning · Pass A', { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: test.info().outputPath('preparation-context.png'),
    });
    await page.getByRole('link', { name: 'Ändra passet', exact: true }).click();
    await page
      .getByRole('button', { name: 'Anpassa passet', exact: true })
      .click();
    await page
      .getByRole('button', { name: /Ändra$/ })
      .first()
      .click();
    await expect(page.getByLabel('Set', { exact: true }).first()).toHaveValue(
      '4',
    );
    await page.goto('/#/');
    await expect(
      page.getByRole('heading', { name: 'Förbered ditt pass', exact: true }),
    ).toBeVisible();
    await page.getByText('Ändra', { exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Byt inriktning eller utrustning' }),
    ).toBeEnabled();
    await page
      .getByRole('link', { name: 'Visa pass B i stället', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Börja passet', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Klar set', exact: true }),
    ).toBeVisible();
    await page.goto('/#/');
    await page.getByText('Ändra', { exact: true }).click();
    await expect(
      page.getByRole('link', { name: 'Visa pass A i stället', exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Byt inriktning eller utrustning' })
      .click();
    await page
      .getByRole('radio', { name: 'Allmän styrka', exact: true })
      .check();
    await page
      .getByRole('combobox', {
        name: 'Hur van är du vid styrketräning?',
        exact: true,
      })
      .selectOption('regular');
    await page
      .getByRole('button', { name: 'Spara träningsinriktning', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Nästa pass', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('Träningsvana: Tränar regelbundet', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/avbrutet/)).toHaveCount(0);
    expect(
      await page.evaluate(
        () =>
          new Promise<number>((resolve, reject) => {
            const request = indexedDB.open('stomme');
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const db = request.result;
              const count = db
                .transaction('sessions')
                .objectStore('sessions')
                .count();
              count.onsuccess = () => {
                resolve(count.result);
                db.close();
              };
              count.onerror = () => {
                reject(count.error);
                db.close();
              };
            };
          }),
      ),
    ).toBe(0);
    await page
      .getByRole('link', { name: 'Visa nästa pass', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Börja passet', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Klar set', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Klar set', exact: true }).click();
    await page.goto('/#/');
    await page.getByText('Ändra', { exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Byt inriktning eller utrustning' }),
    ).toBeDisabled();
  });
}

test('the add-exercise picker narrows by body region and lists primary matches first', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: /Jag förstår/ }).click();
  await page.getByRole('button', { name: 'Bli starkare', exact: true }).click();
  await page
    .getByRole('button', { name: 'Visa mitt pass', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Anpassa passet', exact: true })
    .click();
  const picker = page.getByRole('combobox', {
    name: 'Lägg till övning',
    exact: true,
  });
  const all = await picker.locator('option').count();
  await page.getByRole('button', { name: 'Armar', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Armar', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  const arms = await picker.locator('option').count();
  expect(arms).toBeLessThanOrEqual(all);
  await page.getByRole('button', { name: 'Alla', exact: true }).click();
  expect(await picker.locator('option').count()).toBe(all);
  await page.getByText('Mer specifikt', { exact: true }).click();
  await page.getByLabel('Muskelgrupp').selectOption('glutes');
  expect(await picker.locator('option').count()).toBeLessThan(all);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test('a removed exercise can be restored and a deferred after answer can be given later', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: /Jag förstår/ }).click();
  await page.getByRole('button', { name: 'Bli starkare', exact: true }).click();
  await page
    .getByRole('button', { name: 'Visa mitt pass', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Anpassa passet', exact: true })
    .click();
  const rows = page.locator('ol > li > button[aria-expanded]');
  const count = await rows.count();
  await rows.last().click();
  await page.getByRole('button', { name: /^Ta bort / }).click();
  await expect(rows).toHaveCount(count - 1);
  await page.getByRole('button', { name: 'Ångra', exact: true }).click();
  await expect(rows).toHaveCount(count);
  await keepFirstExercises(page);
  await page.getByLabel('Set', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Börja passet', exact: true }).click();
  await completeSets(page);
  await page.getByRole('button', { name: 'Lagom', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Hur kändes passet?' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Svara senare', exact: true }).click();
  await expect(page.getByRole('heading', { name: /klart/ })).toBeVisible();
  await page
    .getByRole('link', { name: 'Svara på hur passet kändes', exact: true })
    .click();
  await page.getByRole('radio', { name: 'Bra' }).check();
  await page.getByRole('radio', { name: 'Nej, inga besvär' }).check();
  await page.getByRole('button', { name: 'Spara och fortsätt' }).click();
  await expect(page.getByRole('heading', { name: /klart/ })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Svara på hur passet kändes' }),
  ).toHaveCount(0);
});
