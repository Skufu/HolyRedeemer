import { test, expect } from './fixtures/auth.fixture';
import { testUsers, dashboardPaths } from './utils/test-data';

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('should login as admin', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Username').fill(testUsers.admin.username);
    await page.getByLabel('Password').fill(testUsers.admin.password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForURL(dashboardPaths.admin);
    await expect(page).toHaveURL(dashboardPaths.admin);
  });

  test('should login as librarian', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Username').fill(testUsers.librarian.username);
    await page.getByLabel('Password').fill(testUsers.librarian.password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForURL(dashboardPaths.librarian);
    await expect(page).toHaveURL(dashboardPaths.librarian);
  });

  test('should login as student', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Username').fill(testUsers.student.username);
    await page.getByLabel('Password').fill(testUsers.student.password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForURL(dashboardPaths.student);
    await expect(page).toHaveURL(dashboardPaths.student);
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Username').fill('invaliduser');
    await page.getByLabel('Password').fill('invalidpassword');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('Login Failed')).toBeVisible();
    await expect(page.getByText('Invalid credentials')).toBeVisible();
  });

  test('should redirect to dashboard after successful login', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Username').fill(testUsers.admin.username);
    await page.getByLabel('Password').fill(testUsers.admin.password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForURL(dashboardPaths.admin);
    await expect(page).toHaveURL(dashboardPaths.admin);

    const dashboardElement = page.getByRole('heading');
    await expect(dashboardElement).toBeVisible();
  });
});
