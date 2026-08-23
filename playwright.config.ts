import { defineConfig, devices } from '@playwright/test';

// Next.js loads .env.local automatically for the app; the Playwright test
// process is a separate Node run and needs it loaded explicitly so
// e2e/fixtures/auth.ts can see NEXT_PUBLIC_DEMO_MODE and branch accordingly.
try {
  process.loadEnvFile('.env.local');
} catch {
  // no .env.local (e.g. real-backend runs) - fine, nothing to load
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  timeout: 60_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    // `playwright test` has no --slow-mo CLI flag (that's a codegen-only
    // option), so this is the way to slow a headed run down to watchable
    // speed: PLAYWRIGHT_SLOW_MO=500 npx playwright test --headed
    launchOptions: process.env.PLAYWRIGHT_SLOW_MO
      ? { slowMo: Number(process.env.PLAYWRIGHT_SLOW_MO) }
      : undefined,
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120_000,
      },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
