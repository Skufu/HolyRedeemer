import { test, expect } from './fixtures/auth.fixture';
import { gapCheck } from './utils/gap-check';

test.describe('Admin reports', () => {
  test('reports page loads and exports', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();

    await gapCheck('reports landing page loads', async () => {
      await page.goto('/admin/reports');
      await expect(page.getByRole('heading', { name: 'Reports & Analytics' })).toBeVisible();
    });

    await gapCheck('inventory report renders seeded data', async () => {
      // Inventory (default)
      await expect(page.getByRole('heading', { name: 'Inventory Report' }).first()).toBeVisible();
      await expect(page.getByText('Noli Me Tangere')).toBeVisible();
    });

    await gapCheck('overdue report renders rows', async () => {
      // Overdue
      await page.getByRole('heading', { name: 'Overdue Report' }).first().click();
      await expect(page.getByText(/days overdue/i)).toBeVisible();
    });

    await gapCheck('fines report renders currency cells', async () => {
      // Fines
      await page.getByRole('heading', { name: 'Fines Report' }).first().click();
      await expect(page.getByRole('cell', { name: /₱/ }).first()).toBeVisible();
    });

    await gapCheck('usage statistics show ranking', async () => {
      // Usage
      await page.getByRole('heading', { name: 'Usage Statistics' }).first().click();
      await expect(page.getByText('#1')).toBeVisible();
    });

    await gapCheck('report export triggers toast', async () => {
      // Export
      await page.getByRole('button', { name: 'Export PDF' }).click();
      await expect(page.getByText('Export Started')).toBeVisible();
    });
  });
});

