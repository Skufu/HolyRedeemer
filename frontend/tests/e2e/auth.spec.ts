import { test, expect } from './fixtures/auth.fixture';
import { testUsers, dashboardPaths } from './utils/test-data';
import { gapCheck } from './utils/gap-check';

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await gapCheck('login page renders expected inputs', async () => {
      await page.goto('/login');

      await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
      await expect(page.getByLabel('Username')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    });
  });

  test('should login as admin', async ({ page }) => {
    await gapCheck('admin login redirects to dashboard', async () => {
      await page.goto('/login');

      await page.getByLabel('Username').fill(testUsers.admin.username);
      await page.getByLabel('Password').fill(testUsers.admin.password);
      await page.getByRole('button', { name: 'Sign In' }).click();

      await page.waitForURL(dashboardPaths.admin);
      await expect(page).toHaveURL(dashboardPaths.admin);
    });
  });

  test('should login as librarian', async ({ page }) => {
    await gapCheck('librarian login redirects to dashboard', async () => {
      await page.goto('/login');

      await page.getByLabel('Username').fill(testUsers.librarian.username);
      await page.getByLabel('Password').fill(testUsers.librarian.password);
      await page.getByRole('button', { name: 'Sign In' }).click();

      await page.waitForURL(dashboardPaths.librarian);
      await expect(page).toHaveURL(dashboardPaths.librarian);
    });
  });

  test('should login as student', async ({ page }) => {
    await gapCheck('student login redirects to dashboard', async () => {
      await page.goto('/login');

      await page.getByLabel('Username').fill(testUsers.student.username);
      await page.getByLabel('Password').fill(testUsers.student.password);
      await page.getByRole('button', { name: 'Sign In' }).click();

      await page.waitForURL(dashboardPaths.student);
      await expect(page).toHaveURL(dashboardPaths.student);
    });
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await gapCheck('invalid login shows error messaging', async () => {
      await page.goto('/login');

      await page.getByLabel('Username').fill('invaliduser');
      await page.getByLabel('Password').fill('invalidpassword');
      await page.getByRole('button', { name: 'Sign In' }).click();

      await expect(page.getByText('Login Failed', { exact: true })).toBeVisible();
      await expect(page.getByText('Invalid credentials', { exact: true })).toBeVisible();
    });
  });

  test('should redirect to dashboard after successful login', async ({ page }) => {
    await gapCheck('login lands on admin dashboard shell', async () => {
      await page.goto('/login');

      await page.getByLabel('Username').fill(testUsers.admin.username);
      await page.getByLabel('Password').fill(testUsers.admin.password);
      await page.getByRole('button', { name: 'Sign In' }).click();

      await page.waitForURL(dashboardPaths.admin);
      await expect(page).toHaveURL(dashboardPaths.admin);

      // Verify layout loaded (avoid strict heading matches)
      await expect(page.getByRole('link', { name: 'Dashboard' }).first()).toBeVisible();
    });
  });
});
