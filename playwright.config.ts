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
    // En CI (Integración Continua) usa el servidor compilado; localmente usa tsx directo
    command: process.env.CI ? 'node build/bin/server.js' : 'npx tsx bin/server.ts',
    url: 'http://localhost:3333/health',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
