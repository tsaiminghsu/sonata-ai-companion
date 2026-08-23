import { test, expect } from '@playwright/test';
import { createConfirmedTestUser, login } from './fixtures/auth';
import { createTestCompanion } from './fixtures/companion';

test('sending a gift deducts diamonds, shows narration + reaction, and bumps XP', async ({ page }) => {
  const user = await createConfirmedTestUser();
  await login(page, user);

  const companionId = await createTestCompanion(page, '禮物測試');
  await page.getByTestId('start-chat').click();
  await expect(page).toHaveURL(`/chat/${companionId}`);

  const balanceBefore = await page.getByTestId('diamond-balance').innerText();
  expect(Number(balanceBefore.replace(/\D/g, ''))).toBe(100);

  await page.getByTestId('gift-button').click();
  const giftItems = page.getByTestId('gift-item');
  await expect(giftItems).toHaveCount(6);
  await giftItems.first().click(); // 玫瑰, 10 diamonds

  await expect(page.getByText('你送出了')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('diamond-balance')).toContainText('90');

  await page.goto(`/companions/${companionId}`);
  await expect(page.getByText('20/100 XP')).toBeVisible();
});

test('a self-set spend limit blocks an over-limit gift without charging diamonds', async ({ page }) => {
  const user = await createConfirmedTestUser();
  await login(page, user);

  await page.goto('/diamond-shop');
  await page.locator('input[type=number]').fill('5');
  await page.getByRole('button', { name: '儲存' }).click();
  await expect(page.getByRole('button', { name: '已儲存' })).toBeVisible();

  const companionId = await createTestCompanion(page, '上限測試');
  await page.goto(`/chat/${companionId}`);
  await page.getByTestId('gift-button').click();
  await page.getByTestId('gift-item').first().click(); // 玫瑰 costs 10 > limit 5

  await expect(page.getByText('已達到你自己設定的每日消費上限')).toBeVisible();
  await expect(page.getByTestId('diamond-balance')).toContainText('100');
});
