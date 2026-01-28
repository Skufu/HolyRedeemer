import { test, expect } from './fixtures/auth.fixture';
import { gapCheck } from './utils/gap-check';

test.describe('RBAC / Route protection', () => {
  test('student is redirected away from admin and librarian pages', async ({ page, loginAsStudent }) => {
    await loginAsStudent();

    await gapCheck('student cannot access admin routes', async () => {
      await page.goto('/admin/dashboard');
      await expect(page).toHaveURL(/\/student\/dashboard$/);
    });

    await gapCheck('student cannot access librarian routes', async () => {
      await page.goto('/librarian/dashboard');
      await expect(page).toHaveURL(/\/student\/dashboard$/);
    });
  });

  test('librarian is redirected away from admin pages', async ({ page, loginAsLibrarian }) => {
    await loginAsLibrarian();

    await gapCheck('librarian cannot access admin routes', async () => {
      await page.goto('/admin/dashboard');
      await expect(page).toHaveURL(/\/librarian\/dashboard$/);
    });
  });
});

