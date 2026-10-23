import { expect, test } from '@playwright/test';
import { getTheme, themes } from '../../src/styles/themes/registry';

const rutat = getTheme('rutat');

for (const mode of [
  { name: 'mobile light', width: 360, colorScheme: 'light' as const },
  { name: 'desktop dark', width: 1280, colorScheme: 'dark' as const },
]) {
  test(`body and equipment colours stay distinct (${mode.name})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: mode.width, height: 900 });
    await page.emulateMedia({
      colorScheme: mode.colorScheme,
      reducedMotion: 'no-preference',
    });
    await page.goto('/');
    for (const sample of [
      { id: 'dumbbell-rdl', equipment: 'dumbbell' },
      { id: 'kettlebell-rack-carry', equipment: 'kettlebell' },
      { id: 'band-leg-press', equipment: 'band' },
    ]) {
      await page.goto(`/#/ovning/${sample.id}`);
      const movement = page.getByRole('region', { name: 'Rörelsen' });
      const equipment = movement.locator(
        `[data-equipment="${sample.equipment}"]`,
      );
      await expect(equipment).toHaveCount(1);
      const colours = await equipment.evaluate((element) => {
        const target = element.matches('path')
          ? element
          : element.querySelector('path');
        const root = getComputedStyle(document.documentElement);
        const body = document.querySelector('[data-body-side="near"]');
        return {
          equipment: target ? getComputedStyle(target).stroke : '',
          body: body ? getComputedStyle(body).stroke : '',
          token: root.getPropertyValue('--equipment').trim(),
        };
      });
      expect(colours.equipment).not.toBe(colours.body);
      expect(colours.token).toBe(rutat?.tokens[mode.colorScheme].equipment);
      if (sample.id === 'dumbbell-rdl') {
        const near = await movement
          .locator('[data-body-side="near"]')
          .evaluate((element) => getComputedStyle(element).stroke);
        const far = await movement
          .locator('[data-body-side="far"]')
          .evaluate((element) => getComputedStyle(element).stroke);
        expect(far).toBe(near);
        await expect(
          movement.getByText('Blått: båda sidor arbetar.', { exact: false }),
        ).toBeVisible();
      }
      if (sample.equipment === 'band')
        await expect(equipment).toHaveAttribute('stroke-dasharray', '5 3');
      await page.screenshot({
        path: test.info().outputPath(`${sample.equipment}.png`),
      });
    }
  });
}

for (const theme of themes) {
  for (const scheme of ['light', 'dark'] as const) {
    test(`knee programme figures keep blue on the working limb (${theme.id} ${scheme})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 360, height: 900 });
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/');
      await page.evaluate(
        (value) => localStorage.setItem('stomme.appearance', value),
        JSON.stringify({ theme: theme.id, scheme }),
      );
      const tokens = theme.tokens[scheme];
      for (const id of [
        'quad-set',
        'seated-knee-flexion',
        'band-knee-extension',
        'band-hip-extension',
        'balance-clock',
      ]) {
        await page.goto(`/#/ovning/${id}`);
        const movement = page.getByRole('region', { name: 'Rörelsen' });
        const near = movement.locator('[data-body-side="near"]').first();
        const far = movement.locator('[data-body-side="far"]').first();
        await expect(near).toBeVisible();
        expect(await near.evaluate((e) => getComputedStyle(e).stroke)).not.toBe(
          await far.evaluate((e) => getComputedStyle(e).stroke),
        );
        if (id.startsWith('band')) {
          // Reduced motion shows a start and an end frame, each with its band.
          const band = movement.locator('svg [data-equipment="band"]').first();
          await expect(band).toBeAttached();
          expect(
            await band.evaluate((e) => getComputedStyle(e).stroke),
          ).not.toBe(await near.evaluate((e) => getComputedStyle(e).stroke));
        }
        if (id === 'balance-clock') {
          const diagram = movement.getByTestId('balance-clock-diagram');
          await expect(diagram).toBeVisible();
          await expect(diagram.getByRole('img')).toHaveAccessibleName(
            /Balansklockan sedd uppifrån/,
          );
        }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
      }
      expect(tokens.accent).toBeTruthy();
    });
  }
}
