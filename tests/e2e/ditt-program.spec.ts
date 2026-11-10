import { devices, expect, type Page, test } from '@playwright/test';
import { playRunningSession } from './flow';
import { FRESH_STATE } from './state';

// First-use journey of the programme: onboarding, days, emphasis, equipment, level,
// the reveal, the preview of programme pass 1 and the programme Home after a pass.
test.use({ ...devices['Pixel 7'], storageState: FRESH_STATE });

const CASES = [
  { name: '320x640', viewport: { width: 320, height: 640 }, scale: 100 },
  { name: '390x844', viewport: { width: 390, height: 844 }, scale: 100 },
  { name: '360x640 130%', viewport: { width: 360, height: 640 }, scale: 130 },
] as const;
const SCHEMES = ['light', 'dark'] as const;
const SHOTS = process.env.PROGRAM_SHOTS
  ? '.impeccable/review/program-final'
  : null;

async function scaleText(page: Page, scale: number) {
  if (scale !== 100)
    await page.addStyleTag({ content: `html{font-size:${scale}%}` });
}

async function expectNoSideScroll(page: Page, label: string) {
  const over = await page.evaluate(
    () => document.documentElement.scrollWidth - innerWidth,
  );
  expect(over, `${label}: horizontal overflow`).toBeLessThanOrEqual(0);
}

async function expectNoClipping(page: Page, label: string) {
  // Nothing inside the page may poke out past the right edge of the screen.
  const wide = await page.evaluate(() =>
    [...document.querySelectorAll('main *')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.right > innerWidth + 1;
      })
      .map((el) => el.tagName + (el.textContent ?? '').slice(0, 20)),
  );
  expect(wide, `${label}: elements past the right edge`).toEqual([]);
}

/** Walks onboarding up to the reveal; `days` defaults to the preselected 2. */
async function toReveal(
  page: Page,
  days: 1 | 2 | 3 | 4 | 5 = 2,
  nav = { checked: 0 },
): Promise<void> {
  const mainNav = page.getByRole('navigation', { name: 'Huvudmeny' });
  const noNav = async () => {
    await expect(mainNav).toHaveCount(0);
    nav.checked += 1;
  };
  await page.goto('/');
  await page.getByRole('button', { name: /Jag förstår/ }).click();
  await expect(page).toHaveURL(/#\/kom-igang/);
  await noNav();
  await page.getByRole('button', { name: 'Bli starkare', exact: true }).click();

  await expect(
    page.getByRole('heading', { name: 'Hur många dagar i veckan?' }),
  ).toBeVisible();
  await noNav();
  await page
    .getByRole('radio', { name: days === 1 ? '1 dag' : `${days} dagar` })
    .check();
  await page.getByRole('button', { name: 'Nästa', exact: true }).click();

  await expect(
    page.getByRole('heading', { name: 'Vad vill du få ut mest av?' }),
  ).toBeVisible();
  await noNav();
  await page.getByRole('radio', { name: 'Hela kroppen' }).check();
  await page.getByRole('button', { name: 'Nästa', exact: true }).click();

  await expect(
    page.getByRole('heading', { name: 'Vad tränar du med?' }),
  ).toBeVisible();
  await noNav();
  await page.getByRole('button', { name: 'Nästa', exact: true }).click();

  await expect(
    page.getByRole('heading', { name: 'Hur van är du vid styrketräning?' }),
  ).toBeVisible();
  await noNav();
  await page.getByRole('radio', { name: /Ny eller på väg tillbaka/ }).check();
  await page.getByRole('button', { name: 'Visa mitt program' }).click();
  await expect(page).toHaveURL(/#\/program(?:\?|$)/);
}

async function expectCleanReveal(page: Page) {
  await expect(page.getByText('Vecka 1 av 4')).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Starta första passet' }),
  ).toBeVisible();
  await expect(page.getByText('Saknas')).toHaveCount(0);
  const text = (await page.locator('main').innerText()) ?? '';
  expect(text).not.toMatch(/\bE\d{2,3}\b/);
}

for (const scenario of CASES)
  for (const colorScheme of SCHEMES) {
    test.describe(`ditt program ${scenario.name} ${colorScheme}`, () => {
      test.use({ viewport: scenario.viewport, colorScheme });

      test('onboarding to reveal to preview to Home after a pass', async ({
        page,
      }, testInfo) => {
        test.setTimeout(120_000);
        const nav = { checked: 0 };
        await toReveal(page, 2, nav);
        // The nav stayed hidden on every onboarding step.
        expect(nav.checked).toBe(5);
        await scaleText(page, scenario.scale);
        await expectCleanReveal(page);
        await expectNoSideScroll(page, 'reveal');
        await expectNoClipping(page, 'reveal');
        const start = page.getByRole('link', { name: 'Starta första passet' });
        await expect(start).toBeInViewport({ ratio: 1 });
        // The nav is back once the programme is saved.
        await expect(
          page.getByRole('navigation', { name: 'Huvudmeny' }),
        ).toBeVisible();
        if (SHOTS)
          await page.screenshot({
            path: `${SHOTS}/reveal-${scenario.name.replace(' ', '-')}-${colorScheme}.png`,
            fullPage: true,
          });

        await start.click();
        await expect(page).toHaveURL(/#\/traning\/A\?program=1$/);
        const begin = page.getByRole('button', {
          name: 'Starta passet',
          exact: true,
        });
        await expect(begin).toBeVisible();
        await expectNoSideScroll(page, 'preview');
        expect(await page.locator('main').innerText()).not.toMatch(
          /\bE\d{2,3}\b/,
        );
        await begin.click();
        await expect(page).toHaveURL(/#\/session\//);
        await playRunningSession(page);

        // Programme Home: week 1, one pass done of eight, pass 2 is next.
        await expect(
          page.getByRole('heading', { name: /^Vecka 1/ }),
        ).toBeVisible();
        await expect(
          page.getByRole('region', { name: /Nästa pass: Pass 2/ }),
        ).toBeVisible();
        await expect(
          page.getByRole('link', { name: 'Starta passet', exact: true }),
        ).toHaveAttribute('href', /#\/traning\/A\?program=2$/);
        await expect(page.getByText('Saknas')).toHaveCount(0);
        await expectNoSideScroll(page, 'programme home');
        await expectNoClipping(page, 'programme home');
        if (SHOTS)
          await page.screenshot({
            path: `${SHOTS}/home-${scenario.name.replace(' ', '-')}-${colorScheme}.png`,
            fullPage: true,
          });
        void testInfo;
      });
    });
  }

// One pass a week: the first pass finishes the week and the tick is drawn once.
test.describe('week tick', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const motion of ['reduce', 'no-preference'] as const)
    test(`finishing the week draws the tick (${motion})`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.emulateMedia({ reducedMotion: motion });
      await toReveal(page, 1);
      await page.getByRole('link', { name: 'Starta första passet' }).click();
      await page
        .getByRole('button', { name: 'Starta passet', exact: true })
        .click();
      await playRunningSession(page);
      const tick = page.getByTestId('week-tick');
      await expect(tick).toBeVisible();
      await expect(page.getByText('Vecka 1 klar')).toBeVisible();
      await expect(tick).toHaveAttribute(
        'data-animated',
        motion === 'reduce' ? 'false' : 'true',
      );
      await expectNoSideScroll(page, `week tick ${motion}`);
      // Returning later never replays the stroke.
      await page.reload();
      await expect(page.getByTestId('week-tick')).toHaveAttribute(
        'data-animated',
        'false',
      );
    });
});

test('running emphasis with one day can start from a ready workout', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/');
  await page.getByRole('button', { name: /Jag förstår/ }).click();
  const mainNav = page.getByRole('navigation', { name: 'Huvudmeny' });
  const next = page.getByRole('button', { name: 'Nästa', exact: true });
  let hidden = 0;
  const noNav = async () => {
    await expect(mainNav).toHaveCount(0);
    hidden += 1;
  };
  await noNav();
  await page.getByRole('button', { name: 'Bli starkare', exact: true }).click();
  await noNav();
  await page.getByRole('radio', { name: '1 dag' }).check();
  await next.click();
  await noNav();
  await page.getByRole('radio', { name: 'Ben & bål för löpning' }).check();
  await next.click();
  await expect(
    page.getByRole('heading', { name: 'Hur vill du lägga upp passen?' }),
  ).toBeVisible();
  await noNav();
  await expectNoSideScroll(page, 'plan step');
  await expectNoClipping(page, 'plan step');
  const scaled = await page.addStyleTag({ content: 'html{font-size:130%}' });
  await expectNoSideScroll(page, 'plan step 130%');
  await expectNoClipping(page, 'plan step 130%');
  await scaled.evaluate((el) => (el as HTMLElement).remove());
  await page.getByRole('radio', { name: 'Löpstyrka' }).check();
  await next.click();
  await noNav();
  await next.click();
  await noNav();
  await page.getByRole('radio', { name: /Ny eller på väg tillbaka/ }).check();
  await page.getByRole('button', { name: 'Visa mitt program' }).click();
  await expect(page).toHaveURL(/#\/program(?:\?|$)/);
  // Goal, days, emphasis, plan, equipment and level.
  expect(hidden).toBe(6);
  await expect(
    page.getByRole('region', { name: 'Nästa pass: Pass 1, Löpstyrka' }),
  ).toBeVisible();
  await expect(page.getByText('Armhävning på knä')).toHaveCount(0);
  await expectNoSideScroll(page, 'reveal');
});
