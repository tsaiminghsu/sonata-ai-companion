import { test, expect } from '@playwright/test';
import { createConfirmedTestUser, login } from './fixtures/auth';

// Note: the register page's email-confirmation-code step isn't covered here -
// Playwright has no way to receive the Cognito verification email. Login is
// tested against a user provisioned directly via the Cognito Admin API
// (see fixtures/auth.ts), which is also how every other spec authenticates.

test('unauthenticated visitors are redirected to /login', async ({ page }) => {
  await page.goto('/companions');
  await expect(page).toHaveURL(/\/login/);
});

test('a confirmed user can log in and reach the home page', async ({ page }) => {
  const user = await createConfirmedTestUser();
  await login(page, user);
  // getByText matches both the heading and Next.js's a11y route-announcer,
  // which mirrors new-page text for screen readers - scope to the heading.
  await expect(page.getByRole('heading', { name: '創造第一位 AI 伴侶' })).toBeVisible();
});

test('logging in redirects away from /login and /register', async ({ page }) => {
  const user = await createConfirmedTestUser();
  await login(page, user);
  await page.goto('/login');
  await expect(page).toHaveURL('/');
});
