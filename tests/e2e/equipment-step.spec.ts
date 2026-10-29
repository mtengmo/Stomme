import { devices, expect, type Page, test } from '@playwright/test';
import { addWeight, quickStart } from './flow';

test.use({ ...devices['Pixel 7'] });
const WIDTHS = [320, 360, 412];
const SCHEMES = ['light', 'dark'] as const;

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function minTarget(page: Page, names: (string | RegExp)[]) {
  for (const name of names) {
    const box = await page.getByRole('button', { name }).first().boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(47.5);
  }
}

for (const width of WIDTHS)
  for (const scheme of SCHEMES)
    test.describe(`equipment step ${width}px ${scheme}`, () => {
      test.use({
        viewport: { width, height: 800 },
        colorScheme: scheme,
      });

      test('the start step asks once, with no Egenvikt/Utrustning choice', async ({
        page,
      }) => {
        await page.goto('/');
        await page
          .getByRole('button', { name: 'Bli starkare', exact: true })
          .click();
        await expect(
          page.getByRole('heading', { name: 'Vilka vikter har du?' }),
        ).toBeVisible();
        await expect(
          page.getByRole('radio', { name: 'Utrustning' }),
        ).toHaveCount(0);
        await expect(page.getByText(/Antal hantlar/)).toHaveCount(0);
        await expect(
          page.getByText(/Bara kroppsvikt – passet byggs utan vikter/),
        ).toBeVisible();
        for (const name of ['Stabil stol', 'Vägg eller stabilt stöd'])
          await expect(page.getByRole('checkbox', { name })).toBeChecked();
        await minTarget(page, ['Lägg till hantel', 'Lägg till kettlebell']);
        await noHorizontalScroll(page);
        await page.screenshot({
          path: test.info().outputPath(`step-empty-${width}-${scheme}.png`),
          fullPage: true,
        });
      });

      test('adds, merges and removes weights and keeps them to the end', async ({
        page,
      }) => {
        await page.goto('/');
        await quickStart(page, {
          goal: 'general',
          finish: 'equipment',
          onEquipment: async (p) => {
            await addWeight(p, { type: 'dumbbell', count: 2, kg: 5 });
            await addWeight(p, { type: 'dumbbell', count: 1, kg: 10 });
            await addWeight(p, { type: 'dumbbell', count: 1, kg: 10 });
            await addWeight(p, { type: 'kettlebell', count: 1, kg: 12.5 });
          },
        });
        const list = page.getByRole('list').filter({ hasText: 'Hantel 5 kg' });
        await expect(list.getByRole('listitem')).toHaveCount(3);
        await expect(list).toContainText('Hantel 10 kg · par');
        await expect(list).toContainText('Kettlebell 12,5 kg · 1 st');
        // The inline form with a validation error.
        await page
          .getByRole('button', { name: 'Lägg till hantel', exact: true })
          .click();
        await page.getByLabel(/^Vikt per hantel/).fill('tung');
        await page
          .getByRole('button', { name: 'Lägg till', exact: true })
          .click();
        await expect(page.getByRole('alert')).toContainText('0,5 och 100');
        await minTarget(page, ['Lägg till', 'Avbryt']);
        await noHorizontalScroll(page);
        await page.screenshot({
          path: test.info().outputPath(`step-form-${width}-${scheme}.png`),
          fullPage: true,
        });
        await page.getByRole('button', { name: 'Avbryt' }).click();
        await expect(
          page.getByRole('button', { name: 'Lägg till hantel', exact: true }),
        ).toBeFocused();
        await page.screenshot({
          path: test.info().outputPath(`step-items-${width}-${scheme}.png`),
          fullPage: true,
        });
        await page
          .getByRole('button', { name: 'Ta bort kettlebell 12,5 kg' })
          .click();
        await expect(list.getByRole('listitem')).toHaveCount(2);
        await page.getByRole('button', { name: 'Nästa', exact: true }).click();
        await page.getByRole('button', { name: 'Nästa', exact: true }).click();
        await page.getByRole('button', { name: 'Visa mitt pass' }).click();
        await expect(
          page.getByRole('button', { name: 'Börja passet' }),
        ).toBeVisible();
      });

      test('Min utrustning in Inställningar edits and saves the same inventory', async ({
        page,
      }) => {
        await page.goto('/');
        await quickStart(page, {
          goal: 'general',
          onEquipment: (p) =>
            addWeight(p, { type: 'dumbbell', count: 2, kg: 8 }),
        });
        await page.goto('/#/installningar');
        await page.getByRole('link', { name: /^Min utrustning/ }).click();
        await expect(
          page.getByRole('heading', { name: 'Min utrustning' }),
        ).toBeVisible();
        await expect(page.getByText('Hantel 8 kg · par')).toBeVisible();
        await addWeight(page, { type: 'kettlebell', count: 1, kg: 16 });
        await page.getByRole('checkbox', { name: 'Träningsband' }).check();
        await noHorizontalScroll(page);
        await page.screenshot({
          path: test.info().outputPath(`settings-${width}-${scheme}.png`),
          fullPage: true,
        });
        await page
          .getByRole('button', { name: 'Spara min utrustning' })
          .click();
        await expect(page.getByRole('status')).toContainText('sparad');
        await page.reload();
        await expect(page.getByText('Kettlebell 16 kg · 1 st')).toBeVisible();
        await expect(
          page.getByRole('checkbox', { name: 'Träningsband' }),
        ).toBeChecked();
      });

      test('knee rehab gets "Vad har du hemma?" without weights', async ({
        page,
      }) => {
        await page.goto('/');
        await quickStart(page, { goal: 'knee', finish: 'equipment' });
        await expect(
          page.getByRole('heading', { name: 'Vad har du hemma?' }),
        ).toBeVisible();
        await expect(
          page.getByRole('button', { name: 'Lägg till hantel' }),
        ).toHaveCount(0);
        await noHorizontalScroll(page);
      });
    });

test('Min utrustning returns to the whitelisted target after saving', async ({
  page,
}) => {
  await page.goto('/');
  await quickStart(page, { goal: 'general' });
  await page.goto('/#/installningar/utrustning?tillbaka=nytt-pass');
  await page.getByRole('button', { name: 'Spara min utrustning' }).click();
  await expect(page).toHaveURL(/#\/nytt-pass$/);
  await page.goto('/#/installningar/utrustning?tillbaka=https://evil.example');
  await page.getByRole('button', { name: 'Spara min utrustning' }).click();
  await expect(page.getByRole('status')).toContainText('sparad');
});
