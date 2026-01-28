import { test, expect } from './fixtures/auth.fixture';
import { gapCheck } from './utils/gap-check';

test.describe('Student catalog reservations', () => {
  test('student can reserve a book from catalog and see it in reservations', async ({ page, loginAsStudent }) => {
    await loginAsStudent();

    await gapCheck('catalog page loads', async () => {
      await page.goto('/student/catalog');
      await expect(page.getByRole('heading', { name: 'Book Catalog' })).toBeVisible();
    });

    await gapCheck('catalog search returns a known book', async () => {
      await page.getByPlaceholder('Search by title, author, or ISBN...').fill('1984');

      // Open the book details dialog.
      await page.getByText('1984').first().click();
      await expect(page.getByText('Availability:')).toBeVisible();
    });

    await gapCheck('reservation flow completes and shows details', async () => {
      const note = `E2E reservation note ${Date.now()}`;
      await page
        .getByPlaceholder('Add a note for the librarian (e.g., needed for research project)')
        .fill(note);

      await page.getByRole('button', { name: 'Reserve Book' }).click();

      await expect(page).toHaveURL(/\/student\/account\?tab=reservations$/);
      await expect(page.getByText('Reservations')).toBeVisible();

      // Verify reservation row contains the book and our note.
      await expect(page.getByText('1984')).toBeVisible();
      await expect(page.getByText(note)).toBeVisible();
    });
  });
});

