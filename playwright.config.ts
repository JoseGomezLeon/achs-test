import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['allure-playwright']],
  use: {
    baseURL: 'http://localhost:3333',
    trace: 'on-first-retry',
    launchOptions: {
      executablePath: '/usr/bin/google-chrome',
    },
  },
  webServer: {
    command: 'npx tsx bin/server.ts',
    url: 'http://localhost:3333',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
