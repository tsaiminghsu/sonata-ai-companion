import { test, expect } from '@playwright/test';
import { createConfirmedTestUser, login } from './fixtures/auth';

test('daily check-in grants +20 diamonds once, then disables', async ({ page }) => {
  const user = await createConfirmedTestUser();
  await login(page, user);

  await page.goto('/checkin');
  const before = await page.getByTestId('diamond-balance').innerText();
  const beforeAmount = Number(before.replace(/\D/g, ''));
  expect(beforeAmount).toBe(100); // signup grant

  const button = page.getByTestId('check-in-button');
  await expect(button).toBeEnabled();
  await button.click();
  await expect(button).toBeDisabled();
  await expect(page.getByTestId('diamond-balance')).toContainText('120');

  // reload: already checked in today, button stays disabled, no double grant
  await page.reload();
  await expect(page.getByTestId('check-in-button')).toBeDisabled();
  await expect(page.getByTestId('diamond-balance')).toContainText('120');
});
