import { test, expect } from './fixtures/auth.fixture';
import { gapCheck } from './utils/gap-check';

/**
 * End-to-end test for the full reservation → checkout flow.
 *
 * Flow:
 *  1. Student (student002) finds an available book ("1984") and reserves it.
 *  2. Librarian approves the reservation.
 *  3. Librarian navigates to Circulation, selects student, and checks out the reserved copy.
 *  4. Student logs back in and sees "Checked Out" status.
 */
test.describe('Full Reservation to Checkout Flow', () => {

  test('student reserves, librarian approves and checks out, student sees fulfilled', async ({
    page,
    loginAsLibrarian,
    loginAsStudent,
  }) => {

    const note = `Need this for English assignment ${Date.now()}`;

    // ── Step 1: Student reserves the book ──────────────────────────────
    await loginAsStudent(); // Uses testUsers.student (student001), wait let me just use student001

    await gapCheck('navigate to catalog and find book', async () => {
      await page.goto('/student/catalog');
      await expect(page.getByRole('heading', { name: 'Book Catalog' })).toBeVisible();

      await page.getByPlaceholder('Search by title, author, or ISBN...').fill('1984');
      await page.getByText('1984').first().click();
      await expect(page.getByText('Availability:')).toBeVisible();
    });

    await gapCheck('reserve the book', async () => {
      await page.getByPlaceholder('Add a note').fill(note);
      await page.getByRole('button', { name: 'Reserve Book' }).click();

      await expect(page).toHaveURL(/\/student\/account\?tab=reservations$/);
      const bookRow = page.locator('div').filter({ hasText: '1984' }).filter({ hasText: note }).first();
      await expect(bookRow).toBeVisible();
      // Should instantly show Pending
      await expect(bookRow.getByText('Pending', { exact: true })).toBeVisible();
    });

    // ── Step 2: Librarian approves the pending reservation ──────────────
    await loginAsLibrarian();

    await gapCheck('navigate to daily operations', async () => {
      await page.goto('/librarian/daily-operations');
      await expect(page.getByRole('heading', { name: 'Daily Operations' })).toBeVisible();
    });

    await gapCheck('approve the new 1984 reservation', async () => {
      await page.getByRole('tab', { name: /Requests/i }).click();

      const requestCard = page
        .getByTestId('request-card')
        .filter({ hasText: '1984' })
        .filter({ hasText: note })
        .first();

      await expect(requestCard).toBeVisible();

      // Approve the reservation
      const approveButton = requestCard.getByRole('button', { name: 'Approve request' });
      await approveButton.click();

      // Verify the new toast text
      await expect(page.getByText('Reservation Approved', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Book reserved for student pickup').first()).toBeVisible();
    });

    // ── Step 3: Librarian goes to Circulation to check out ──────────────
    await gapCheck('navigate to circulation via toast action', async () => {
      await page.getByTestId('toast-go-to-checkout').click();
      await expect(page).toHaveURL(/\/librarian\/circulation\?student_id=/);
      await expect(page.getByRole('heading', { name: 'Circulation Station' })).toBeVisible();
    });

    await gapCheck('student is auto-selected', async () => {
      await expect(page.getByText('Juan Dela Cruz').first()).toBeVisible();
    });

    // ── Step 4: Scan the reserved copy and checkout ─────────────────────
    await gapCheck('scan the reserved copy via manual QR entry', async () => {
      // Enter the QR code for "1984" Copy 1 (HR-00000004-C1)
      await page.getByPlaceholder('Manual QR entry').fill('HR-00000004-C1');
      await page.getByRole('button', { name: 'Submit' }).nth(1).click();

      // The reserved copy should be accepted and added to scanned list
      await expect(page.getByText(/Scanned Books \(1\)/i)).toBeVisible();
      await expect(page.locator('div').filter({ hasText: '1984' }).nth(1)).toBeVisible();
    });

    await gapCheck('complete checkout successfully', async () => {
      await page.getByRole('button', { name: 'Complete Checkout' }).click();

      // Success screen should appear
      await expect(page.getByText('Checkout Complete!')).toBeVisible();
    });

    // ── Step 5: Student verifies the reservation is fulfilled ───────────
    await gapCheck('student logs in and checks reservation status', async () => {
      await loginAsStudent();

      await page.goto('/student/reservations');
      await expect(page.getByRole('heading', { name: 'My Reservations' })).toBeVisible();

      // The "1984" reservation should now show "Checked Out" status
      const bookCard = page.locator('div').filter({ hasText: '1984' }).filter({ hasText: note }).first();
      await expect(bookCard).toBeVisible();
      await expect(bookCard.getByText('Checked Out')).toBeVisible();
    });
  });
});
