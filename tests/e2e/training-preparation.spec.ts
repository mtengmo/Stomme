import { expect, test } from '@playwright/test';

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
    await page.getByText('Fler inställningar', { exact: false }).click();
    await page
      .getByRole('combobox', { name: 'Träningsvana', exact: true })
      .selectOption('some');
    await page
      .getByRole('button', { name: 'Visa mitt pass', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Anpassa passet', exact: true })
      .click();
    await page.getByLabel('Set', { exact: true }).first().fill('4');
    await page
      .getByRole('button', { name: 'Börja passet', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Hur känns kroppen?', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('Styrka för löpning · Pass A', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('Träningsvana: Viss vana', { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: test.info().outputPath('preparation-context.png'),
    });
    await page.getByRole('link', { name: 'Ändra passet', exact: true }).click();
    await page
      .getByRole('button', { name: 'Anpassa passet', exact: true })
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
      page.getByText('Styrka för löpning · Pass B', { exact: true }),
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
    await page.getByRole('radio', { name: 'Redo att träna' }).check();
    await page.getByRole('radio', { name: 'Nej, inga besvär' }).check();
    await page
      .getByRole('button', { name: 'Spara och fortsätt', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Klar set', exact: true }),
    ).toBeVisible();
    await page.goto('/#/');
    await page.getByText('Ändra', { exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Byt inriktning eller utrustning' }),
    ).toBeDisabled();
  });
}
