import { test, expect } from './fixtures/auth.fixture';
import { gapCheck } from './utils/gap-check';

test.describe('Fine payments', () => {
  test('librarian can record a fine payment', async ({ page, loginAsLibrarian }) => {
    await loginAsLibrarian();

    await gapCheck('student lookup page loads', async () => {
      await page.goto('/librarian/student-lookup');
      await expect(page.getByRole('heading', { name: 'Student Lookup' })).toBeVisible();
    });

    await gapCheck('student can be selected from lookup', async () => {
      // Seeded: Juan Dela Cruz has a pending fine (lost book replacement)
      await page.getByPlaceholder('Search by name, student ID, or email...').fill('Juan Dela Cruz');
      await page.getByText('Juan Dela Cruz').first().click();
    });

    await gapCheck('fine payment flow completes', async () => {
      // Navigate to fines tab
      await page.getByRole('tab', { name: /Fines/i }).click();
      await expect(page.getByRole('button', { name: 'Pay' }).first()).toBeVisible();

      // Confirm dialog is a native window.confirm()
      page.once('dialog', (d) => d.accept());
      await page.getByRole('button', { name: 'Pay' }).first().click();

      // Status should eventually reflect payment
      await expect(page.getByText(/paid/i).first()).toBeVisible();
    });
  });
});

