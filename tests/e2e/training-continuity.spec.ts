import { expect, test } from '@playwright/test';
import { quickStart } from './flow';
import { FRESH_STATE } from './state';

test.use({ storageState: FRESH_STATE });

for (const width of [320, 360, 412]) {
  for (const scheme of ['light', 'dark'] as const) {
    test(`saved routines, short workouts and weekly planning (${width}, ${scheme})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/');
      await page.getByRole('button', { name: /Jag förstår/ }).click();
      await quickStart(page, { goal: 'general', level: 'some' });
      await page
        .getByRole('button', { name: 'Anpassa passet', exact: true })
        .click();
      const rows = page.locator('ol > li > button[aria-expanded]');
      await rows.first().click();
      await page.getByLabel('Set', { exact: true }).fill('4');
      await page.getByLabel('Vila (sekunder)', { exact: true }).fill('90');
      await page
        .getByRole('button', { name: 'Flytta ned', exact: true })
        .click();
      const routine = page.getByRole('region', {
        name: 'Mitt pass A',
        exact: true,
      });
      await routine
        .getByText('Behålla ändringar till nästa gång?', { exact: true })
        .click();
      await routine
        .getByRole('button', { name: 'Behåll som mitt pass A', exact: true })
        .click();
      await expect(routine.getByRole('status')).toHaveText(
        'Ditt pass A är sparat till nästa gång.',
      );
      await page
        .getByRole('button', { name: 'Visa passöversikt', exact: true })
        .click();
      await page
        .getByRole('region', { name: /Ditt pass/ })
        .scrollIntoViewIfNeeded();
      await page.screenshot({
        path: test.info().outputPath(`routine-${width}-${scheme}.png`),
      });

      // A new tab/session must restore the saved normal routine, not the old draft.
      await page.evaluate(() => sessionStorage.clear());
      await page.reload();
      await page
        .getByRole('button', { name: 'Anpassa passet', exact: true })
        .click();
      await rows.nth(1).click();
      await expect(page.getByLabel('Set', { exact: true })).toHaveValue('4');
      await expect(
        page.getByLabel('Vila (sekunder)', { exact: true }),
      ).toHaveValue('90');
      await page.getByLabel('Set', { exact: true }).fill('1');
      await page.evaluate(() => sessionStorage.clear());
      await page.reload();
      // The one-off edit did not overwrite the four-set saved routine.
      await page
        .getByRole('button', { name: 'Anpassa passet', exact: true })
        .click();
      await rows.nth(1).click();
      await expect(page.getByLabel('Set', { exact: true })).toHaveValue('4');

      const shortButton = page.getByRole('button', { name: /^Kortpass · ca/ });
      await shortButton.click();
      await expect(shortButton).toHaveAttribute('aria-pressed', 'true');
      await expect(routine).toHaveCount(0);
      await expect(
        page.getByText(/Vila, tempo och vikt behålls/),
      ).toBeVisible();
      await page.screenshot({
        path: test.info().outputPath(`short-${width}-${scheme}.png`),
      });
      await page.reload();
      await expect(shortButton).toHaveAttribute('aria-pressed', 'true');
      await page.getByRole('button', { name: /^Helt pass · ca/ }).click();
      await expect(routine).toBeVisible();
      await shortButton.click();
      await page
        .getByRole('button', { name: 'Börja kortpasset', exact: true })
        .click();
      await expect(page.locator('[data-step]')).toBeVisible();
      await expect(
        page.getByText(/^Kortpass · Allmän styrka · A/),
      ).toBeVisible();

      // Finish the synthetic short record to check ordinary A/B and history boundaries.
      await page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const open = indexedDB.open('stomme');
          open.onsuccess = () => resolve(open.result);
          open.onerror = () => reject(open.error);
        });
        const tx = db.transaction(['sessions', 'meta'], 'readwrite');
        const sessions = tx.objectStore('sessions');
        const request = sessions.getAll();
        request.onsuccess = () => {
          const session = request.result.find(
            (item) => item.status === 'in_progress',
          );
          if (
            session?.workoutMode !== 'short' ||
            !session.fullPlan ||
            session.plan.length > session.fullPlan.length
          )
            throw new Error('Missing short workout provenance');
          sessions.put({
            ...session,
            status: 'completed',
            finishedAt: new Date().toISOString(),
          });
        };
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        db.close();
      });
      await page.goto('/#/historik');
      await page.reload();
      await expect(
        page.getByRole('link', { name: /Kortpass A/ }).first(),
      ).toBeVisible();
      await page.goto('/');
      await expect(
        page.getByText('Allmän styrka · Pass A', { exact: true }),
      ).toBeVisible();
      const weekly = page.getByRole('region', {
        name: 'Veckoplan',
        exact: true,
      });
      await expect(
        weekly.getByText('Klart den här veckan:', { exact: false }),
      ).toContainText('1');
      await weekly
        .locator('summary')
        .filter({ hasText: /^Välj träningsdagar$/ })
        .click();
      await weekly.getByRole('button', { name: 'Måndag', exact: true }).click();
      await expect(
        weekly.getByRole('button', { name: 'Måndag', exact: true }),
      ).toHaveAttribute('aria-pressed', 'true');
      await weekly
        .getByRole('button', { name: 'Torsdag', exact: true })
        .click();
      await expect(
        weekly.getByRole('button', { name: 'Torsdag', exact: true }),
      ).toHaveAttribute('aria-pressed', 'true');
      await weekly.getByText('Ändra veckoplan', { exact: true }).click();
      await page.reload();
      await weekly.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: test.info().outputPath(`week-${width}-${scheme}.png`),
      });
      await weekly.getByText('Ändra veckoplan', { exact: true }).click();
      await expect(
        weekly.getByRole('button', { name: 'Måndag', exact: true }),
      ).toHaveAttribute('aria-pressed', 'true');
      await expect(
        weekly.getByRole('button', { name: 'Torsdag', exact: true }),
      ).toHaveAttribute('aria-pressed', 'true');
      const date = new Date();
      date.setDate(date.getDate() + 10);
      const moveDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      await weekly.getByLabel(/^Flytta nästa pass från/).fill(moveDate);
      await weekly
        .getByRole('button', { name: 'Flytta pass', exact: true })
        .click();
      await expect(
        weekly.getByRole('button', { name: 'Återställ flytt', exact: true }),
      ).toBeVisible();
      await weekly
        .getByRole('button', { name: 'Återställ flytt', exact: true })
        .click();
      await expect(
        weekly.getByRole('button', { name: 'Återställ flytt', exact: true }),
      ).toHaveCount(0);
      await weekly.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: test.info().outputPath(`week-editor-${width}-${scheme}.png`),
      });
      const smallTargets = await weekly
        .locator('button, input, summary')
        .evaluateAll((elements) =>
          elements
            .filter((element) => {
              const rect = element.getBoundingClientRect();
              return (
                rect.width > 0 &&
                rect.height > 0 &&
                (rect.height < 47.5 || rect.width < 47.5)
              );
            })
            .map((element) => element.textContent?.trim() || element.tagName),
        );
      expect(smallTargets).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    });
  }
}
