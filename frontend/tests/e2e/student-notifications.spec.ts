import { test, expect } from './fixtures/auth.fixture';
import { gapCheck } from './utils/gap-check';

test.describe('Student notifications', () => {
  test('can mark all notifications as read', async ({ page, loginAsStudent }) => {
    await loginAsStudent();

    await gapCheck('notifications page loads', async () => {
      await page.goto('/student/notifications');
      await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
    });

    await gapCheck('mark all read clears unread list', async () => {
      // Seed has unread notifications for student001.
      const markAll = page.getByRole('button', { name: 'Mark all as read' });
      await expect(markAll).toBeVisible();
      await markAll.click();

      // Button should disappear when unreadCount reaches 0.
      await expect(markAll).toBeHidden();

      // Unread tab should show the empty state.
      await page.getByRole('tab', { name: /Unread/i }).click();
      await expect(page.getByText('All caught up! No unread notifications.')).toBeVisible();
    });
  });
});

