import { expect, test } from '@playwright/test';
import { FRESH_STATE } from './state';

// Covers onboarding or training setup, so it starts from a first visit.
test.use({ storageState: FRESH_STATE });

for (const width of [360, 1280]) {
  test(`favourites, aliases and front views persist (${width})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({
      reducedMotion: 'no-preference',
      colorScheme: width === 360 ? 'light' : 'dark',
    });
    await page.goto('/');
    await page.getByRole('button', { name: /Jag förstår/ }).click();
    await page
      .getByRole('button', { name: 'Bli starkare', exact: true })
      .click();
    await page.getByRole('checkbox', { name: 'Hantlar', exact: true }).check();
    await expect(
      page
        .getByRole('combobox', { name: 'Antal hantlar', exact: true })
        .getByRole('option', { name: '1', exact: true }),
    ).toHaveAttribute('translate', 'no');
    await page.goto('/#/ovningar?sok=Bakåtutfall');
    await expect(page.getByRole('status')).toHaveText('1 övning');
    await page.getByRole('button', { name: 'Favorit', exact: true }).click();
    await page.getByLabel('Sök efter namn eller nummer').fill('');
    await page.getByLabel('Bara mina favoriter').check();
    await expect(page.getByRole('status')).toHaveText('1 övning');
    await page.reload();
    await expect(
      page.getByRole('button', { name: 'Ta bort favorit', exact: true }),
    ).toBeVisible();
    await page.goto('/#/ovning/kettlebell-rack-carry');
    await page
      .getByRole('button', { name: 'Pausa rörelsen', exact: true })
      .click();
    await page.getByRole('button', { name: 'Framifrån', exact: true }).click();
    await expect(
      page.locator('.exercise-stage svg[data-view="front"]'),
    ).toHaveCount(1);
    await expect(
      page.getByRole('button', { name: 'Spela rörelsen', exact: true }),
    ).toBeVisible();
    await expect(
      page.locator('.exercise-stage [data-equipment="kettlebell"]'),
    ).toHaveCount(1);
    await page.screenshot({
      path: test.info().outputPath(`front-${width}.png`),
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole('button', { name: 'Från sidan', exact: true }).click();
    await expect(
      page.locator('.exercise-stage svg[data-view="front"]'),
    ).toHaveCount(0);
  });

  test(`progress shows actual comparable sets (${width})`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: width === 360 ? 'light' : 'dark' });
    await page.goto('/');
    await page.getByRole('button', { name: /Jag förstår/ }).click();
    await page.evaluate(async () => {
      const open = indexedDB.open('stomme');
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      const tx = db.transaction(['sessions', 'setLogs'], 'readwrite');
      for (const [i, amount] of [8, 10, 12].entries()) {
        const date = new Date();
        date.setDate(date.getDate() - (2 - i) * 7);
        const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const stamp = date.toISOString(),
          id = `progress-${i}`;
        tx.objectStore('sessions').put({
          id,
          templateId: 'A',
          programId: 'general',
          policyVersion: 1,
          date: localDate,
          startedAt: stamp,
          finishedAt: stamp,
          status: 'completed',
          programWeek: 1,
          plan: [
            {
              exerciseId: 'supported-row',
              sets: 2,
              target: amount,
              loadIndex: 0,
              weightKg: 2,
              restSec: 60,
              reason: 'first_time',
              variantId: 'dumbbell',
              sides: ['right', 'left'],
            },
          ],
          feedback: { 'supported-row': { effort: 'easy', symptoms: null } },
          checkins: {
            after: { feeling: 'good', symptoms: null, recordedAt: stamp },
          },
        });
        for (const side of ['right', 'left'])
          for (const setNumber of [1, 2])
            tx.objectStore('setLogs').put({
              id: `${id}-${side}-${setNumber}`,
              sessionId: id,
              exerciseId: 'supported-row',
              setNumber,
              side,
              amount,
              weightKg: 2,
              loadIndex: 0,
              variantId: 'dumbbell',
              loggedAt: stamp,
            });
      }
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    });
    await page.goto('/#/historik');
    const progress = page.getByRole('region', {
      name: 'Din utveckling',
      exact: true,
    });
    await expect(progress).toBeVisible();
    await expect(
      progress.getByRole('combobox', { name: 'Övning', exact: true }),
    ).toHaveValue('supported-row');
    await expect(progress.getByText(/Set 1: 12/)).toBeVisible();
    await progress
      .getByRole('button', { name: '12 veckor', exact: true })
      .click();
    await expect(
      progress.getByRole('button', { name: '12 veckor', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await progress.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: test.info().outputPath(`progress-${width}.png`),
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test('personal low-back rehab requires the user to enter a dose', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Jag förstår/ }).click();
  await page
    .getByRole('button', { name: 'Jag har ett eget rehabprogram', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Öppna mitt rehabprogram', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Skapa eget ländryggspass', exact: true })
    .click();
  await expect(
    page.getByRole('heading', {
      name: 'Ländrygg – personligt rehabprogram',
      exact: true,
    }),
  ).toBeVisible();
  const rows = page.locator('ol > li');
  await expect(rows).toHaveCount(3);
  for (let index = 0; index < 3; index++) {
    await rows.nth(index).getByRole('button').first().click();
    await expect(page.getByLabel('Set', { exact: true })).toHaveValue('');
  }
  await expect(
    page.getByRole('button', { name: 'Börja passet', exact: true }),
  ).toBeDisabled();
});

test('a favourite can replace a similar movement without growing the workout', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Jag förstår/ }).click();
  await page.getByRole('button', { name: 'Bli starkare', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Hantlar', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Kettlebell', exact: true }).check();
  await page
    .getByRole('combobox', { name: 'Antal hantlar', exact: true })
    .selectOption('2');
  await page
    .getByRole('combobox', { name: 'Träningsvana', exact: true })
    .selectOption('some');
  await page
    .getByRole('button', { name: 'Visa mitt pass', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Pass A', exact: true }),
  ).toBeVisible();
  await page.goto('/#/ovningar?sok=E39');
  await page.getByRole('button', { name: 'Favorit', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Ta bort favorit', exact: true }),
  ).toBeVisible();
  await page.goto('/#/traning/A');
  await page
    .getByRole('button', { name: 'Anpassa passet', exact: true })
    .click();
  const before = await page.locator('ol > li').count();
  await page
    .getByRole('button', { name: /Hantelpress på golv.*Ändra/ })
    .click();
  await page
    .getByLabel('Byt till en favorit med liknande rörelse')
    .selectOption('kettlebell-floor-press');
  await expect(page.locator('ol > li')).toHaveCount(before);
  await expect(
    page
      .locator('ol > li')
      .filter({ hasText: 'Enarms golvpress med kettlebell' }),
  ).toBeVisible();
  await expect(
    page.locator('ol > li').filter({ hasText: 'Hantelpress på golv' }),
  ).toHaveCount(0);
});

test('new catalogue animations render without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: /Jag förstår/ }).click();
  const frames: { label: string; image: string }[] = [];
  for (let n = 41; n <= 53; n++) {
    await page.goto(`/#/granska?ovning=E${n}`);
    await expect(
      page.getByRole('heading', { name: new RegExp(`^E${n} · `) }),
    ).toBeVisible();
    await page.clock.runFor(2400);
    await page
      .getByRole('button', { name: 'Pausa rörelsen', exact: true })
      .click();
    const stage = page.locator('.exercise-stage');
    expect(await stage.innerHTML()).not.toContain('NaN');
    const image = await stage.screenshot();
    frames.push({ label: `E${n}`, image: image.toString('base64') });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 1200, height: 1000 });
  await page.setContent(
    `<html lang="sv"><body style="margin:16px;background:#eef3f0;font:20px system-ui;display:grid;grid-template-columns:repeat(4,1fr);gap:16px">${frames.map((frame) => `<figure style="margin:0"><figcaption>${frame.label}</figcaption><img width="260" src="data:image/png;base64,${frame.image}"></figure>`).join('')}</body></html>`,
  );
  await page.screenshot({
    path: test.info().outputPath('new-movements.png'),
    fullPage: true,
  });
});
