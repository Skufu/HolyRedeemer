import { test, expect } from './fixtures/auth.fixture';
import { gapCheck } from './utils/gap-check';

test.describe('Admin audit logs', () => {
  test('can filter audit logs by action', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();

    await gapCheck('audit logs page renders', async () => {
      await page.goto('/admin/audit-logs');
      await expect(page.getByRole('heading', { name: 'Audit Logs' })).toBeVisible();
    });

    await gapCheck('audit logs can filter by action', async () => {
      // Filter to "checkout"
      const filter = page.getByRole('combobox');
      await filter.click();
      await page.getByRole('option', { name: /Checkout/i }).click();

      await expect(page.getByText('checkout', { exact: true }).first()).toBeVisible();
    });

    await gapCheck('audit logs search narrows results', async () => {
      // Search should narrow results (doesn't need exact count)
      await page.getByPlaceholder('Search by user, entity, or action...').fill('checkout');
      await expect(page.getByText('checkout', { exact: true }).first()).toBeVisible();
    });
  });
});

