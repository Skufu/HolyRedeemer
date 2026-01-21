# E2E Testing with Playwright

## Overview

This directory contains end-to-end tests using Playwright for the Holy Redeemer Library Management System.

## Prerequisites

- Node.js 18+
- Playwright browsers installed
- Backend API running on port 8080 (for auth tests)
- Frontend dev server running on port 4127

## Installation

```bash
cd frontend

# Install Playwright browsers
npx playwright install
npx playwright install-deps
```

## Running Tests

### Run all e2e tests
```bash
npm run test:e2e
```

### Run tests with UI mode (recommended for development)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Debug tests
```bash
npm run test:e2e:debug
```

### View test report
```bash
npm run test:e2e:report
```

## Test Structure

```
tests/e2e/
├── fixtures/           # Playwright fixtures (auth helpers, etc.)
├── utils/              # Test utilities and test data
├── auth.spec.ts       # Authentication tests
└── setup.spec.ts      # Basic setup verification
```

## Environment Variables

Create a `.env.e2e` file for test-specific credentials:

```env
BASE_URL=http://localhost:4127
E2E_ADMIN_USERNAME=admin
E2E_ADMIN_PASSWORD=admin123
E2E_LIBRARIAN_USERNAME=librarian
E2E_LIBRARIAN_PASSWORD=lib123
E2E_STUDENT_USERNAME=student001
E2E_STUDENT_PASSWORD=student123
```

## Writing New Tests

1. Create a new `.spec.ts` file in `tests/e2e/`
2. Import test and expect from the appropriate fixture:
   ```typescript
   import { test, expect } from '@playwright/test';
   // or for authenticated tests
   import { test, expect } from '../fixtures/auth.fixture';
   ```
3. Write tests using Playwright API:
   ```typescript
   test('should do something', async ({ page }) => {
     await page.goto('/some-page');
     await expect(page.getByText('Hello')).toBeVisible();
   });
   ```

## Best Practices

- Use locators that are resilient to changes ( getByRole, getByLabel, getByText)
- Use fixtures for common test setup (login, etc.)
- Keep tests independent and isolated
- Use meaningful test names that describe the behavior
- Run tests in UI mode during development
- Review screenshots and traces after failed tests

## CI/CD

Tests run in CI with:
- No browser display (`--headed=false`)
- Retries on failure (2 attempts)
- HTML report generation
- Video and screenshot capture on failure

## Troubleshooting

### Tests fail with connection refused
Ensure both frontend and backend are running:
```bash
# Terminal 1: Backend
cd backend
make dev

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Tests
npm run test:e2e
```

### Playwright browsers not found
```bash
npx playwright install
```

### Timeout errors
Increase timeout in `playwright.config.ts`:
```typescript
use: {
  timeout: 30000, // increase from default 30000
},
```

## More Information

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
