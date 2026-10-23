import { expect, test } from '@playwright/test';

for (const width of [390, 1280]) {
  test(`paired limbs, supported press grips and front pilots (${width})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/#/ovning/dead-bug');
    const toggle = page.getByRole('button', {
      name: /höger arm \+ vänster ben.*Byt sida/i,
    });
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(
      page.getByRole('button', { name: /vänster arm \+ höger ben.*Byt sida/i }),
    ).toBeVisible();

    for (const id of ['kettlebell-press', 'kettlebell-floor-press']) {
      await page.goto(`/#/ovning/${id}`);
      const closeup = page.getByRole('figure', {
        name: /Kettlebellgrepp vid press/,
      });
      await closeup.scrollIntoViewIfNeeded();
      await expect(closeup).toBeVisible();
      await expect(closeup.locator('[data-grip="press"]')).toHaveCount(1);
      await closeup.screenshot({
        path: test.info().outputPath(`${id}-grip.png`),
      });
    }

    for (const id of ['step-up', 'rear-foot-split-squat', 'suitcase-carry']) {
      await page.goto(`/#/ovning/${id}`);
      await page
        .getByRole('button', { name: 'Framifrån', exact: true })
        .click();
      await expect(
        page.locator('.exercise-stage [data-view="front"]'),
      ).toHaveCount(2);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.goto('/#/ovning/bench-side-plank-leg-lift');
    await expect(
      page.getByText(/Ett benlyft och en sänkning är en repetition/),
    ).toHaveCount(1);
    await expect(
      page.getByText(/Sänk höften lugnt när setet är klart/),
    ).toHaveCount(1);
  });
}
