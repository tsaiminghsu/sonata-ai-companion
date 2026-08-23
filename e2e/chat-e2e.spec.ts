import { test, expect } from '@playwright/test';
import { createConfirmedTestUser, login } from './fixtures/auth';
import { createTestCompanion } from './fixtures/companion';

test('P0: register->create companion->chat->AI reply->reload persists', async ({ page }) => {
  const user = await createConfirmedTestUser();
  await login(page, user);

  const companionId = await createTestCompanion(page, '聊天測試');
  await page.getByTestId('start-chat').click();
  await expect(page).toHaveURL(`/chat/${companionId}`);

  await page.getByTestId('chat-input').fill('你好');
  await page.getByTestId('chat-send').click();

  await expect(page.getByTestId('chat-loading')).toBeVisible();
  const messages = page.getByTestId('chat-message');
  await expect(messages).toHaveCount(2, { timeout: 15_000 });
  await expect(messages.first()).toHaveAttribute('data-role', 'user');
  await expect(messages.nth(1)).toHaveAttribute('data-role', 'assistant');

  await page.reload();
  await expect(page.getByTestId('chat-message')).toHaveCount(2);
});

test('relationship XP increases after sending a message', async ({ page }) => {
  const user = await createConfirmedTestUser();
  await login(page, user);

  const companionId = await createTestCompanion(page, 'XP測試');
  await expect(page.getByText('親密度 Lv.1')).toBeVisible();

  await page.goto(`/chat/${companionId}`);
  await page.getByTestId('chat-input').fill('嗨');
  await page.getByTestId('chat-send').click();
  await expect(page.getByTestId('chat-message')).toHaveCount(2, { timeout: 15_000 });

  await page.goto(`/companions/${companionId}`);
  await expect(page.getByText('5/100 XP')).toBeVisible();
});
