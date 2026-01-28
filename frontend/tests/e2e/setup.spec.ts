import { test, expect } from '@playwright/test';
import { gapCheck } from './utils/gap-check';

test.describe('Basic Setup Verification', () => {
  test('should be able to visit localhost', async ({ page }) => {
    await gapCheck('base URL is reachable', async () => {
      await page.goto('/');

      const title = await page.title();
      expect(title).toBeTruthy();
    });
  });

  test('should have no JavaScript errors', async ({ page }) => {
    await gapCheck('landing page has no JS errors', async () => {
      const errors: string[] = [];

      page.on('pageerror', (error) => {
        errors.push(error.message);
      });

      await page.goto('/');

      expect(errors).toHaveLength(0);
    });
  });
});
