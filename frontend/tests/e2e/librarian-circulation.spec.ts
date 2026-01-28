import { test, expect } from './fixtures/auth.fixture';
import { gapCheck } from './utils/gap-check';

test.describe('Circulation transactions (checkout/return)', () => {
  test('librarian can checkout then return a book via manual entry', async ({ page, loginAsLibrarian }) => {
    await loginAsLibrarian();

    await gapCheck('circulation station loads', async () => {
      await page.goto('/librarian/circulation');
      await expect(page.getByRole('heading', { name: 'Circulation Station' })).toBeVisible();
    });

    await gapCheck('student selection by manual ID works', async () => {
      // Select a student by manual student ID (seeded)
      await page.getByPlaceholder('Manual Student ID (e.g. 2023-0001)').fill('2024-0007');
      await page.getByRole('button', { name: 'Submit' }).first().click();
      // Manual submit only populates search; pick from results.
      await page.locator('button', { hasText: 'Daniel Castro' }).first().click();
      await expect(page.getByText('Daniel Castro').first()).toBeVisible();
      await expect(page.getByText('- St. Therese').first()).toBeVisible();
    });

    await gapCheck('checkout flow accepts a scanned copy', async () => {
      // Scan an available copy via manual QR (seeded available copy)
      await page.getByPlaceholder('Manual QR entry (e.g. HR-B001-C1)').fill('HR-00000001-C1');
      await page.getByRole('button', { name: 'Submit' }).nth(1).click();

      // Scanned list should update
      await expect(page.getByText(/Scanned Books \(1\)/i)).toBeVisible();

      // Complete checkout (success clears selected student + scanned list)
      await page.getByRole('button', { name: 'Complete Checkout' }).click();
    });

    await gapCheck('return flow processes the scanned copy', async () => {
      // Return the same book
      await page.getByRole('tab', { name: /^(In|Return)$/i }).click();
      await page.getByPlaceholder('Manual QR entry (e.g. HR-B001-C1)').fill('HR-00000001-C1');
      await page.getByRole('button', { name: 'Submit' }).click();

      const processReturnButton = page.getByRole('button', { name: 'Process Return' });
      await expect(processReturnButton).toBeEnabled();
      await processReturnButton.click();
      await expect(page.getByText('Scan book QR codes to process returns')).toBeVisible();
    });
  });
});

