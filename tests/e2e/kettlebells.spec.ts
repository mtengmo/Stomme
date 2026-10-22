import { expect, test } from '@playwright/test';
import { removeAllExercises } from './flow';
import { FRESH_STATE } from './state';

// Covers onboarding or training setup, so it starts from a first visit.
test.use({ storageState: FRESH_STATE });

for (const width of [360, 1280]) {
  test(`single-kettlebell options have sources and one implement throughout the motion (${width})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.clock.install();
    await page.goto('/');
    await page.getByRole('button', { name: /Jag förstår/ }).click();
    await page.goto('/#/ovningar?redskap=kettlebell');
    for (const name of [
      'Enarms golvpress med kettlebell',
      'Gång med kettlebell vid axeln',
    ])
      await expect(page.getByRole('link', { name, exact: true })).toBeVisible();
    for (const { reference, load } of [
      { reference: 'E14', load: '3' },
      { reference: 'E24', load: '4' },
      { reference: 'E25', load: '4' },
      { reference: 'E39', load: '2' },
      { reference: 'E40', load: '2' },
    ]) {
      await page.goto(`/#/granska?ovning=${reference}`);
      await page
        .getByRole('combobox', { name: 'Vikt', exact: true })
        .selectOption(load);
      for (let sample = 0; sample < 3; sample++) {
        await page.clock.runFor(500);
        await expect(
          page.locator('.exercise-stage [data-equipment="kettlebell"]'),
        ).toHaveCount(1);
        await expect(
          page.locator('.exercise-stage [data-equipment="kettlebell"] circle'),
        ).toHaveCount(1);
      }
      if (reference !== 'E14') {
        await page
          .getByRole('button', { name: /Höger sida · Byt sida/ })
          .click();
        await expect(
          page.locator('.exercise-stage svg text').filter({ hasText: /^V$/ }),
        ).toHaveCount(1);
      }
      await page.screenshot({
        path: test.info().outputPath(`${reference}-${width}.png`),
      });
      await page
        .getByText('Utrustning, nivå och källor', { exact: true })
        .click();
      await expect(
        page.getByRole('heading', { name: 'Källor', exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  });
}

test('a single 16 kg kettlebell floor press survives planning, reload and logging both sides', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Jag förstår/ }).click();
  await page.getByRole('button', { name: 'Bli starkare', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Kettlebell', exact: true }).check();
  await page
    .getByRole('button', { name: 'Visa mitt pass', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Anpassa passet', exact: true })
    .click();
  await removeAllExercises(page);
  await page
    .getByRole('combobox', { name: 'Lägg till övning', exact: true })
    .selectOption('kettlebell-floor-press');
  await page
    .getByRole('button', { name: 'Lägg till i passet', exact: true })
    .click();
  await expect(page.getByLabel('Total vikt (kg)', { exact: true })).toHaveValue(
    '4',
  );
  await page.getByLabel('Total vikt (kg)', { exact: true }).fill('16');
  await page.getByLabel('Set', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Börja passet', exact: true }).click();
  await expect(page).toHaveURL(/#\/session\//);
  await page.reload();
  await expect(page.getByText(/16 kg totalt/).first()).toBeVisible();
  await expect(
    page.locator('.session-movement [data-equipment="kettlebell"] circle'),
  ).toHaveCount(1);
  await page.getByRole('button', { name: 'Klar set', exact: true }).click();
  await expect(page.getByText('Vänster sida', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Klar set', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Hur ansträngande var övningen?' }),
  ).toBeVisible();
});
