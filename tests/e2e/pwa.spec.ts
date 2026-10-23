import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'allow' });

test('manifest is served, icons resolve, service worker registers', {
  tag: '@smoke',
}, async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const res = await request.get(href as string);
  expect(res.ok()).toBe(true);
  const m = await res.json();
  expect(m).toMatchObject({
    name: 'Stomme',
    short_name: 'Stomme',
    lang: 'sv',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
  });
  const sizes = m.icons.map(
    (i: { sizes: string; purpose?: string }) =>
      `${i.sizes}:${i.purpose ?? 'any'}`,
  );
  expect(sizes).toEqual(['192x192:any', '512x512:any', '512x512:maskable']);
  for (const icon of m.icons) {
    const r = await request.get(`/${icon.src}`);
    expect(r.ok()).toBe(true);
    expect(r.headers()['content-type']).toContain('image/png');
    const body = await r.body();
    const [width, height] = icon.sizes.split('x').map(Number);
    expect(body.readUInt32BE(16)).toBe(width);
    expect(body.readUInt32BE(20)).toBe(height);
  }
  await expect(
    page.locator('meta[name="apple-mobile-web-app-capable"]'),
  ).toHaveAttribute('content', 'yes');
  const appleIcon = await page
    .locator('link[rel="apple-touch-icon"]')
    .getAttribute('href');
  const appleResponse = await request.get(appleIcon as string);
  expect(appleResponse.ok()).toBe(true);
  const appleBody = await appleResponse.body();
  expect(appleBody.readUInt32BE(16)).toBe(180);
  expect(appleBody.readUInt32BE(20)).toBe(180);
  await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1);
  const scope = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return reg.scope;
  });
  expect(scope).toMatch(/\/$/);
});
