import { expect, test } from '@playwright/test';
import {
  completeSets,
  endProgram,
  keepFirstExercises,
  quickStart,
} from './flow';
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
    await quickStart(page, { goal: 'general', level: 'some' });
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
    // Ordinary training starts directly, with no question first.
    await page
      .getByRole('button', { name: 'Starta passet', exact: true })
      .click();
    await expect(page).toHaveURL(/#\/session\//);
    await expect(
      page.getByRole('button', { name: 'Klar set', exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/Allmän styrka · A/)).toBeVisible();
    await page.screenshot({
      path: test.info().outputPath('preparation-context.png'),
    });
    // The pass A/B switch and the direction form belong to the Home of users without a programme.
    await endProgram(page);
    await expect(
      page.getByRole('heading', { name: 'Förbered ditt pass', exact: true }),
    ).toBeVisible();
    await page.getByText('Ändra', { exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Byt inriktning' }),
    ).toBeEnabled();
    await page
      .getByRole('link', { name: 'Visa pass B i stället', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Starta passet', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Klar set', exact: true }),
    ).toBeVisible();
    await page.goto('/#/');
    await page.getByText('Ändra', { exact: true }).click();
    await expect(
      page.getByRole('link', { name: 'Visa pass A i stället', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Byt inriktning' }).click();
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
      .getByRole('link', { name: 'Starta passet', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Starta passet', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Klar set', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Klar set', exact: true }).click();
    await page.goto('/#/');
    await page.getByText('Ändra', { exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Byt inriktning' }),
    ).toBeDisabled();
  });
}

test('the add-exercise picker narrows by body region and lists primary matches first', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: /Jag förstår/ }).click();
  await quickStart(page, { goal: 'general' });
  await page
    .getByRole('button', { name: 'Anpassa passet', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Lägg till övning', exact: true })
    .click();
  const results = page.locator('main').getByRole('listitem');
  const all = await results.count();
  await page.getByRole('button', { name: 'Armar', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Armar', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  expect(await results.count()).toBeLessThanOrEqual(all);
  await page.getByRole('button', { name: 'Alla', exact: true }).click();
  await expect(results).toHaveCount(all);
  await page.getByText('Mer specifikt', { exact: true }).click();
  await page.getByRole('button', { name: 'Säte', exact: true }).click();
  expect(await results.count()).toBeLessThan(all);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test('a removed exercise can be restored and a regular session ends without an after question', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: /Jag förstår/ }).click();
  await quickStart(page, { goal: 'general' });
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
  await page
    .getByRole('button', { name: 'Starta passet', exact: true })
    .click();
  await completeSets(page);
  await page.getByRole('button', { name: 'Lagom', exact: true }).click();
  await expect(page.getByRole('heading', { name: /klart/ })).toBeVisible();
  expect(page.url()).not.toMatch(/kansla/);
  await page.getByRole('button', { name: 'Avsluta pass', exact: true }).click();
  await expect(page).toHaveURL(/#\/$/);
  await page.goto('/#/historik');
  await expect(
    page.getByRole('link', { name: 'Svara på hur passet kändes' }),
  ).toHaveCount(0);
});
