// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright configuration for Kanye Ranker E2E tests.
 * Serves the static site via http-server and tests against it.
 */
module.exports = defineConfig({
  testDir: './tests/e2e',

  // Maximum time a single test can run
  timeout: 60_000,

  // Assertion timeout
  expect: {
    timeout: 10_000,
  },

  // Run tests sequentially in CI, parallel locally
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry failed tests once in CI
  retries: process.env.CI ? 1 : 0,

  // Reporter
  reporter: process.env.CI ? 'dot' : 'list',

  // Shared settings for all projects
  use: {
    // Base URL for all tests
    baseURL: 'http://localhost:8080',

    // Collect trace on first retry
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 13'],
      },
    },
  ],

  // Start the static file server before tests
  webServer: {
    command: 'npx http-server . -p 8080 -c-1 --silent',
    port: 8080,
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },
});
