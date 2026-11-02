import { expect, test } from '@playwright/test';
import { freezeClock, startOnlyExercise } from './flow';

for (const viewport of [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 1280, height: 900 },
]) {
  test(`movement and inline technique retain the edited amount (${viewport.width})`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await startOnlyExercise(page, 'goblet-chair-squat');
    await expect(page.getByText('· Kroppsvikt', { exact: true })).toBeVisible();
    await page.getByText('Ändra set', { exact: true }).click();
    await page.getByRole('button', { name: 'Öka antal' }).click();
    await page.getByText('Ändra set', { exact: true }).click();
    await expect(page.getByText('11 reps')).toBeVisible();
    await page.getByText('Hur gör man?', { exact: true }).click();
    const technique = page.getByRole('region', { name: 'Teknik', exact: true });
    await expect(
      technique.getByRole('listitem').filter({
        hasText: 'Ställ en stadig stol bakom dig.',
      }),
    ).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Rörelsen' })).toBeInViewport(
      { ratio: 1 },
    );
    // Instructions expand into the main reader, never a tiny nested scroller.
    expect(
      await page
        .getByRole('region', { name: 'Inställningar och teknik' })
        .evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
    ).toBe(true);
    const muscles = technique.getByRole('region', {
      name: 'Muskelgrupper',
      exact: true,
    });
    await expect(muscles).toContainText('Framsida lår, Säte');
    await expect(muscles).toContainText('Bål');
    await muscles.getByText('Visa muskelkarta', { exact: true }).click();
    await expect(
      muscles.getByRole('region', { name: 'Muskler', exact: true }),
    ).toBeVisible();
    await muscles.screenshot({
      path: test.info().outputPath('muscles-in-howto.png'),
    });
    await muscles.getByText('Visa muskelkarta', { exact: true }).click();
    await expect(
      technique.getByRole('heading', { name: 'Så gör du', exact: true }),
    ).toBeVisible();
    const easier = technique.getByRole('heading', { name: 'Enklare variant' });
    await easier.scrollIntoViewIfNeeded();
    await expect(easier).toBeInViewport({ ratio: 1 });
    await page.screenshot({
      path: test.info().outputPath('inline-technique.png'),
    });
    await page.getByText('Hur gör man?', { exact: true }).click();
    // The edited amount survives opening and closing the technique.
    await expect(page.getByText('11 reps')).toBeVisible();
  });
}

for (const mode of [
  {
    name: 'short landscape',
    viewport: { width: 800, height: 480 },
    fontScale: 1,
  },
  { name: '200% text', viewport: { width: 360, height: 800 }, fontScale: 2 },
]) {
  test(`technique remains accessible (${mode.name})`, async ({ page }) => {
    await page.setViewportSize(mode.viewport);
    await startOnlyExercise(page, 'goblet-chair-squat');
    await page.evaluate((scale) => {
      document.documentElement.style.fontSize = `${scale * 100}%`;
    }, mode.fontScale);
    await page.getByText('Hur gör man?', { exact: true }).click();
    const technique = page.getByRole('region', { name: 'Teknik', exact: true });
    const easier = technique.getByRole('heading', { name: 'Enklare variant' });
    await easier.scrollIntoViewIfNeeded();
    await expect(easier).toBeInViewport({ ratio: 1 });
    expect(
      await page
        .locator('[data-step]')
        .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
    await expect(
      page.getByRole('button', { name: 'Klar set', exact: true }),
    ).toBeInViewport();
  });
}

for (const width of [360, 390, 1280]) {
  test(`timer, movement and completion fit together (${width})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 1280 ? 900 : 800 });
    await startOnlyExercise(page, 'side-plank', { sets: 2 });
    await expect(
      page.getByRole('heading', { name: 'Sidoplanka', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/Sedan: Vänster sida nedåt. Du får 5 sekunder/),
    ).toBeVisible();
    const frame = page.locator('[data-step]');
    const step = await frame.getAttribute('data-step');
    await freezeClock(page);
    const start = page.getByRole('button', { name: /^Starta –/ });
    await expect(start).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole('region', { name: 'Rörelsen' })).toBeInViewport(
      { ratio: 1 },
    );
    await start.click();
    await expect(page.getByRole('timer')).toHaveText('0:05');
    await page.clock.fastForward(5_000);
    await expect(page.getByRole('timer')).toHaveText('0:20');
    await expect(page.getByRole('timer')).toBeInViewport({ ratio: 1 });
    await page.clock.fastForward(5_000);
    await page
      .getByRole('button', { name: 'Pausa timer', exact: true })
      .click();
    await expect(page.getByRole('timer')).toHaveText('0:15');
    await page.clock.fastForward(10_000);
    await expect(page.getByRole('timer')).toHaveText('0:15');
    await expect(frame).toHaveAttribute('data-step', step ?? '');
    await page
      .getByRole('button', { name: 'Fortsätt timer', exact: true })
      .click();
    await page.clock.fastForward(15_000);
    await expect(
      page.getByText('Vänster sida nedåt', { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('timer')).toHaveText('0:05');
    await page.clock.fastForward(5_000);
    await expect(page.getByRole('timer')).toHaveText('0:20');
    await page.screenshot({
      path: test.info().outputPath('hands-free-hold.png'),
    });
    await page.clock.fastForward(20_000);
    await expect(
      page.getByRole('heading', { name: 'Vila', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('timer')).toHaveText('1:00');
    await page.getByRole('button', { name: 'Pausa vila', exact: true }).click();
    await page.clock.fastForward(10_000);
    await expect(page.getByRole('timer')).toHaveText('1:00');
    await page
      .getByRole('button', { name: 'Fortsätt vila', exact: true })
      .click();
    await page.clock.fastForward(60_000);
    await expect(
      page.getByText('Höger sida nedåt', { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('timer')).toHaveText('0:05');
    await page.clock.fastForward(5_000);
    await expect(page.getByRole('timer')).toHaveText('0:20');
    await page.clock.fastForward(20_000);
    await expect(
      page.getByText('Vänster sida nedåt', { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('timer')).toHaveText('0:05');
    await page.clock.fastForward(5_000);
    await expect(page.getByRole('timer')).toHaveText('0:20');
    await page.clock.fastForward(20_000);
    await expect(
      page.getByRole('heading', { name: 'Hur ansträngande var övningen?' }),
    ).toBeVisible();
    const logged = await page.evaluate(
      () =>
        new Promise<Array<{ side: string; setNumber: number; amount: number }>>(
          (resolve, reject) => {
            const open = indexedDB.open('stomme');
            open.onerror = () => reject(open.error);
            open.onsuccess = () => {
              const db = open.result;
              const read = db
                .transaction('setLogs')
                .objectStore('setLogs')
                .getAll();
              read.onerror = () => {
                db.close();
                reject(read.error);
              };
              read.onsuccess = () => {
                const rows = read.result as Array<{
                  exerciseId: string;
                  side: string;
                  setNumber: number;
                  amount: number;
                  loggedAt: string;
                }>;
                resolve(
                  rows
                    .filter((row) => row.exerciseId === 'side-plank')
                    .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))
                    .map(({ side, setNumber, amount }) => ({
                      side,
                      setNumber,
                      amount,
                    })),
                );
                db.close();
              };
            };
          },
        ),
    );
    expect(logged).toEqual([
      { side: 'right', setNumber: 1, amount: 20 },
      { side: 'left', setNumber: 1, amount: 20 },
      { side: 'right', setNumber: 2, amount: 20 },
      { side: 'left', setNumber: 2, amount: 20 },
    ]);
  });
}
