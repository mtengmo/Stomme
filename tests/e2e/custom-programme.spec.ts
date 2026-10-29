import { expect, type Page, test } from '@playwright/test';
import { addWeight, answerPain, quickStart } from './flow';
import { FRESH_STATE } from './state';

// Covers onboarding and training setup, so it starts from a first visit.
test.use({ storageState: FRESH_STATE });

const noOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

for (const width of [320, 360, 412]) {
  for (const scheme of ['light', 'dark'] as const) {
    test(`pick, order, create, dose, start and delete a custom workout (${width} ${scheme})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/');
      await page.getByRole('button', { name: /Jag förstår/ }).click();
      await expect(
        page.getByRole('button', { name: 'Bli starkare', exact: true }),
      ).toBeVisible();
      await quickStart(page, {
        goal: 'general',
        onEquipment: (p) =>
          addWeight(p, { type: 'kettlebell', count: 1, kg: 8 }),
      });
      await expect(
        page.getByRole('heading', { name: 'Pass A', exact: true }),
      ).toBeVisible();

      // Library: filter, then pick three. The bar never covers the last row.
      await page.goto('/#/ovningar');
      await page.getByLabel('Sök övning').fill('kettlebell');
      const pickers = page.getByRole('button', { name: /^Välj: / });
      await expect(pickers.first()).toBeVisible();
      await page
        .getByRole('button', { name: 'Välj: Gång med kettlebell vid axeln' })
        .click();
      await page
        .getByRole('button', {
          name: 'Välj: Enarms golvpress med kettlebell',
        })
        .click();
      await pickers.filter({ hasNotText: 'Vald' }).first().click();
      const bar = page.getByRole('region', { name: 'Valda övningar' });
      await expect(page.getByRole('status')).toContainText('3 av 12 övningar');
      await expect(page.getByRole('status')).toContainText('ca ');
      await expect(
        page.getByRole('button', {
          name: 'Välj: Gång med kettlebell vid axeln',
        }),
      ).toHaveAttribute('aria-pressed', 'true');
      expect(await noOverflow(page)).toBe(true);
      await page.screenshot({
        path: test.info().outputPath(`library-${width}-${scheme}.png`),
      });

      // The last row stays clear of the bar.
      await page.getByLabel('Sök övning').fill('');
      await expect(pickers.nth(20)).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const gap = await page.evaluate(() => {
        const items = [...document.querySelectorAll('li')].filter(
          (item) => !item.closest('nav, [aria-label="Valda övningar"]'),
        );
        const row = items.at(-1)?.getBoundingClientRect();
        const barBox = document
          .querySelector('[aria-label="Valda övningar"]')
          ?.getBoundingClientRect();
        return row && barBox ? barBox.top - row.bottom : -1;
      });
      expect(gap).toBeGreaterThanOrEqual(0);

      // Reorder: the walk moves down, so the press comes first.
      await page.getByLabel('Sök övning').fill('kettlebell');
      await bar.getByRole('button', { name: 'Visa valda' }).click();
      await bar
        .getByRole('button', {
          name: 'Flytta ned: Gång med kettlebell vid axeln',
        })
        .click();
      await expect(page.getByRole('status')).toContainText(
        'flyttad till plats 2',
      );
      await expect(bar.getByRole('listitem').nth(1)).toContainText(
        'Gång med kettlebell vid axeln',
      );
      await page.screenshot({
        path: test.info().outputPath(`selected-${width}-${scheme}.png`),
      });
      await bar
        .getByRole('button', { name: 'Skapa pass', exact: true })
        .click();

      // Preview in edit mode with an automatic name.
      await expect(page).toHaveURL(/#\/traning\/A\?workout=/);
      await expect(
        page.getByRole('heading', { name: /^Eget pass \d+ \S+$/ }),
      ).toBeVisible();
      const rows = page.locator('ol > li > button[aria-expanded]');
      await expect(rows).toHaveCount(3);
      const removeExercise = page.getByRole('button', {
        name: /^Ta bort (?!passet)/,
      });
      // Keep only the press: remove the other two through their own rows.
      for (let guard = 0; guard < 2; guard++) {
        await rows.last().click();
        await removeExercise.click();
      }
      await expect(rows).toHaveCount(1);
      await rows.first().click();
      await page.getByLabel('Set', { exact: true }).fill('1');
      await page.getByLabel('Namn på passet').fill('Mitt nya pass');
      await page
        .getByRole('button', { name: 'Spara ändringar i eget pass' })
        .click();
      await expect(
        page.getByText('Ändringarna är sparade.', { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'Mitt nya pass', exact: true }),
      ).toBeVisible();
      expect(await noOverflow(page)).toBe(true);
      await page.screenshot({
        path: test.info().outputPath(`preview-${width}-${scheme}.png`),
      });

      // Add more from the library returns to the preview.
      await page
        .getByRole('link', { name: 'Lägg till fler från biblioteket' })
        .click();
      await expect(page).toHaveURL(/#\/ovningar\?till=/);
      await expect(page.getByText('Redan i passet').first()).toBeVisible();
      await page.getByLabel('Sök övning').fill('kettlebell');
      await pickers
        .filter({ hasNotText: 'Vald' })
        .and(page.locator(':enabled'))
        .first()
        .click();
      await page
        .getByRole('button', { name: 'Lägg till i passet', exact: true })
        .click();
      await expect(page).toHaveURL(/#\/traning\/A\?workout=/);
      await expect(
        page.getByRole('heading', { name: 'Mitt nya pass', exact: true }),
      ).toBeVisible();
      await expect(rows).toHaveCount(2);
      await rows.last().click();
      await removeExercise.click();
      await expect(rows).toHaveCount(1);

      // Start and finish it.
      await page
        .getByRole('button', { name: 'Börja passet', exact: true })
        .click();
      await expect(page).toHaveURL(/#\/session\//);
      if (await page.getByRole('heading', { name: /Hur känns/ }).count())
        await answerPain(page, 0);
      const home = page.getByRole('link', { name: 'Till träningen' });
      const next = page
        .getByRole('button', {
          name: /^(Klar set|Hoppa över vila|Lagom|Avsluta pass|Svara senare|Spara)$/,
        })
        .first();
      for (let guard = 0; guard < 40 && !(await home.count()); guard++) {
        await home.or(next).first().waitFor();
        const label = await next.innerText({ timeout: 1_000 }).catch(() => '');
        if (label.trim() === 'Spara') await answerPain(page, 0);
        else await next.click({ timeout: 1_000 }).catch(() => {});
      }
      await expect(home).toBeVisible();
      await page.goto('/#/historik');
      await expect(page.getByText('Mitt nya pass').first()).toBeVisible();

      // Home lists it; deleting asks first.
      await page.goto('/');
      const list = page.getByRole('region', { name: 'Mina pass' });
      await expect(
        list.getByText('Mitt nya pass', { exact: true }),
      ).toBeVisible();
      await expect(list).toContainText('övn');
      expect(await noOverflow(page)).toBe(true);
      await page.screenshot({
        path: test.info().outputPath(`home-${width}-${scheme}.png`),
      });
      await list
        .getByRole('button', { name: 'Ta bort: Mitt nya pass' })
        .click();
      await expect(
        page.getByText('Ta bort passet? Sparade pass i historiken finns kvar.'),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Behåll passet' }).click();
      await expect(
        list.getByText('Mitt nya pass', { exact: true }),
      ).toBeVisible();
      await list
        .getByRole('button', { name: 'Ta bort: Mitt nya pass' })
        .click();
      await page
        .getByRole('group', { name: 'Ta bort Mitt nya pass' })
        .getByRole('button', { name: 'Ta bort passet' })
        .click();
      await expect(page.getByText('Inga egna pass än.')).toBeVisible();
      await page.goto('/#/historik');
      await expect(page.getByText('Mitt nya pass').first()).toBeVisible();
    });
  }
}
