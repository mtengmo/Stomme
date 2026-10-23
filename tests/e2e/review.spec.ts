import { expect, test } from '@playwright/test';

for (const mode of [
  {
    name: 'mobile dark',
    viewport: { width: 360, height: 800 },
    colorScheme: 'dark' as const,
  },
  {
    name: 'desktop light',
    viewport: { width: 1280, height: 900 },
    colorScheme: 'light' as const,
  },
]) {
  test.describe(`review ${mode.name}`, () => {
    // Only the narrow viewport reloads offline and so needs the service worker.
    test.use({
      serviceWorkers: mode.viewport.width < 1024 ? 'allow' : 'block',
    });

    test(`numbered exercise review supports browsing and deep links (${mode.name})`, async ({
      page,
    }) => {
      await page.setViewportSize(mode.viewport);
      await page.emulateMedia({ colorScheme: mode.colorScheme });
      await page.goto('/#/installningar');
      await page
        .getByRole('link', { name: 'Granska alla övningar', exact: true })
        .click();
      await expect(
        page.getByRole('heading', { name: 'Granska övningar', exact: true }),
      ).toBeVisible();
      const codes = Array.from(
        { length: 53 },
        (_, i) => `E${String(i + 1).padStart(2, '0')}`,
      );
      if (mode.viewport.width < 1024) {
        const picker = page.getByLabel('Välj övning att granska');
        await expect(picker.getByRole('option')).toHaveCount(53);
        for (const code of codes)
          await expect(
            picker.getByRole('option', { name: new RegExp(`^${code} · `) }),
          ).toHaveCount(1);
        await picker.selectOption('E03');
      } else {
        const catalogue = page.getByRole('navigation', {
          name: 'Övningar att granska',
        });
        for (const code of codes)
          await expect(
            catalogue.getByRole('link', { name: new RegExp(`^${code}`) }),
          ).toHaveCount(1);
        await catalogue.getByRole('link', { name: /^E03/ }).click();
      }
      await expect(page).toHaveURL(/#\/granska\?ovning=E03$/);
      await expect(
        page.getByRole('heading', { name: /^E03 · Enbens rumänskt marklyft$/ }),
      ).toBeVisible();
      const poses = page.getByRole('region', { name: 'Rörelsen' });
      await expect(poses.locator('.exercise-stage svg')).toHaveCount(2);
      await expect(poses.getByText('Start', { exact: true })).toBeVisible();
      await expect(poses.getByText('Slut', { exact: true })).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'Så gör du' }),
      ).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'Tränar främst' }),
      ).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'Hjälper till' }),
      ).toBeVisible();
      await expect(
        page.getByRole('group', { name: 'Välj rörelseläge' }),
      ).toHaveCount(0);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await expect(poses.locator('.exercise-stage svg')).toHaveCount(1);
      await page
        .getByRole('button', { name: 'Pausa rörelsen', exact: true })
        .click();
      await expect(
        page.getByRole('button', { name: 'Spela rörelsen' }),
      ).toBeVisible();
      await page.screenshot({
        path: test.info().outputPath('review.png'),
        fullPage: true,
      });
      await page.getByRole('link', { name: 'Nästa', exact: true }).click();
      await expect(page).toHaveURL(/#\/granska\?ovning=E04$/);
      await page.goBack();
      await expect(page).toHaveURL(/#\/granska\?ovning=E03$/);
      await page.reload();
      await expect(page.getByRole('heading', { name: /^E03 ·/ })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await page.goto('/#/granska?ovning=missing');
      await expect(page.getByRole('status')).toHaveText(
        'Referensen hittades inte. Visar E01.',
      );
      await expect(page.getByRole('heading', { name: /^E01 ·/ })).toBeVisible();
      if (mode.viewport.width < 1024) {
        await page.evaluate(async () => {
          await navigator.serviceWorker.ready;
        });
        await page.reload();
        await page.context().setOffline(true);
        await page.goto('/#/granska?ovning=E11');
        await page.reload();
        await expect(
          page.getByRole('heading', { name: /^E11 · Väggsittning$/ }),
        ).toBeVisible();
      }
    });
  });
}
