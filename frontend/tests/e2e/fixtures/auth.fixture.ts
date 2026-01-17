import { test as base } from '@playwright/test';

export interface TestUser {
  username: string;
  password: string;
  role: 'admin' | 'librarian' | 'student';
}

type MyFixtures = {
  authenticatedPage: (user: TestUser) => Promise<void>;
};

export const test = base.extend<MyFixtures>({
  authenticatedPage: async ({ page }, fixtureUse) => {
    const login = async (user: TestUser) => {
      await page.goto('/login');

      await page.getByLabel('Username').fill(user.username);
      await page.getByLabel('Password').fill(user.password);
      await page.getByRole('button', { name: 'Sign In' }).click();

      await page.waitForURL(`/${user.role}/dashboard`);
    };

    await fixtureUse(login);
  },
});

export { expect } from '@playwright/test';
