import { test, expect } from '@playwright/test';
import { createConfirmedTestUser, login } from './fixtures/auth';

test('create, edit, and delete a companion', async ({ page }) => {
  const user = await createConfirmedTestUser();
  await login(page, user);

  await page.goto('/companions');
  await expect(page.getByText('還沒有 AI 伴侶')).toBeVisible();

  await page.getByTestId('create-companion').first().click();
  await expect(page).toHaveURL('/companions/new');

  await page.getByPlaceholder('林雅').fill('測試伴侶');
  await page.getByText('溫柔', { exact: true }).click();
  await page.getByPlaceholder('描述這位角色的故事...').fill('這是一段測試背景故事。');
  await page.getByRole('button', { name: '建立伴侶' }).click();

  await expect(page).toHaveURL(/\/companions\/[^/]+$/);
  await expect(page.getByRole('heading', { name: '測試伴侶' })).toBeVisible();

  // edit
  await page.getByRole('button', { name: '編輯資料' }).click();
  await page.getByPlaceholder('林雅').fill('測試伴侶（已編輯）');
  await page.getByRole('button', { name: '儲存變更' }).click();
  await expect(page.getByRole('heading', { name: '測試伴侶（已編輯）' })).toBeVisible();

  // reload persists
  await page.reload();
  await expect(page.getByRole('heading', { name: '測試伴侶（已編輯）' })).toBeVisible();

  // delete
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '刪除' }).click();
  await expect(page).toHaveURL('/companions');
});
