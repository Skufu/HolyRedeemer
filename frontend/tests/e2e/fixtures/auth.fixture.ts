import { test as base, expect, type Page } from '@playwright/test';
import { testUsers, dashboardPaths } from '../utils/test-data';
import { gapCheck } from '../utils/gap-check';

export interface TestUser {
  username: string;
  password: string;
  role: 'admin' | 'librarian' | 'student';
}

type MyFixtures = {
  login: (user: TestUser) => Promise<void>;
  loginAsAdmin: () => Promise<void>;
  loginAsLibrarian: () => Promise<void>;
  loginAsStudent: () => Promise<void>;
};

export const test = base.extend<MyFixtures>({
  login: async ({ page }, fixtureUse) => {
    const doLogin = async (user: TestUser) => {
      await gapCheck(`log in as ${user.role}`, async () => {
        await resetAuth(page);

        await page.getByLabel('Username').fill(user.username);
        await page.getByLabel('Password').fill(user.password);
        await page.getByRole('button', { name: 'Sign In' }).click();

        const expected = dashboardPaths[user.role];
        // Wait for either a successful role dashboard navigation, or an explicit login error.
        await Promise.race([
          page.waitForURL(expected, { timeout: 45_000 }),
          page
            .getByText('Login Failed')
            .waitFor({ timeout: 45_000 })
            .then(() => {
              throw new Error('Login failed (UI showed "Login Failed")');
            }),
        ]);
        await expect(page).toHaveURL(expected);
      });
    };

    await fixtureUse(doLogin);
  },
  loginAsAdmin: async ({ login }, fixtureUse) => {
    await fixtureUse(async () => login(testUsers.admin));
  },
  loginAsLibrarian: async ({ login }, fixtureUse) => {
    await fixtureUse(async () => login(testUsers.librarian));
  },
  loginAsStudent: async ({ login }, fixtureUse) => {
    await fixtureUse(async () => login(testUsers.student));
  },
});

async function resetAuth(page: Page) {
  // Ensure a clean auth state before each login.
  await page.context().clearCookies();
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
}

export { expect };
