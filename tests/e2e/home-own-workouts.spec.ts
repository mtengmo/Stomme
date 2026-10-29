import { expect, test } from '@playwright/test';
import { addWeight, quickStart } from './flow';
import { FRESH_STATE } from './state';

// Covers onboarding or training setup, so it starts from a first visit.
test.use({ storageState: FRESH_STATE });

const cases = [
  { width: 360, scheme: 'light' },
  { width: 320, scheme: 'dark' },
] as const;

for (const { width, scheme } of cases) {
  test(`own workouts stay reachable while a preparation exists (${width}, ${scheme})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/');
    await page.getByRole('button', { name: /Jag förstår/ }).click();
    await quickStart(page, {
      goal: 'general',
      onEquipment: (p) => addWeight(p, { type: 'kettlebell', count: 1, kg: 8 }),
    });
    // Save one own workout from the library.
    await page.goto('/#/ovningar');
    await page.getByLabel('Sök övning').fill('E39');
    await page
      .getByRole('button', { name: /^Välj: / })
      .first()
      .click();
    await page
      .getByRole('region', { name: 'Valda övningar' })
      .getByRole('button', { name: 'Skapa pass', exact: true })
      .click();
    await expect(page).toHaveURL(/#\/traning\/A\?workout=/);

    // Open a standard pass and make a preparation without starting it.
    await page.goto('/#/traning/A');
    await page
      .getByText('Besvär eller något att anpassa idag?', { exact: true })
      .click();
    await page
      .getByRole('checkbox', { name: /Fråga hur kroppen känns före passet/ })
      .check();
    await page
      .getByRole('button', { name: 'Börja passet', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Hur känns kroppen?', exact: true }),
    ).toBeVisible();

    await page.goto('/#/');
    await expect(
      page.getByRole('heading', { name: 'Förbered ditt pass', exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Eller kör ett eget pass:')).toBeVisible();
    const list = page.getByRole('region', { name: 'Mina pass' });
    await expect(list).toBeVisible();
    await expect(page.getByText('Avsluta passet först.')).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath(`home-own-${width}-${scheme}.png`),
      fullPage: true,
    });

    await list.getByRole('link', { name: /^Visa och starta:/ }).click();
    await expect(page).toHaveURL(/#\/traning\/A\?workout=/);
    await page
      .getByRole('button', { name: 'Börja passet', exact: true })
      .click();
    await expect(page).toHaveURL(/#\/session\//);

    const sessions = await page.evaluate(async () => {
      const dbs = await indexedDB.databases();
      const name = dbs[0]?.name;
      if (!name) return [];
      return new Promise<{ status: string; custom?: string }[]>((resolve) => {
        const open = indexedDB.open(name);
        open.onsuccess = () => {
          const all = open.result
            .transaction('sessions')
            .objectStore('sessions')
            .getAll();
          all.onsuccess = () => {
            open.result.close();
            resolve(
              all.result.map((s) => ({
                status: s.status,
                custom: s.customWorkoutId,
              })),
            );
          };
        };
      });
    });
    expect(sessions.filter((s) => s.status === 'in_progress')).toHaveLength(1);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.custom).toBeTruthy();

    // Once a set is logged the session is running and locks the list.
    await page.getByRole('button', { name: 'Klar set', exact: true }).click();
    await page.goto('/#/');
    await expect(page.getByText('Avsluta passet först.')).toBeVisible();
    await expect(page.getByText('Eller kör ett eget pass:')).toHaveCount(0);
  });
}
