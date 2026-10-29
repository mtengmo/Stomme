import { expect, test } from '@playwright/test';
import { quickStart } from './flow';

const CONFIRM =
  'Jag har jämfört övningar, sida och antal med mitt papper från fysioterapeuten (krävs för att börja).';

test.use({ viewport: { width: 360, height: 800 } });

async function openProgramme(
  page: import('@playwright/test').Page,
  withBand = true,
) {
  await page.goto('/');
  await quickStart(page, {
    goal: 'physio',
    equipment: withBand ? ['Träningsband'] : [],
    side: 'left',
  });
  await expect(
    page.getByRole('button', { name: 'Börja passet', exact: true }),
  ).toBeVisible();
}

test('physio programme: prefilled overview, confirmation gate, notes and navigation', async ({
  page,
}) => {
  await openProgramme(page);
  await expect(
    page.getByText('Knärehab · Fysioterapeutens program'),
  ).toBeVisible();
  await expect(page.getByText(/Gäller bara om ditt papper/)).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Huvudmeny' }),
  ).toBeVisible();
  await expect(
    page.getByText(/9 av 9 övningar passar din utrustning/),
  ).toBeVisible();
  await expect(page.locator('#ready-workout ~ ol > li')).toHaveCount(9);
  await expect(page.getByText('Stegring av övning 4.')).toBeVisible();
  await expect(
    page.getByText('Nästa steg på papperet: övning 5.'),
  ).toBeVisible();
  await expect(page.getByText(/rekommenderad/i)).toHaveCount(0);

  const start = page.getByRole('button', { name: 'Börja passet', exact: true });
  await expect(start).toBeDisabled();
  await page.getByRole('checkbox', { name: CONFIRM }).check();
  await expect(start).toBeEnabled();

  // Reload keeps the confirmation; any edit clears it.
  await page.reload();
  await expect(page.getByRole('checkbox', { name: CONFIRM })).toBeChecked();
  await page
    .getByRole('button', { name: /^Ändra / })
    .first()
    .click();
  await page.getByLabel('Set', { exact: true }).fill('3');
  await expect(page.getByRole('checkbox', { name: CONFIRM })).not.toBeChecked();
  await expect(start).toBeDisabled();
});

test('physio programme: seven items without a band, fixing it, saved plan wins, balance clock counts laps', async ({
  page,
}) => {
  await openProgramme(page, false);
  await expect(page.locator('#ready-workout ~ ol > li')).toHaveCount(7);
  await expect(
    page.getByText(/Saknas: träningsband \(övning 5, 7\)/),
  ).toBeVisible();
  await expect(
    page.getByText(
      /Papperets övning 5: Knästräckning med gummiband – kräver träningsband/,
    ),
  ).toBeVisible();
  await expect(
    page.getByText(/7 av 9 övningar passar din utrustning/),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Ändra utrustning' }).click();
  await page.getByRole('checkbox', { name: 'Träningsband' }).check();
  await page.getByRole('button', { name: 'Spara min utrustning' }).click();
  await expect(page.locator('#ready-workout ~ ol > li')).toHaveCount(9);
  await expect(
    page.getByText(/9 av 9 övningar passar din utrustning/),
  ).toBeVisible();

  await page
    .getByRole('button', { name: 'Anpassa passet', exact: true })
    .click();
  const rows = page.locator('ol > li > button[aria-expanded]');
  while ((await rows.count()) > 1) {
    await rows.last().click();
    await page.getByRole('button', { name: /^Ta bort / }).click();
  }
  await page.getByRole('checkbox', { name: CONFIRM }).check();
  await page
    .getByRole('button', { name: 'Spara rehabprogram', exact: true })
    .click();
  await expect(page.getByText(/Rehabprogrammet är sparat/)).toBeVisible();
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await expect(page.locator('#ready-workout ~ ol > li')).toHaveCount(1);

  // The saved plan holds one row; swap it for the balance clock through the reset and trim.
  await page
    .getByRole('button', { name: 'Anpassa passet', exact: true })
    .click();
  await page
    .getByText('Återställ till programmets startvärden', { exact: true })
    .first()
    .click();
  await page
    .getByRole('button', { name: 'Återställ till programmets startvärden' })
    .click();
  while ((await rows.count()) > 1) {
    await rows.first().click();
    await page.getByRole('button', { name: /^Ta bort / }).click();
  }
  await expect(rows.first()).toContainText('E53');
  await page.getByRole('checkbox', { name: CONFIRM }).check();
  await page.getByRole('button', { name: 'Börja passet', exact: true }).click();
  await page.getByRole('radio', { name: 'Redo att träna' }).check();
  await page.getByRole('radio', { name: 'Nej, inga besvär' }).check();
  await page.getByRole('button', { name: 'Spara och fortsätt' }).click();
  await expect(
    page.getByText('Räkna varven själv. Tryck Klar set när du är klar.'),
  ).toBeVisible();
});
