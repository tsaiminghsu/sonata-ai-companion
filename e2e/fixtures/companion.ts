import { Page, expect } from '@playwright/test';

/** Creates a companion via the UI and returns its id (parsed from the
 * resulting /companions/[id] URL). Assumes the caller is already logged in. */
export async function createTestCompanion(page: Page, name: string): Promise<string> {
  await page.goto('/companions/new');
  await page.getByPlaceholder('林雅').fill(name);
  await page.getByText('溫柔', { exact: true }).click();
  await page.getByRole('button', { name: '建立伴侶' }).click();
  // Not /\/companions\/[^/]+$/ - that also matches the /companions/new form
  // page itself before the redirect resolves ("new" satisfies [^/]+ too).
  await expect(page.getByRole('heading', { name })).toBeVisible();
  const url = page.url();
  return url.split('/companions/')[1];
}
