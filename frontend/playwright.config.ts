import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load E2E-specific env vars (optional)
dotenv.config({ path: path.resolve(__dirname, '.env.e2e') });

const E2E_FRONTEND_PORT = Number(process.env.E2E_FRONTEND_PORT || 14127);
const E2E_BACKEND_PORT = Number(process.env.E2E_BACKEND_PORT || 18080);
const E2E_BASE_URL = process.env.BASE_URL || `http://localhost:${E2E_FRONTEND_PORT}`;
const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5433/library_dev?sslmode=disable';

export default defineConfig({
  testDir: './tests/e2e',
  // This suite shares a single seeded DB; keep it deterministic.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: Number(process.env.E2E_WORKERS || (process.env.CI ? 1 : 1)),
  reporter: 'html',
  // Avoid Windows file locking issues by writing to a unique run directory.
  outputDir: path.join(__dirname, 'test-results', String(process.pid)),
  timeout: 90_000,
  expect: {
    timeout: 15_000,
  },
  globalSetup: './tests/e2e/global-setup.ts',
  use: {
    baseURL: E2E_BASE_URL,
    viewport: { width: 1440, height: 900 },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      // Backend (loads backend/.env via godotenv in main.go)
      command: 'go run ./cmd/server',
      cwd: path.resolve(__dirname, '../backend'),
      url: `http://localhost:${E2E_BACKEND_PORT}/health`,
      timeout: 120_000,
      reuseExistingServer: process.env.E2E_REUSE_SERVERS === 'true',
      env: {
        ...process.env,
        PORT: String(E2E_BACKEND_PORT),
        DATABASE_URL: E2E_DATABASE_URL,
        // Allow CORS from the E2E frontend origin
        CORS_ORIGINS: process.env.CORS_ORIGINS || E2E_BASE_URL,
      },
    },
    {
      // Frontend
      command: `npm run dev -- --port ${E2E_FRONTEND_PORT} --strictPort`,
      cwd: __dirname,
      url: `${E2E_BASE_URL}/login`,
      timeout: 120_000,
      reuseExistingServer: process.env.E2E_REUSE_SERVERS === 'true',
      env: {
        ...process.env,
        VITE_API_URL: process.env.VITE_API_URL || `http://localhost:${E2E_BACKEND_PORT}`,
      },
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Keep other browsers opt-in; the app is primarily Chromium-tested.
    ...(process.env.E2E_ALL_BROWSERS
      ? ([
          { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
          { name: 'webkit', use: { ...devices['Desktop Safari'] } },
        ] as const)
      : []),
  ],
});
