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
  test(`numbered exercise review supports browsing and deep links (${mode.name})`, async ({
    page,
  }) => {
    await page.setViewportSize(mode.viewport);
    await page.emulateMedia({ colorScheme: mode.colorScheme });
    await page.goto('/');
    await page.getByRole('button', { name: /Jag förstår/ }).click();
    await page
      .getByRole('link', { name: 'Inställningar', exact: true })
      .click();
    await page
      .getByRole('link', { name: 'Granska alla övningar', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Granska övningar', exact: true }),
    ).toBeVisible();
    const codes = Array.from(
      { length: 11 },
      (_, i) => `E${String(i + 1).padStart(2, '0')}`,
    );
    if (mode.viewport.width < 1024) {
      const picker = page.getByLabel('Välj övning att granska');
      await expect(picker.getByRole('option')).toHaveCount(11);
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
    const poses = page.getByRole('region', { name: 'Rörelsens lägen' });
    await expect(poses.getByRole('figure')).toHaveCount(6);
    await page.screenshot({
      path: test.info().outputPath('review.png'),
      fullPage: true,
    });
    await page.getByRole('link', { name: 'Nästa', exact: true }).click();
    await expect(page).toHaveURL(/#\/granska\?ovning=E04$/);
    await page.goBack();
    await expect(page).toHaveURL(/#\/granska\?ovning=E03$/);
    await page
      .getByRole('link', {
        name: 'Öppna övningskort och animation',
        exact: true,
      })
      .click();
    await expect(page.getByText('Övning E03', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Tillbaka', exact: true }).click();
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
}
