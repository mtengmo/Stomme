import { expect, test } from '@playwright/test';
import { addExercise, quickStart, removeAllExercises } from './flow';
import { FRESH_STATE } from './state';

test.use({ storageState: FRESH_STATE });

for (const width of [320, 360, 412]) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`temporary equipment stays isolated (${width} ${colorScheme})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme });
      await page.goto('/');
      await page.getByRole('button', { name: /Jag förstår/ }).click();
      await quickStart(page, { goal: 'general', level: 'some' });
      await page
        .getByText('Annan utrustning för detta pass', { exact: true })
        .click();
      const controls = page.getByRole('region', {
        name: 'Utrustning för detta pass',
      });
      await controls
        .locator('summary', { hasText: 'Justerbara vikter' })
        .click();
      await controls
        .getByRole('checkbox', { name: 'Justerbara kettlebells', exact: true })
        .check();
      const input = controls.getByLabel('Kettlebellvikter (kg)', {
        exact: true,
      });
      const apply = controls.getByRole('button', {
        name: 'Använd utrustningen för detta pass',
      });
      await input.fill('4; 8; 12');
      await input.fill('4; trasigt');
      await expect(apply).toBeDisabled();
      await input.fill('4; 8; 12');
      await apply.click();
      await expect(
        page.getByText('Tillfällig utrustning används för detta pass.'),
      ).toBeVisible();
      await page.reload();
      await expect(
        page.getByText('Tillfällig utrustning används för detta pass.'),
      ).toBeVisible();
      await page
        .getByRole('button', { name: 'Anpassa passet', exact: true })
        .click();
      await removeAllExercises(page);
      await addExercise(page, 'kettlebell-floor-press');
      await expect(
        page.getByRole('spinbutton', { name: /^Total vikt \(kg\)/ }),
      ).toHaveValue('4');
      await page
        .getByRole('spinbutton', { name: /^Total vikt \(kg\)/ })
        .fill('8');
      await page.screenshot({
        path: test.info().outputPath('temporary-plan.png'),
        fullPage: true,
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page
        .getByRole('button', {
          name: 'Återgå till min hemutrustning',
          exact: true,
        })
        .click();
      await expect(
        page.getByText('Tillfällig utrustning används för detta pass.'),
      ).toHaveCount(0);
      await page
        .getByText('Annan utrustning för detta pass', { exact: true })
        .click();
      await controls
        .locator('summary', { hasText: 'Justerbara vikter' })
        .click();
      await expect(
        controls.getByRole('checkbox', {
          name: 'Justerbara kettlebells',
          exact: true,
        }),
      ).not.toBeChecked();
      // A new override uses its own draft; the home workout remains separate.
      await controls
        .getByRole('checkbox', { name: 'Justerbara kettlebells', exact: true })
        .check();
      await input.fill('4; 8; 12');
      await apply.click();
      await expect(
        page.getByRole('spinbutton', { name: /^Total vikt \(kg\)/ }),
      ).toHaveValue('8');
      await page
        .getByRole('button', { name: 'Börja passet', exact: true })
        .click();
      await expect(
        page.getByRole('button', { name: 'Klar set', exact: true }),
      ).toBeVisible();
      await page.reload();
      await expect(
        page.getByRole('button', { name: 'Klar set', exact: true }),
      ).toBeVisible();
      const stored = await page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('stomme');
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        const tx = db.transaction(['sessions', 'meta'], 'readonly');
        const read = <T>(request: IDBRequest<T>) =>
          new Promise<T>((resolve) => {
            request.onsuccess = () => resolve(request.result);
          });
        const sessions = await read(tx.objectStore('sessions').getAll());
        const home = await read(tx.objectStore('meta').get('training'));
        db.close();
        return {
          session: sessions.find((s) => s.status === 'in_progress'),
          home: home.value,
        };
      });
      expect(stored.home.adjustableWeights ?? []).toEqual([]);
      expect(stored.home.adjustableWeights ?? []).toEqual([]);
      expect(
        stored.session.equipmentOverride.adjustableWeights[0].settingsKg,
      ).toEqual([4, 8, 12]);
      expect(stored.session.plan[0].weightKg).toBe(8);
    });
  }
}
