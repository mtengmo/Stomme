import { expect, test } from '@playwright/test';

for (const width of [320, 360, 412]) {
  for (const scheme of ['light', 'dark'] as const) {
    test(`exercise results and explicit progression (${width}, ${scheme})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/');
      await page
        .getByRole('heading', { name: /Vad vill du träna|Vecka/ })
        .waitFor();
      await page.evaluate(async () => {
        const open = indexedDB.open('stomme');
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          open.onsuccess = () => resolve(open.result);
          open.onerror = () => reject(open.error);
        });
        const tx = db.transaction(['meta', 'sessions', 'setLogs'], 'readwrite');
        tx.objectStore('meta').put({
          key: 'training',
          value: {
            programId: 'general',
            experience: 'some',
            equipment: ['bodyweight', 'chair', 'support'],
          },
        });
        tx.objectStore('meta').put({
          key: 'customWorkouts',
          value: [
            {
              id: 'progression',
              name: 'Mitt styrkepass',
              exerciseIds: ['knee-push-up'],
            },
          ],
        });
        for (const n of [0, 1, 2]) {
          const date = new Date();
          date.setDate(date.getDate() - (3 - n) * 3);
          const stamp = date.toISOString();
          const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          const id = `progress-${n}`;
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
                exerciseId: 'knee-push-up',
                sets: 3,
                target: 12,
                weightKg: 0,
                loadIndex: 0,
                restSec: 60,
                reason: 'first_time',
                variantId: 'bodyweight',
                sides: ['both'],
              },
            ],
            feedback: { 'knee-push-up': { effort: 'easy', symptoms: null } },
            checkins: {
              after: { feeling: 'good', symptoms: null, recordedAt: stamp },
            },
          });
          for (const setNumber of [1, 2, 3])
            tx.objectStore('setLogs').put({
              id: `${id}-${setNumber}`,
              sessionId: id,
              exerciseId: 'knee-push-up',
              setNumber,
              side: 'both',
              amount: n === 0 ? 9 + setNumber : 12,
              weightKg: 0,
              loadIndex: 0,
              variantId: 'bodyweight',
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
      // Native IndexedDB writes do not invalidate Dexie's in-memory query cache.
      await page.reload();
      const progress = page.getByRole('region', {
        name: 'Din utveckling',
        exact: true,
      });
      const results = progress.getByRole('list', { name: 'Resultat per pass' });
      await expect(results.getByRole('listitem')).toHaveCount(3);
      await expect(results.getByText(/3 × 12/)).toHaveCount(2);
      await expect(results.getByText(/3 set · 10 \/ 11 \/ 12/)).toBeVisible();
      await results.scrollIntoViewIfNeeded();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: test.info().outputPath(`history-${width}-${scheme}.png`),
      });
      await results
        .getByText('Visa pass och svar', { exact: true })
        .first()
        .click();
      await expect(
        results.getByText('Före: Svar saknas').first(),
      ).toBeVisible();
      await results.getByRole('link', { name: 'Öppna passet' }).first().click();
      await expect(page).toHaveURL(/historik\/progress-2/);

      await page.goto('/#/traning/A?workout=progression');
      const next = page.getByRole('region', {
        name: 'Prova nästa nivå',
        exact: true,
      });
      const rows = page.locator('ol > li');
      await expect(rows.first()).toContainText('Armhävning på knä');
      await expect(next).toBeVisible();
      await next.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: test.info().outputPath(`next-level-${width}-${scheme}.png`),
      });
      await next
        .getByRole('button', { name: 'Byt till armhävning', exact: true })
        .click();
      await expect(rows.first()).toContainText('E54');
      await expect(rows.first()).toContainText('3 × 6');
      await expect(next).toHaveCount(0);
      await page.reload();
      await expect(rows.first()).toContainText('E54');
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    });
  }
}
