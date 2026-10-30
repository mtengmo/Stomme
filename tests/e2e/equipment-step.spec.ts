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
        const heading = page.getByRole('heading', {
          name: 'Vad tränar du med?',
        });
        await expect(heading).toBeVisible();
        expect((await heading.boundingBox())?.height ?? 999).toBeLessThan(45);
        await expect(
          page.getByRole('radio', { name: 'Utrustning' }),
        ).toHaveCount(0);
        await expect(page.getByText(/Antal hantlar/)).toHaveCount(0);
        await expect(
          page.getByText(
            /Inga vikter\? Gå vidare, passet byggs med kroppsvikt/,
          ),
        ).toBeVisible();
        for (const name of ['Stabil stol', 'Vägg eller stabilt stöd'])
          await expect(page.getByRole('checkbox', { name })).toBeChecked();
        await expect(
          page.getByRole('checkbox', { name: 'Bara kroppsvikt' }),
        ).toBeChecked();
        await expect(
          page.getByRole('button', { name: 'Hantel 5 kg' }),
        ).toHaveCount(0);
        await page.getByRole('checkbox', { name: 'Hantlar' }).check();
        await minTarget(page, ['Hantel 5 kg', 'Annan vikt, hantel']);
        await noHorizontalScroll(page);
        await page.screenshot({
          path: test.info().outputPath(`step-empty-${width}-${scheme}.png`),
          fullPage: true,
        });
        // The step label stays in view when the page is scrolled.
        await page.evaluate(() =>
          window.scrollTo(0, document.body.scrollHeight),
        );
        await expect(page.getByText(/^Steg 2 av 4$/)).toBeInViewport();
      });

      test('chips add a pair or one, Annan vikt uses the fixed button and Nästa never drops it', async ({
        page,
      }) => {
        await page.goto('/');
        await page
          .getByRole('button', { name: 'Bli starkare', exact: true })
          .click();
        await page.getByRole('checkbox', { name: 'Hantlar' }).check();
        await page.getByRole('checkbox', { name: 'Kettlebell' }).check();
        const five = page.getByRole('button', {
          name: 'Hantel 5 kg',
          exact: true,
        });
        await five.click();
        await expect(five).toHaveAttribute('aria-pressed', 'true');
        await expect(page.getByText('Hantel 5 kg · par')).toBeVisible();
        await page
          .getByRole('button', { name: 'Kettlebell 16 kg', exact: true })
          .click();
        await expect(page.getByText('Kettlebell 16 kg · 1 st')).toBeVisible();
        await page
          .getByRole('button', { name: 'Annan vikt, hantel', exact: true })
          .click();
        await expect(
          page.getByRole('button', { name: 'Nästa', exact: true }),
        ).toHaveCount(0);
        const fixed = page.getByRole('button', {
          name: 'Lägg till vikt',
          exact: true,
        });
        await expect(fixed).toBeDisabled();
        await expect(page.getByText('Skriv en vikt')).toBeVisible();
        await page.getByLabel('Vikt (kg)').fill('tung');
        await page.getByLabel('Vikt (kg)').press('Enter');
        await expect(page.getByRole('alert')).toContainText('0,5 och 100');
        await page.getByLabel('Vikt (kg)').fill('7,5');
        const add = page.getByRole('button', {
          name: 'Lägg till 7,5 kg (par)',
          exact: true,
        });
        await expect(add).toBeEnabled();
        await minTarget(page, [/^Lägg till 7,5/, 'Avbryt']);
        await noHorizontalScroll(page);
        await page.screenshot({
          path: test.info().outputPath(`step-form-${width}-${scheme}.png`),
          fullPage: true,
        });
        await add.click();
        await expect(page.getByText('Hantel 7,5 kg · par')).toBeVisible();
        await expect(
          page.getByRole('button', { name: 'Nästa', exact: true }),
        ).toBeEnabled();
        await expect(
          page.getByRole('button', { name: 'Annan vikt, hantel', exact: true }),
        ).toBeFocused();
        // Switch the count and cancel a second form.
        await page
          .getByRole('button', { name: 'Ändra hantel 7,5 kg till 1 st' })
          .click();
        await expect(page.getByText('Hantel 7,5 kg · 1 st')).toBeVisible();
        await page
          .getByRole('button', { name: 'Annan vikt, hantel', exact: true })
          .click();
        await page.getByRole('button', { name: 'Avbryt' }).click();
        await expect(
          page.getByRole('button', { name: 'Nästa', exact: true }),
        ).toBeVisible();
        await noHorizontalScroll(page);
        await page.screenshot({
          path: test.info().outputPath(`step-items-${width}-${scheme}.png`),
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
        await expect(page.getByText('Hantel 5 kg · par')).toBeVisible();
        await expect(page.getByText('Hantel 10 kg · par')).toBeVisible();
        await expect(page.getByText('Kettlebell 12,5 kg · 1 st')).toBeVisible();
        await page
          .getByRole('button', { name: 'Ta bort kettlebell 12,5 kg' })
          .click();
        await expect(page.getByText('Kettlebell 12,5 kg')).toHaveCount(0);
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
          page.getByRole('checkbox', { name: 'Hantlar' }),
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
