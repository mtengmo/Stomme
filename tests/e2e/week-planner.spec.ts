import { devices, expect, test } from '@playwright/test';
import { quickStart } from './flow';
import { FRESH_STATE } from './state';

test.use({ ...devices['Pixel 7'], storageState: FRESH_STATE });

const CASES = [
  { name: '320x640', viewport: { width: 320, height: 640 }, scale: 100 },
  { name: '390x844', viewport: { width: 390, height: 844 }, scale: 100 },
  { name: '360x640 130%', viewport: { width: 360, height: 640 }, scale: 130 },
] as const;
const SCHEMES = ['light', 'dark'] as const;

async function localWeekdays(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const names = [
      'Måndag',
      'Tisdag',
      'Onsdag',
      'Torsdag',
      'Fredag',
      'Lördag',
      'Söndag',
    ];
    const today = (new Date().getDay() + 6) % 7;
    return {
      today: names[today] as string,
      tomorrow: names[(today + 1) % 7] as string,
    };
  });
}

for (const scenario of CASES)
  for (const colorScheme of SCHEMES) {
    test.describe(`week planner ${scenario.name} ${colorScheme}`, () => {
      test.use({ viewport: scenario.viewport, colorScheme });

      test('suggests, saves and opens today’s planned focus', async ({
        page,
      }, testInfo) => {
        await page.goto('/');
        await page.getByRole('button', { name: /Jag förstår/ }).click();
        await quickStart(page, { goal: 'general' });
        if (scenario.scale !== 100)
          await page.addStyleTag({
            content: `html{font-size:${scenario.scale}%}`,
          });
        await page.goto('/#/');
        await expect(
          page.getByRole('heading', { name: 'Nästa pass' }),
        ).toBeVisible();
        await page.screenshot({
          path: testInfo.outputPath(`home-${scenario.name}-${colorScheme}.png`),
          fullPage: true,
        });

        await page.goto('/#/vecka');
        await expect(
          page.getByRole('heading', { name: 'Planera veckan' }),
        ).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page.getByRole('button', { name: 'Föreslå vecka' }).click();
        await expect(
          page.getByRole('status').filter({ hasText: 'Förslaget visas nedan' }),
        ).toBeVisible();

        const { today, tomorrow } = await localWeekdays(page);
        await page
          .getByRole('combobox', { name: today })
          .selectOption('focus:push');
        await page
          .getByRole('combobox', { name: tomorrow })
          .selectOption('standard');
        await expect(page.getByRole('combobox', { name: today })).toHaveValue(
          'focus:push',
        );
        await expect(
          page.getByRole('combobox', { name: tomorrow }),
        ).toHaveValue('standard');
        await page.screenshot({
          path: testInfo.outputPath(`week-${scenario.name}-${colorScheme}.png`),
          fullPage: true,
        });
        await page.getByRole('button', { name: 'Spara', exact: true }).click();

        await expect(
          page.getByRole('heading', { name: 'Idag: Press', exact: true }),
        ).toBeVisible();
        await expect(
          page.getByText('Dagens fokus: Press', { exact: false }),
        ).toBeVisible();
        await expect(
          page.getByText('Dagens fokus: Helkropp', { exact: false }),
        ).toHaveCount(0);
        await page.screenshot({
          path: testInfo.outputPath(
            `today-${scenario.name}-${colorScheme}.png`,
          ),
          fullPage: true,
        });
        await expect(
          page.getByRole('link', { name: 'Visa nästa pass', exact: true }),
        ).toHaveAttribute('href', /#\/traning\/[AB]\?fokus=push$/);
        await page.getByRole('link', { name: 'Byt', exact: true }).click();
        await expect(page.getByRole('radio', { name: /^Press/ })).toBeChecked();

        await page.goto('/#/vecka');
        await expect(page.getByRole('combobox', { name: today })).toHaveValue(
          'focus:push',
        );
        await expect(
          page.getByRole('combobox', { name: tomorrow }),
        ).toHaveValue('standard');
      });
    });
  }
