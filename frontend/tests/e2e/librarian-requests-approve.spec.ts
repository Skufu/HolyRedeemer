import { test, expect } from './fixtures/auth.fixture';
import { gapCheck } from './utils/gap-check';

test.describe('Librarian request approvals', () => {
  test('can approve a pending request and jump to checkout for that student', async ({ page, loginAsLibrarian }) => {
    await loginAsLibrarian();

    await gapCheck('daily operations page loads', async () => {
      await page.goto('/librarian/daily-operations');
      await expect(page.getByRole('heading', { name: 'Daily Operations' })).toBeVisible();
    });

    await gapCheck('pending requests tab shows seeded request', async () => {
      await page.getByRole('tab', { name: /Requests/i }).click();
      await expect(page.getByRole('heading', { name: 'Pending Requests' })).toBeVisible();

      // Seed contains a pending reservation for "Noli Me Tangere"
      const requestCard = page
        .getByTestId('request-card')
        .filter({ hasText: 'Noli Me Tangere' })
        .first();

      await expect(requestCard).toBeVisible();

      // Card has 3 actions: reject, go-to-checkout, approve
      const rejectButton = requestCard.getByRole('button', { name: 'Reject request' });
      const checkoutButton = requestCard.getByRole('button', { name: 'Go to Checkout' });
      const approveButton = requestCard.getByRole('button', { name: 'Approve request' });

      await expect(rejectButton).toBeVisible();
      await expect(checkoutButton).toBeVisible();
      await expect(approveButton).toBeVisible();
      await approveButton.click();

      await expect(page.getByText('Reservation Approved', { exact: true }).first()).toBeVisible();
    });

    await gapCheck('toast action navigates to checkout', async () => {
      // Use toast action to navigate to circulation with student_id param.
      await page.getByTestId('toast-go-to-checkout').click();

      await expect(page).toHaveURL(/\/librarian\/circulation\?student_id=/);
      await expect(page.getByRole('heading', { name: 'Circulation Station' })).toBeVisible();
    });
  });
});

