import { test, expect } from '@playwright/test';

test.describe('Basic Setup Verification', () => {
  test('should be able to visit localhost', async ({ page }) => {
    await page.goto('/');

    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('should have no JavaScript errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('/');

    expect(errors).toHaveLength(0);
  });
});
