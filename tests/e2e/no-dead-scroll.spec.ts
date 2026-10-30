import { devices, expect, type Page, test } from '@playwright/test';
import { playPassA, quickStart, type Stage } from './flow';
import { FRESH_STATE } from './state';

// A phone-sized viewport (Samsung S23 in Chrome with the address bar visible).
// Pages whose content fits must not scroll; the primary action must never
// need a scroll to reach. Long lists (library, picker, preview) are by design.
test.use({ ...devices['Pixel 7'], storageState: FRESH_STATE });

const SCHEMES = ['light', 'dark'] as const;
const SIZES = [
  { width: 360, height: 680, scale: 100 },
  { width: 360, height: 640, scale: 100 },
  { width: 360, height: 640, scale: 130 },
];

async function setScale(page: Page, scale: number) {
  if (scale === 100) return;
  await page.addStyleTag({ content: `html{font-size:${scale}%}` });
}

async function overflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const d = document.scrollingElement ?? document.documentElement;
    return d.scrollHeight - innerHeight;
  });
}

async function expectNoScroll(page: Page, label: string) {
  // Let late layout (lazy route, live query) settle before measuring.
  await page.waitForTimeout(300);
  const over = await overflow(page);
  expect(over, `${label}: ${over}px of scroll`).toBeLessThanOrEqual(1);
}

/**
 * Content that is genuinely longer than the screen may scroll, but the page may
 * not add dead space under it: bottom padding is the fixed nav plus a little air.
 */
async function expectNavClearance(page: Page, label: string) {
  const { pad, nav } = await page.evaluate(() => {
    const wrap = document.querySelector('main > *');
    const navEl = document.querySelector('nav[aria-label="Huvudmeny"]');
    return {
      pad: wrap ? Number.parseFloat(getComputedStyle(wrap).paddingBottom) : 0,
      nav: navEl?.getBoundingClientRect().height ?? 0,
    };
  });
  expect(pad, `${label}: padding-bottom ${pad}px`).toBeGreaterThanOrEqual(nav);
  expect(pad, `${label}: padding-bottom ${pad}px`).toBeLessThanOrEqual(
    nav + 24,
  );
}

for (const scheme of SCHEMES)
  for (const size of SIZES) {
    const { scale, ...viewport } = size;
    const tag = `${viewport.width}x${viewport.height} ${scale}% ${scheme}`;
    test.describe(`no dead scroll ${tag}`, () => {
      test.use({ viewport, colorScheme: scheme });

      test('welcome fits and shows the primary button', async ({ page }) => {
        await page.goto('/');
        await setScale(page, scale);
        const button = page.getByRole('button', { name: /Jag förstår/ });
        await expect(button).toBeInViewport({ ratio: 1 });
        // 130 % text may legitimately need to scroll a little; the button may not.
        if (scale === 100) await expectNoScroll(page, 'welcome');
      });

      test('setup steps keep the action bar small and the page still', async ({
        page,
      }) => {
        await page.goto('/');
        await page.getByRole('button', { name: /Jag förstår/ }).click();
        await setScale(page, scale);
        await quickStart(page, { goal: 'general', finish: 'equipment' });
        const next = page.getByRole('button', { name: 'Nästa', exact: true });
        await expect(next).toBeInViewport({ ratio: 1 });
        // Fixed chrome above the bottom nav: one slim bar, not two.
        const bar = await next.evaluate((el) => {
          let node: HTMLElement | null = el.parentElement;
          while (node && getComputedStyle(node).position !== 'sticky')
            node = node.parentElement;
          return node?.getBoundingClientRect().height ?? 0;
        });
        if (scale === 100) expect(bar).toBeLessThanOrEqual(110);
        await next.click();
        await expect(
          page.getByRole('radio', { name: /Viss vana/ }),
        ).toBeVisible();
        await expect(next).toBeInViewport({ ratio: 1 });
        await expectNavClearance(page, 'setup level');
      });

      test('Home after setup does not scroll', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('button', { name: /Jag förstår/ }).click();
        await quickStart(page, { goal: 'general' });
        await page.goto('/#/');
        await expect(
          page.getByRole('heading', { name: /pass/i }).first(),
        ).toBeVisible();
        await setScale(page, scale);
        await expect(
          page.getByRole('link', { name: 'Visa nästa pass' }),
        ).toBeInViewport({ ratio: 1 });
        await expectNavClearance(page, 'home');
      });
    });
  }

const PRIMARY =
  /^(Klar set|Hoppa över vila|Avsluta pass|Spara|Starta – 5 s förberedelse)$/;

for (const size of SIZES) {
  const { scale, ...viewport } = size;
  test.describe(`workout screens ${viewport.width}x${viewport.height} ${scale}%`, () => {
    test.use({ viewport });

    test('the primary action and the current exercise stay in view', async ({
      page,
    }) => {
      const problems: string[] = [];
      const check = async (stage: Stage) => {
        if (stage === 'preview') return;
        await setScale(page, scale);
        await page.waitForTimeout(250);
        // The effort question is the primary action only on its own screen;
        // beside the rest timer it is an optional answer in the scrolling part.
        const effortScreen =
          (await page
            .getByRole('heading', { name: /Hur ansträngande/ })
            .count()) > 0;
        const action = page
          .getByRole('button', {
            name: effortScreen ? 'Lagom' : PRIMARY,
            exact: effortScreen,
          })
          .or(page.getByRole('link', { name: 'Till träningen' }))
          .first();
        await action.waitFor();
        const box = await action.boundingBox();
        const heading = await page.locator('h1').first().boundingBox();
        const vh = viewport.height;
        if (!box || box.y < 0 || box.y + box.height > vh + 0.5)
          problems.push(`${stage}: primary action out of view`);
        if (!heading || heading.y < 0 || heading.y + heading.height > vh)
          problems.push(`${stage}: heading out of view`);
      };
      await playPassA(page, check);
      expect(problems).toEqual([]);
    });
  });
}

for (const height of [680, 780])
  for (const scale of [100, 130])
    test.describe(`session frame is locked 360x${height} ${scale}% dark`, () => {
      test.use({ viewport: { width: 360, height }, colorScheme: 'dark' });

      test('the document never scrolls and the chrome stays put', async ({
        page,
      }) => {
        const problems: string[] = [];
        const vh = height;
        const check = async (stage: Stage) => {
          if (stage === 'preview') return;
          await setScale(page, scale);
          await page.waitForTimeout(250);
          const frame = page.locator('.session-frame');
          if ((await frame.count()) === 0) return; // pain / summary are plain pages
          const inner = page.locator('.session-content');
          await inner.hover();
          await page.mouse.wheel(0, 4000);
          await page.waitForTimeout(250);
          const m = await page.evaluate(() => {
            const d = document.scrollingElement ?? document.documentElement;
            const r = (s: string) =>
              document.querySelector(s)?.getBoundingClientRect();
            const bar = document.querySelector(
              '.session-frame > div:last-child',
            );
            const abort = [...document.querySelectorAll('button')].find(
              (b) => b.textContent?.trim() === 'Avbryt',
            );
            return {
              over: d.scrollHeight - innerHeight,
              y: scrollY,
              abort: abort?.getBoundingClientRect().bottom ?? -1,
              abortTop: abort?.getBoundingClientRect().top ?? -1,
              barBottom: bar?.getBoundingClientRect().bottom ?? -1,
              contentTop: r('.session-content')?.top ?? -1,
              tallyBottom:
                document
                  .querySelector('.session-frame > div:nth-child(2)')
                  ?.getBoundingClientRect().bottom ?? -1,
            };
          });
          if (m.over > 1)
            problems.push(`${stage}: document overflow ${m.over}`);
          if (m.y !== 0) problems.push(`${stage}: scrollY ${m.y}`);
          if (m.abortTop < 0 || m.abort > vh)
            problems.push(`${stage}: Avbryt out of view`);
          if (Math.abs(m.barBottom - vh) > 1)
            problems.push(`${stage}: bar bottom ${m.barBottom} vs ${vh}`);
          if (m.contentTop < m.tallyBottom - 1)
            problems.push(`${stage}: content overlaps tally`);
          await inner.evaluate((el) => el.scrollTo(0, 0));
          const h1 = await page.locator('h1').first().boundingBox();
          if (h1 && h1.y < m.tallyBottom - 1)
            problems.push(`${stage}: title under the tally row`);
        };
        await playPassA(page, check);
        expect(problems).toEqual([]);
      });
    });
