import { test, expect } from './fixtures/auth.fixture';
import { gapCheck } from './utils/gap-check';

test.describe('Admin user management', () => {
  test('admin can create and deactivate a student', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();

    await gapCheck('user management page loads', async () => {
      await page.goto('/admin/users');
      await expect(page.getByRole('heading', { name: /User Management/i })).toBeVisible();
    });

    const suffix = Date.now();
    const username = `e2e_student_${suffix}`;
    const fullName = `E2E Student ${suffix}`;
    const studentId = `2099-${String(suffix).slice(-4)}`;

    await gapCheck('add student dialog opens', async () => {
      await page.getByRole('button', { name: 'Add Student' }).click();
      await expect(page.getByText('Fill in the details to add a new student.')).toBeVisible();
    });

    await gapCheck('student form accepts input', async () => {
      await page.getByLabel('Username *').fill(username);
      await page.getByLabel('Password *').fill('student123');
      await page.getByLabel('Full Name *').fill(fullName);
      await page.getByLabel('Student ID *').fill(studentId);
      await page.getByLabel('Grade Level *').fill('10');
      await page.getByLabel('Section').fill('E2E');
    });

    await gapCheck('student create submission succeeds', async () => {
      const dialog = page.getByRole('dialog');
      const createBtn = dialog.getByRole('button', { name: 'Create' });
      await createBtn.evaluate((el: HTMLElement) => el.click());
    });

    await gapCheck('new student appears in table', async () => {
      // Find the newly created student in the table
      await page.getByPlaceholder('Search by name or ID...').fill(fullName);
      const row = page.locator('tr', { hasText: fullName });
      await expect(row).toBeVisible();
      await expect(row).toContainText(fullName);

      // Deactivate via trash icon button (2nd action button in the row).
      const actions = row.getByRole('button');
      await expect(actions).toHaveCount(2);
      await actions.nth(1).click();

      // Status should flip to inactive after mutation/refetch
      await expect(row).toContainText('inactive');
    });
  });
});

