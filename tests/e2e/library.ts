import type { Page } from '@playwright/test';

/** Opens the library's "Filtrera" panel unless the URL already opened it. */
export async function openLibraryFilters(page: Page) {
  const button = page.getByRole('button', { name: 'Filtrera', exact: true });
  if ((await button.getAttribute('aria-expanded')) === 'false')
    await button.click();
}
