import { defineConfig, devices } from '@playwright/test';

const executablePath =
  process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

export default defineConfig({
  testDir: 'e2e',
  timeout: 20 * 60 * 1000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  outputDir: 'test-results/e2e',
  use: {
    baseURL: process.env.PW_BASE_URL ?? 'http://localhost:5199',
    launchOptions: { executablePath },
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'phone',
      use: { ...devices['iPhone 13'], browserName: 'chromium', defaultBrowserType: 'chromium' },
    },
    {
      name: 'small-android',
      use: {
        viewport: { width: 360, height: 640 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        browserName: 'chromium',
      },
    },
    {
      // A desktop browser with a mouse, 1366×768.
      name: 'desktop',
      use: {
        viewport: { width: 1366, height: 768 },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        browserName: 'chromium',
      },
    },
  ],
  ...(process.env.PW_BASE_URL
    ? {}
    : {
        webServer: {
          command: 'pnpm exec vite --port 5199 --strictPort',
          url: 'http://localhost:5199',
          reuseExistingServer: true,
          timeout: 60_000,
        },
      }),
});
