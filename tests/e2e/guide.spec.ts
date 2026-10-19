import { expect, test } from '@playwright/test';
import { answerPain, openPreview } from './flow';

for (const viewport of [
  { width: 360, height: 800 },
  { width: 1280, height: 900 },
]) {
  test(`help keeps the page still and reflects selected load (${viewport.width})`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openPreview(page);
    await page
      .getByRole('button', { name: 'Starta pass', exact: true })
      .click();
    await answerPain(page, 0);
    await expect(page.locator('[data-equipment]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Öka vikt' }).click();
    await expect(page.locator('[data-equipment="dumbbell"]')).toHaveCount(1);
    await page.getByRole('button', { name: 'Hur gör man?' }).click();
    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByText('10 kg hantel mot bröstet', { exact: true }),
    ).toBeVisible();
    await dialog
      .getByRole('button', { name: 'Så gör du', exact: true })
      .click();
    await expect(
      dialog.getByText('Håll hanteln med båda händerna tätt mot bröstet.', {
        exact: true,
      }),
    ).toBeVisible();
    await page.screenshot({ path: test.info().outputPath('instructions.png') });
    const before = await page.evaluate(() => window.scrollY);
    await dialog.getByRole('region', { name: 'Instruktioner' }).hover();
    await page.mouse.wheel(0, 2000);
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
    await expect(
      dialog.getByRole('button', { name: 'Stäng' }),
    ).toBeInViewport();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('[data-equipment="dumbbell"]')).toHaveCount(1);
    await page.getByRole('button', { name: 'Öka vikt' }).click();
    await expect(page.locator('[data-equipment="kettlebell"]')).toHaveCount(1);
    await page.getByRole('button', { name: 'Hur gör man?' }).click();
    await page.screenshot({ path: test.info().outputPath('movement.png') });
  });
}

test('right and left are explicit; holding time finishes without logging a set', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await openPreview(page);
  await page.getByRole('button', { name: 'Starta pass', exact: true }).click();
  await answerPain(page, 0);
  for (let i = 0; i < 4; i++) {
    await page
      .getByRole('button', { name: 'Hoppa över övningen', exact: true })
      .click();
  }
  await expect(
    page.getByRole('heading', { name: 'Sidoplanka', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Sedan: byt till vänster sida, utan vila/),
  ).toBeVisible();
  await page.clock.install();
  await page.getByRole('button', { name: /^Starta hålltid/ }).click();
  await expect(page.getByRole('timer')).toBeVisible();
  await page.clock.fastForward(31_000);
  await expect(
    page.getByRole('status').filter({ hasText: 'Hålltiden är klar' }),
  ).toBeVisible();
  await expect(page.getByText('Höger sida', { exact: true })).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath('hold-complete.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Klar set', exact: true }).click();
  await expect(page.getByText('Vänster sida', { exact: true })).toBeVisible();
  await expect(
    page.getByText(/Byt nu till vänster. Samma hålltid/),
  ).toBeVisible();
  await expect(page.getByRole('timer')).toHaveCount(0);
  await page.getByRole('button', { name: 'Klar set', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Vila', exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Detta är vilotid/)).toBeVisible();
  await page.clock.fastForward(120_000);
  await expect(page.getByText(/Vilan är klar. Tryck Nästa set/)).toBeVisible();
});
